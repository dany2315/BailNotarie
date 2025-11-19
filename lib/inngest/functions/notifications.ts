import { inngest } from "@/lib/inngest/client";
import { resend, isResendConfigured } from "@/lib/resend";
import MailNotification from "@/emails/mail-notification";

export const sendNotificationEmail = inngest.createFunction(
  { id: "send-notification-email" },
  { event: "email/notification.send" },
  async ({ event, step }) => {
    await step.run("send-notification-email", async () => {
      if (!isResendConfigured()) {
        throw new Error("RESEND_API_KEY n'est pas configurée. Impossible d'envoyer l'email.");
      }

      console.log("📧 Envoi de l'email de notification à:", event.data.to);

      const result = await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: event.data.to,
        subject: "Nouvelle notification - BailNotarie",
        react: MailNotification({
          userName: event.data.userName,
          notificationMessage: event.data.notificationMessage,
          interfaceUrl: event.data.interfaceUrl,
        }),
      });

      if (result.error) {
        console.error("❌ Erreur Resend lors de l'envoi de l'email de notification:", result.error);
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }

      console.log("✅ Email de notification envoyé avec succès à:", event.data.to);
      return result;
    });
  }
);

