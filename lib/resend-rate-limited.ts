import { resend } from "@/lib/resend";

function readPositiveNumber(envValue: string | undefined, fallback: number): number {
  if (!envValue) return fallback;
  const parsed = Number(envValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

// La limite Resend est appliquée au niveau équipe (team-wide), pas seulement par clé API.
// Par défaut on reste à 2 req/s pour éviter les 429; augmente via env si Resend relève ton quota.
const MAX_REQUESTS_PER_SECOND = readPositiveNumber(
  process.env.RESEND_MAX_REQUESTS_PER_SECOND,
  2
);
const MIN_DELAY_MS = Math.max(
  readPositiveNumber(process.env.RESEND_MIN_DELAY_MS, 0),
  Math.ceil(1000 / MAX_REQUESTS_PER_SECOND)
);

// Configuration du retry pour les erreurs 429
const MAX_RETRIES = readPositiveNumber(process.env.RESEND_MAX_RETRIES, 12);
const INITIAL_RETRY_DELAY_MS = readPositiveNumber(
  process.env.RESEND_INITIAL_RETRY_DELAY_MS,
  1000
);
const MAX_RETRY_DELAY_MS = readPositiveNumber(
  process.env.RESEND_MAX_RETRY_DELAY_MS,
  120000
);
const MAX_TOTAL_RETRY_TIME_MS = readPositiveNumber(
  process.env.RESEND_MAX_TOTAL_RETRY_TIME_MS,
  15 * 60 * 1000
);

// Queue pour gérer les requêtes
interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  sendFn: () => Promise<any>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHeaderValue(headers: unknown, key: string): string | null {
  if (!headers) return null;

  // Supporte Headers (fetch), Map-like et objets simples
  if (
    typeof headers === "object" &&
    headers !== null &&
    "get" in (headers as any) &&
    typeof (headers as any).get === "function"
  ) {
    const value =
      (headers as any).get(key) ??
      (headers as any).get(key.toLowerCase()) ??
      (headers as any).get(key.toUpperCase());
    return typeof value === "string" ? value : null;
  }

  if (typeof headers === "object" && headers !== null) {
    const source = headers as Record<string, unknown>;
    const matchKey = Object.keys(source).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    );
    const value = matchKey ? source[matchKey] : null;
    return typeof value === "string" ? value : null;
  }

  return null;
}

function parseRetryAfterToMs(rawRetryAfter: string | null): number | null {
  if (!rawRetryAfter) return null;

  // Format en secondes
  const seconds = Number.parseInt(rawRetryAfter, 10);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  // Format date HTTP
  const dateMs = Date.parse(rawRetryAfter);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? delta : 0;
  }

  return null;
}

/**
 * Vérifie si une erreur est une erreur 429 (rate limit)
 */
function isRateLimitError(error: any): boolean {
  if (!error) return false;
  
  // Vérifier le status code
  if (error.status === 429 || error.statusCode === 429) return true;
  
  // Vérifier si c'est une réponse Resend avec une erreur
  if (error.error) {
    const resendError = error.error;
    if (resendError.statusCode === 429 || resendError.status === 429) return true;
    if (resendError.code === "rate_limit_exceeded") return true;
    
    const errorMessage = (resendError.message || "").toLowerCase();
    if (errorMessage.includes("429") || 
        errorMessage.includes("rate limit") || 
        errorMessage.includes("too many requests")) {
      return true;
    }
  }
  
  // Vérifier le message d'erreur
  const errorMessage = error.message?.toLowerCase() || "";
  if (errorMessage.includes("429") || 
      errorMessage.includes("rate limit") || 
      errorMessage.includes("too many requests")) {
    return true;
  }
  
  // Vérifier dans les données de l'erreur
  if (error.data?.statusCode === 429) return true;
  
  return false;
}

/**
 * Extrait le délai Retry-After depuis l'erreur ou les headers
 */
function getRetryAfterDelay(error: any): number | null {
  if (!error) return null;
  
  // Vérifier dans l'erreur Resend
  if (error.error) {
    const resendError = error.error;
    const retryAfterHeader = getHeaderValue(resendError.headers, "retry-after");
    const parsedHeaderDelay = parseRetryAfterToMs(retryAfterHeader);
    if (parsedHeaderDelay !== null) return parsedHeaderDelay;

    if (resendError.retryAfter) {
      const parsedRetryAfter = parseRetryAfterToMs(String(resendError.retryAfter));
      if (parsedRetryAfter !== null) return parsedRetryAfter;
    }
  }
  
  // Vérifier dans les headers de la réponse
  const retryAfterHeader = getHeaderValue(error.headers, "retry-after");
  const parsedHeaderDelay = parseRetryAfterToMs(retryAfterHeader);
  if (parsedHeaderDelay !== null) return parsedHeaderDelay;
  
  // Vérifier dans les données de l'erreur
  if (error.data?.retryAfter) {
    const parsedRetryAfter = parseRetryAfterToMs(String(error.data.retryAfter));
    if (parsedRetryAfter !== null) return parsedRetryAfter;
  }
  
  return null;
}

