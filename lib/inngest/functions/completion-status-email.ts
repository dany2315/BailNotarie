import { inngest } from "@/lib/inngest/client";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailCompletionStatus, { completionStatusSubject } from "@/emails/mail-completion-status";
import { getDossierEmailContext } from "@/lib/email/dossier-context";

/**
 * Fonction Inngest pour envoyer un email de notification de changement de statut de completion
 */
export const sendCompletionStatusEmail = inngest.createFunction(
  { 
    id: "send-completion-status-email",
    name: "Envoyer un email de changement de statut de completion"
  },
  { event: "email/completion-status.send" },
  async ({ event, step }) => {
    await step.run("send-completion-status-email", async () => {
      // Validation : on regarde si tout le dossier est maintenant vérifié (bien, propriétaire, locataire) et
      // quel notaire le reçoit. Sinon l'e-mail parle seulement de la fiche validée.
      const lookup = { clientId: event.data.clientId, propertyId: event.data.propertyId };
      const dossier =
        event.data.newStatus === "COMPLETED" && (lookup.clientId || lookup.propertyId) ? await getDossierEmailContext(lookup) : null;
      const recipientIsTenant = event.data.profilType === "LOCATAIRE";
      const dossierValidated = !!dossier?.allVerified;
      await resendSendEmail({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: event.data.to,
        subject: completionStatusSubject(event.data.newStatus, event.data.entityType, {
          dossierValidated,
          clientName: event.data.clientName,
        }),
        react: MailCompletionStatus({
          clientName: event.data.clientName,
          entityType: event.data.entityType,
          entityName: event.data.entityName,
          oldStatus: event.data.oldStatus,
          newStatus: event.data.newStatus,
          dashboardUrl: event.data.dashboardUrl,
          profilType: event.data.profilType,
          dossierValidated,
          notaireName: dossier?.notaireName,
          otherPartyName: recipientIsTenant ? dossier?.ownerName : dossier?.tenantName,
          propertyAddress: dossier?.propertyAddress,
        }),
      });
    });
  }
);
