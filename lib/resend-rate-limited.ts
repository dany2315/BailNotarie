import { resend } from "@/lib/resend";

// Rate limit: 3 requêtes par seconde pour être conservateur (Resend Free: 3/sec, Pro: 10/sec)
const MIN_DELAY_MS = 350; // ~3 requêtes par seconde
const MAX_REQUESTS_PER_SECOND = 3;

// Configuration du retry pour les erreurs 429
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 seconde
const MAX_RETRY_DELAY_MS = 30000; // 30 secondes maximum

// Queue pour gérer les requêtes
interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  sendFn: () => Promise<any>;
}

/**
 * Vérifie si une erreur est une erreur 429 (rate limit)
 */
function isRateLimitError(error: any): boolean {
  if (!error) return false;
  
  // Vérifier le status code
  if (error.status === 429) return true;
  
  // Vérifier si c'est une réponse Resend avec une erreur
  if (error.error) {
    const resendError = error.error;
    if (resendError.statusCode === 429 || resendError.status === 429) return true;
    
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
    if (resendError.headers?.["retry-after"]) {
      const retryAfter = parseInt(resendError.headers["retry-after"], 10);
      if (!isNaN(retryAfter)) {
        return retryAfter * 1000; // Convertir en millisecondes
      }
    }
    if (resendError.retryAfter) {
      const retryAfter = parseInt(resendError.retryAfter, 10);
      if (!isNaN(retryAfter)) {
        return retryAfter * 1000;
      }
    }
  }
  
  // Vérifier dans les headers de la réponse
  if (error.headers?.["retry-after"]) {
    const retryAfter = parseInt(error.headers["retry-after"], 10);
    if (!isNaN(retryAfter)) {
      return retryAfter * 1000; // Convertir en millisecondes
    }
  }
  
  // Vérifier dans les données de l'erreur
  if (error.data?.retryAfter) {
    const retryAfter = parseInt(error.data.retryAfter, 10);
    if (!isNaN(retryAfter)) {
      return retryAfter * 1000;
    }
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
  sendFn: () => Promise<T>,
  attempt: number = 0
): Promise<T> {
  try {
    const result = await sendFn();
    
    // Vérifier si Resend a retourné une réponse avec une erreur
    if (result && typeof result === 'object' && 'error' in result) {
      const resendResult = result as any;
      if (resendResult.error && isRateLimitError(resendResult)) {
        // Traiter comme une erreur 429
        throw resendResult;
      }
    }
    
    return result;
  } catch (error: any) {
    // Si ce n'est pas une erreur 429, propager l'erreur
    if (!isRateLimitError(error)) {
      throw error;
    }
    
    // Si on a atteint le nombre maximum de tentatives, propager l'erreur
    if (attempt >= MAX_RETRIES) {
      console.error(`Erreur 429 persistante après ${MAX_RETRIES} tentatives:`, error);
      throw new Error(
        `Rate limit atteint après ${MAX_RETRIES} tentatives. Veuillez réessayer plus tard.`
      );
    }
    
    // Calculer le délai d'attente
    const retryAfter = getRetryAfterDelay(error);
    const delay = calculateRetryDelay(attempt, retryAfter);
    
    console.warn(
      `Erreur 429 détectée (tentative ${attempt + 1}/${MAX_RETRIES}). ` +
      `Nouvelle tentative dans ${delay}ms...`
    );
    
    // Attendre avant de réessayer
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Réessayer
    return retryWithBackoff(sendFn, attempt + 1);
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
 * Respecte la limite de 3 requêtes par seconde de Resend
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