/**
 * Calcule le délai d'attente pour le retry avec backoff exponentiel
 */
function calculateRetryDelay(attempt: number, retryAfter: number | null): number {
  // Si Retry-After est spécifié, l'utiliser
  if (retryAfter !== null) {
    return Math.min(retryAfter, MAX_RETRY_DELAY_MS);
  }
  
  // Sinon, utiliser backoff exponentiel avec jitter
  const baseDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Ajouter jusqu'à 1 seconde de jitter
  return Math.min(baseDelay + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Retry une fonction avec backoff exponentiel en cas d'erreur 429
 */
async function retryWithBackoff<T>(
  sendFn: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now();
  let attempt = 0;

  while (true) {
    try {
      const result = await sendFn();

      // Le SDK Resend peut retourner { data, error } sans throw
      if (result && typeof result === "object" && "error" in result) {
        const resendResult = result as any;
        if (resendResult.error && isRateLimitError(resendResult)) {
          throw resendResult;
        }
      }

      return result;
    } catch (error: any) {
      if (!isRateLimitError(error)) {
        throw error;
      }

      const elapsedMs = Date.now() - startedAt;
      if (attempt >= MAX_RETRIES || elapsedMs >= MAX_TOTAL_RETRY_TIME_MS) {
        console.error(
          `Erreur 429 persistante après ${attempt} tentatives (${elapsedMs}ms):`,
          error
        );
        throw new Error(
          "Resend est temporairement limité malgré plusieurs tentatives. Réessayez plus tard."
        );
      }

      const retryAfter = getRetryAfterDelay(error);
      const delay = calculateRetryDelay(attempt, retryAfter);

      console.warn(
        `Erreur 429 détectée (tentative ${attempt + 1}/${MAX_RETRIES}, ` +
          `attente ${delay}ms).`
      );

      await sleep(delay);
      attempt += 1;
    }
  }
}

class RateLimiter {
  private queue: QueuedRequest[] = [];
  private lastRequestTime: number = 0;
  private processing: boolean = false;
  private requestCount: number = 0;
  private windowStart: number = Date.now();

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      let now = Date.now();
      
      // Réinitialiser le compteur si une seconde s'est écoulée
      if (now - this.windowStart >= 1000) {
        this.requestCount = 0;
        this.windowStart = now;
      }

      // Attendre si on a atteint la limite de requêtes par seconde
      if (this.requestCount >= MAX_REQUESTS_PER_SECOND) {
        const waitTime = 1000 - (now - this.windowStart);
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          now = Date.now();
          this.requestCount = 0;
          this.windowStart = now;
        }
      }

      // Attendre le délai minimum entre les requêtes
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < MIN_DELAY_MS) {
        const waitTime = MIN_DELAY_MS - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        now = Date.now();
      }

      // Traiter la prochaine requête avec retry automatique
      const request = this.queue.shift();
      if (request) {
        try {
          // Utiliser retryWithBackoff pour gérer les erreurs 429
          const result = await retryWithBackoff(request.sendFn);
          this.lastRequestTime = Date.now();
          this.requestCount++;
          request.resolve(result);
        } catch (error) {
          // Ne pas incrémenter le compteur en cas d'erreur non-429
          // car l'erreur 429 est déjà gérée par retryWithBackoff
          if (!isRateLimitError(error)) {
            this.lastRequestTime = Date.now();
            this.requestCount++;
          }
          request.reject(error);
        }
      }
    }

    this.processing = false;
  }

  async send<T>(sendFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        resolve,
        reject,
        sendFn,
      });
      this.processQueue();
    });
  }
}

// Instance singleton du rate limiter
const rateLimiter = new RateLimiter();

/**
 * Wrapper pour resend.emails.send avec rate limiting et retry automatique
 * Respecte une limite locale conservatrice pour réduire les 429
 * Gère automatiquement les erreurs 429 avec retry et backoff exponentiel
 */
export async function sendEmailWithRateLimit<T>(
  sendFn: () => Promise<T>
): Promise<T> {
  return rateLimiter.send(sendFn);
}

/**
 * Fonction helper pour envoyer un email avec rate limiting et retry automatique
 * Gère automatiquement les erreurs 429 de Resend
 */
export async function resendSendEmail(options: Parameters<typeof resend.emails.send>[0]) {
  return sendEmailWithRateLimit(() => resend.emails.send(options));
}

