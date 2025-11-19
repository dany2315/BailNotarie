import { inngest } from "./client";

/**
 * Vérifie si Inngest est configuré correctement
 * 
 * En développement local:
 * - Si INNGEST_EVENT_KEY n'est pas définie, on assume qu'Inngest Dev Server est utilisé
 * - Inngest Dev Server fonctionne sans clé API
 * 
 * En production:
 * - INNGEST_EVENT_KEY est requise
 * 
 * @returns true si Inngest peut être utilisé, false sinon
 */
function isInngestConfigured(): boolean {
  // En production, INNGEST_EVENT_KEY est requise
  if (process.env.NODE_ENV === "production" && !process.env.INNGEST_EVENT_KEY) {
    console.error(
      "❌ INNGEST_EVENT_KEY n'est pas configurée. Les emails ne seront pas envoyés. " +
      "Veuillez définir la variable d'environnement INNGEST_EVENT_KEY pour utiliser Inngest en production."
    );
    return false;
  }
  
  // En développement, on peut utiliser Inngest Dev Server sans clé
  if (process.env.NODE_ENV !== "production" && !process.env.INNGEST_EVENT_KEY) {
    console.warn(
      "⚠️  INNGEST_EVENT_KEY n'est pas configurée. " +
      "Assurez-vous que Inngest Dev Server est en cours d'exécution: npx inngest-cli@latest dev"
    );
    // On retourne true quand même car Inngest Dev Server peut fonctionner sans clé
    // L'erreur sera visible si le serveur n'est pas démarré
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
    console.warn("⚠️  Envoi d'email annulé: Inngest n'est pas configuré (contact.confirmation)");
    return;
  }
  
  try {
    console.log("📧 Déclenchement de l'email de confirmation de contact pour:", data.email);
    await inngest.send({
      name: "email/contact.confirmation",
      data,
    });
    console.log("✅ Événement Inngest envoyé avec succès (contact.confirmation)");
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'événement Inngest (contact.confirmation):", error);
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
    console.warn("⚠️  Envoi d'email annulé: Inngest n'est pas configuré (contact.notification)");
    return;
  }
  
  try {
    console.log("📧 Déclenchement de l'email de notification d'équipe pour:", data.email);
    await inngest.send({
      name: "email/contact.notification",
      data,
    });
    console.log("✅ Événement Inngest envoyé avec succès (contact.notification)");
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'événement Inngest (contact.notification):", error);
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
    console.warn("⚠️  Envoi d'email annulé: Inngest n'est pas configuré (notification.send)");
    return;
  }
  
  try {
    console.log("📧 Déclenchement de l'email de notification pour:", data.to);
    await inngest.send({
      name: "email/notification.send",
      data,
    });
    console.log("✅ Événement Inngest envoyé avec succès (notification.send)");
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'événement Inngest (notification.send):", error);
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
    console.warn("⚠️  Envoi d'email annulé: Inngest n'est pas configuré (intake.owner-form)");
    return;
  }
  
  try {
    console.log("📧 Déclenchement de l'email de formulaire propriétaire pour:", data.to);
    await inngest.send({
      name: "email/intake.owner-form",
      data,
    });
    console.log("✅ Événement Inngest envoyé avec succès (intake.owner-form)");
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'événement Inngest (intake.owner-form):", error);
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
    console.warn("⚠️  Envoi d'email annulé: Inngest n'est pas configuré (intake.tenant-form)");
    return;
  }
  
  try {
    console.log("📧 Déclenchement de l'email de formulaire locataire pour:", data.to);
    await inngest.send({
      name: "email/intake.tenant-form",
      data,
    });
    console.log("✅ Événement Inngest envoyé avec succès (intake.tenant-form)");
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'événement Inngest (intake.tenant-form):", error);
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
    console.warn("⚠️  Envoi d'email annulé: Inngest n'est pas configuré (lead.conversion)");
    return;
  }
  
  try {
    console.log("📧 Déclenchement de l'email de conversion de lead pour:", data.to);
    await inngest.send({
      name: "email/lead.conversion",
      data,
    });
    console.log("✅ Événement Inngest envoyé avec succès (lead.conversion)");
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'événement Inngest (lead.conversion):", error);
    // Ne pas propager l'erreur pour éviter de faire planter l'application
  }
}

