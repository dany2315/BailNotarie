import { inngest } from "./client";

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
 * Déclenche l'envoi d'un email de notification
 */
export async function triggerNotificationEmail(data: {
  to: string;
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
}) {
  await inngest.send({
    name: "email/intake.owner-form",
    data,
  });
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
 * Déclenche l'envoi d'un email de suivi de demande
 */
export async function triggerRequestStatusEmail(data: {
  to: string;
  firstName?: string | null;
  lastName?: string | null;
  currentStep: string;
  status: string;
  propertyAddress?: string | null;
  profilType: string;
  intakeLinkToken?: string | null;
}) {
  await inngest.send({
    name: "email/request-status.send",
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

