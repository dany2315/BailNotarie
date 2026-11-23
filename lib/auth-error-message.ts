/**
 * Messages en français des refus de la brique de connexion (better-auth), pour tous les écrans de connexion
 * (m15). Le message brut de la brique, en anglais, n'est jamais affiché : un code inconnu donne `fallback`.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_OTP: "Le code est incorrect. Vérifiez-le et réessayez.",
  // La brique renvoie OTP_EXPIRED ; EXPIRED_OTP est gardé pour les anciennes versions.
  OTP_EXPIRED: "Le code a expiré. Demandez-en un nouveau.",
  EXPIRED_OTP: "Le code a expiré. Demandez-en un nouveau.",
  TOO_MANY_ATTEMPTS: "Trop de tentatives. Demandez un nouveau code.",
  USER_NOT_FOUND: "Aucun compte ne correspond à cette adresse e-mail.",
  INVALID_EMAIL: "Adresse e-mail invalide.",
  INVALID_EMAIL_OR_PASSWORD: "Adresse e-mail ou mot de passe incorrect.",
  INVALID_PASSWORD: "Adresse e-mail ou mot de passe incorrect.",
  EMAIL_NOT_VERIFIED: "Votre adresse e-mail n'est pas encore vérifiée.",
  TOO_MANY_REQUESTS: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
};

export function authErrorMessage(error: { code?: string; status?: number } | null | undefined, fallback: string): string {
  if (error?.code && AUTH_ERROR_MESSAGES[error.code]) return AUTH_ERROR_MESSAGES[error.code];
  if (error?.status === 429) return AUTH_ERROR_MESSAGES.TOO_MANY_REQUESTS;
  return fallback;
}
