import { inngest } from "./client";
import { prisma } from "@/lib/prisma";

/**
 * Enregistre l'envoi d'un formulaire sur son lien (compteur et date du dernier
 * envoi), pour le suivi côté administrateur. Le jeton est le dernier segment
 * de l'URL du formulaire. Un échec ici ne doit jamais empêcher l'envoi.
 */
async function recordFormEmailSent(formUrl: string) {
  try {
    const token = new URL(formUrl, "http://localhost").pathname.split("/").filter(Boolean).pop();
    if (!token) return;
    await prisma.intakeLink.updateMany({
      where: { token },
      data: { formEmailCount: { increment: 1 }, lastFormEmailSentAt: new Date() },
    });
  } catch (error) {
    console.error("[recordFormEmailSent] Suivi d'envoi non enregistré:", error);
  }
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
  await inngest.send({
    name: "email/contact.confirmation",
    data,
  });
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
  await inngest.send({
    name: "email/contact.notification",
    data,
  });
}

/**
 * E-mail unique au locataire : ses conditions ont changé, il doit les reconfirmer (M15). L'identifiant
 * d'événement empêche un double envoi pour la même demande.
 */
export async function triggerTenantReconfirmationEmail(data: {
  bailId: string;
  requestedAt: string;
  changedLabels: string[];
  /** Détail des changements, valeurs déjà mises en forme (« 1 150 € » → « 1 100 € »). */
  changes?: Array<{ label: string; before: string; after: string }>;
}) {
  await inngest.send({
    id: `tenant-reconfirmation-${data.bailId}-${data.requestedAt}`,
    name: "email/tenant-reconfirmation.send",
    data,
  });
}

/**
 * Déclenche l'envoi d'un email de notification
 */
export async function triggerNotificationEmail(data: {
  to: string | string[];
  userName: string | null;
  notificationMessage: string;
  interfaceUrl: string;
}) {
  await inngest.send({
    name: "email/notification.send",
    data,
  });
}

/**
 * Déclenche l'envoi d'un email de formulaire propriétaire
 */
export async function triggerOwnerFormEmail(data: {
  to: string;
  firstName?: string | null;
  lastName?: string | null;
  formUrl: string;
  emailContext?: "landing_owner" | "landing_tenant" | "admin" | "default";
}) {
  await inngest.send({
    name: "email/intake.owner-form",
    data,
  });
  await recordFormEmailSent(data.formUrl);
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
  await inngest.send({
    name: "email/intake.tenant-form",
    data,
  });
  await recordFormEmailSent(data.formUrl);
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
  await inngest.send({
    name: "email/lead.conversion",
    data,
  });
}

/**
 * Déclenche le calcul et la mise à jour du statut de complétion d'un client
 */
export async function triggerClientCompletionStatusCalculation(clientId: string) {
  await inngest.send({
    name: "completion-status/client.calculate",
    data: { clientId },
  });
}

/**
 * Déclenche le calcul et la mise à jour du statut de complétion d'un bien
 */
export async function triggerPropertyCompletionStatusCalculation(propertyId: string) {
  await inngest.send({
    name: "completion-status/property.calculate",
    data: { propertyId },
  });
}

/**
 * Déclenche le calcul et la mise à jour des statuts de complétion d'un client et d'un bien
 */
export async function triggerCompletionStatusesCalculation(data: {
  clientId?: string;
  propertyId?: string;
}) {
  await inngest.send({
    name: "completion-status/calculate-multiple",
    data,
  });
}

/**
 * Déclenche l'envoi d'un email de notification pour un nouveau commentaire de blog
 */
export async function triggerBlogCommentNotificationEmail(data: {
  commenterName: string;
  commenterEmail: string;
  commentContent: string;
  articleTitle: string;
  articleUrl: string;
  commentDate: string;
}) {
  await inngest.send({
    name: "email/blog-comment.notification",
    data,
  });
}

/**
 * Déclenche l'envoi d'un email de confirmation après soumission d'un formulaire d'intake
 */
export async function triggerIntakeConfirmationEmail(data: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "LOCATAIRE" | "PROPRIETAIRE";
  /** Fiche du client : sert à retrouver son dossier (adresse, autre partie) au moment de l'envoi. */
  clientId?: string;
}) {
  await inngest.send({
    name: "email/intake.confirmation",
    data,
  });
}

/**
 * Déclenche l'envoi d'un email de notification au propriétaire quand le locataire soumet son formulaire
 */
export async function triggerTenantSubmittedNotificationEmail(data: {
  ownerEmail: string;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  tenantFirstName?: string | null;
  tenantLastName?: string | null;
  propertyAddress?: string | null;
  interfaceUrl: string;
}) {
  await inngest.send({
    name: "email/intake.tenant-submitted",
    data,
  });
}

/**
 * Déclenche l'envoi d'un email de bienvenue pour un nouveau notaire
 */
export async function triggerNotaireWelcomeEmail(data: {
  email: string;
  userName?: string | null;
  loginUrl: string;
}) {
  await inngest.send({
    name: "email/notaire.welcome",
    data,
  });
}

/**
 * Déclenche l'envoi d'un email de notification pour un nouveau message de chat
 * Utilisé quand le destinataire n'est pas en ligne
 */
export async function triggerChatMessageNotificationEmail(data: {
  recipientEmail: string;
  recipientName?: string | null;
  senderName: string;
  senderRole: "notaire" | "client";
  messagePreview: string;
  bailAddress?: string | null;
  chatUrl: string;
}) {
  await inngest.send({
    name: "email/chat-message.send",
    data,
  });
}

/**
 * Déclenche l'envoi d'un email pour une nouvelle demande de document
 * Envoyé au client quand le notaire crée une demande
 */
export async function triggerDocumentRequestEmail(data: {
  recipientEmail: string;
  recipientName?: string | null;
  notaireName: string;
  requestTitle: string;
  requestContent: string;
  bailAddress?: string | null;
  chatUrl: string;
}) {
  await inngest.send({
    name: "email/document-request.send",
    data,
  });
}

/**
 * Déclenche l'envoi d'un email de notification de changement de statut de completion
 * Envoyé au client quand son statut de completion change
 */
export async function triggerCompletionStatusEmail(data: {
  to: string;
  clientName?: string | null;
  entityType: "client" | "property";
  entityName?: string | null;
  oldStatus: string;
  newStatus: string;
  dashboardUrl: string;
  profilType?: "PROPRIETAIRE" | "LOCATAIRE";
  /** Fiche vérifiée (client) ou bien vérifié : sert à savoir, à l'envoi, si tout le dossier l'est. */
  clientId?: string;
  propertyId?: string;
}) {
  await inngest.send({
    name: "email/completion-status.send",
    data,
  });
}

/**
 * Déclenche l'envoi d'un email quand un document est reçu en réponse à une demande
 * Envoyé au notaire quand le client répond
 */
export async function triggerDocumentReceivedEmail(data: {
  notaireEmail: string;
  notaireName?: string | null;
  clientName: string;
  requestTitle: string;
  documentNames: string[];
  bailAddress?: string | null;
  chatUrl: string;
}) {
  await inngest.send({
    name: "email/document-received.send",
    data,
  });
}

