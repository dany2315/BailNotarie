import { Resend } from "resend";

/**
 * Vérifie si Resend est configuré correctement
 * @returns true si Resend est configuré, false sinon
 */
export function isResendConfigured(): boolean {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "❌ RESEND_API_KEY n'est pas configurée. Les emails ne peuvent pas être envoyés. " +
        "Veuillez définir la variable d'environnement RESEND_API_KEY pour utiliser Resend en production."
      );
    } else {
      console.warn(
        "⚠️  RESEND_API_KEY n'est pas configurée. Les emails ne peuvent pas être envoyés. " +
        "Veuillez définir RESEND_API_KEY dans votre fichier .env"
      );
    }
    return false;
  }
  return true;
}

export const resend = new Resend(process.env.RESEND_API_KEY);