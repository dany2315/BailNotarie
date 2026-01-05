import { resend } from "@/lib/resend";

// Rate limit: 2 requêtes par seconde = 500ms minimum entre chaque requête
const MIN_DELAY_MS = 500;
const MAX_REQUESTS_PER_SECOND = 2;

// Queue pour gérer les requêtes
interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  sendFn: () => Promise<any>;
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

      // Traiter la prochaine requête
      const request = this.queue.shift();
      if (request) {
        try {
          const result = await request.sendFn();
          this.lastRequestTime = Date.now();
          this.requestCount++;
          request.resolve(result);
        } catch (error) {
          this.lastRequestTime = Date.now();
          this.requestCount++;
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
 * Wrapper pour resend.emails.send avec rate limiting
 * Respecte la limite de 2 requêtes par seconde de Resend
 */
export async function sendEmailWithRateLimit<T>(
  sendFn: () => Promise<T>
): Promise<T> {
  return rateLimiter.send(sendFn);
}

/**
 * Fonction helper pour envoyer un email avec rate limiting
 */
export async function resendSendEmail(options: Parameters<typeof resend.emails.send>[0]) {
  return sendEmailWithRateLimit(() => resend.emails.send(options));
}

