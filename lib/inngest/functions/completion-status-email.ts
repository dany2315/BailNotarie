import { inngest } from "@/lib/inngest/client";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailCompletionStatus from "@/emails/mail-completion-status";

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
      await resendSendEmail({
        from: "Support BailNotarie <support@bailnotarie.fr>",
        to: event.data.to,
        subject: event.data.subject,
        react: MailCompletionStatus({
          clientName: event.data.clientName,
          entityType: event.data.entityType,
          entityName: event.data.entityName,
          oldStatus: event.data.oldStatus,
          newStatus: event.data.newStatus,
          dashboardUrl: event.data.dashboardUrl,
          profilType: event.data.profilType,
        }),
      });
    });
  }
);





