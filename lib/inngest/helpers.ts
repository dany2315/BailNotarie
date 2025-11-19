import { inngest } from "./client";

/**
 * Vérifie si Inngest est configuré correctement
 * @returns true si Inngest est configuré, false sinon
 */
function isInngestConfigured(): boolean {
  if (!process.env.INNGEST_EVENT_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "❌ INNGEST_EVENT_KEY n'est pas configurée. Les emails ne seront pas envoyés. " +
        "Veuillez définir la variable d'environnement INNGEST_EVENT_KEY pour utiliser Inngest en production."
      );
    } else {
      // En développement, suggérer d'utiliser Inngest Dev Server
      console.warn(
        "⚠️  INNGEST_EVENT_KEY n'est pas configurée. Pour le développement local, vous pouvez soit:\n" +
        "  1. Démarrer Inngest Dev Server: npx inngest-cli@latest dev\n" +
        "  2. Configurer INNGEST_EVENT_KEY dans votre fichier .env"
      );
    }
    return false;
  }
  return true;
}

/**
 * Déclenche l'envoi d'un email de confirmation de contact
 */
export async function triggerContactConfirmationEmail(data: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  message: string;
}) {
  if (!isInngestConfigured()) {
    return;
  }
  
  try {
    await inngest.send({
      name: "email/contact.confirmation",
      data,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'événement Inngest (contact.confirmation):", error);
    // Ne pas propager l'erreur pour éviter de faire planter l'application
  }
}

/**
 * Déclenche l'envoi d'un email de notification d'équipe pour un contact
 */
export async function triggerContactNotificationEmail(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  dateDemande: string;
}) {
  if (!isInngestConfigured()) {
    return;
  }
  
  try {
    await inngest.send({
      name: "email/contact.notification",
      data,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'événement Inngest (contact.notification):", error);
    // Ne pas propager l'erreur pour éviter de faire planter l'application
  }
}

/**
 * Déclenche l'envoi d'un email de notification
 */
export async function triggerNotificationEmail(data: {
  to: string;
  userName: string | null;
  notificationMessage: string;
  interfaceUrl: string;
}) {
  if (!isInngestConfigured()) {
    return;
  }
  
  try {
    await inngest.send({
      name: "email/notification.send",
      data,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'événement Inngest (notification.send):", error);
    // Ne pas propager l'erreur pour éviter de faire planter l'application
  }
}

/**
 * Déclenche l'envoi d'un email de formulaire propriétaire
 */
export async function triggerOwnerFormEmail(data: {
  to: string;
  firstName?: string | null;
  lastName?: string | null;
  formUrl: string;
}) {
  if (!isInngestConfigured()) {
    return;
  }
  
  try {
    await inngest.send({
      name: "email/intake.owner-form",
      data,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'événement Inngest (intake.owner-form):", error);
    // Ne pas propager l'erreur pour éviter de faire planter l'application
  }
}

/**
 * Déclenche l'envoi d'un email de formulaire locataire
 */
export async function triggerTenantFormEmail(data: {
  to: string;
  firstName?: string | null;
  lastName?: string | null;
  formUrl: string;
}) {
  if (!isInngestConfigured()) {
    return;
  }
  
  try {
    await inngest.send({
      name: "email/intake.tenant-form",
      data,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'événement Inngest (intake.tenant-form):", error);
    // Ne pas propager l'erreur pour éviter de faire planter l'application
  }
}

/**
 * Déclenche l'envoi d'un email de conversion de lead
 */
export async function triggerLeadConversionEmail(data: {
  to: string;
  subject: string;
  convertUrl: string;
  isOwnerForm?: boolean;
  isTenantForm?: boolean;
}) {
  if (!isInngestConfigured()) {
    return;
  }
  
  try {
    await inngest.send({
      name: "email/lead.conversion",
      data,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'événement Inngest (lead.conversion):", error);
    // Ne pas propager l'erreur pour éviter de faire planter l'application
  }
}

