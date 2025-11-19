import { inngest } from "@/lib/inngest/client";
import { resend, isResendConfigured } from "@/lib/resend";
import MailConfirmation from "@/emails/mail-Confirmation";
import MailNotificationEquipe from "@/emails/mail-Notification-Equipe";

export const sendContactConfirmationEmail = inngest.createFunction(
  { id: "send-contact-confirmation-email" },
  { event: "email/contact.confirmation" },
  async ({ event, step }) => {
    await step.run("send-confirmation-email", async () => {
      if (!isResendConfigured()) {
        throw new Error("RESEND_API_KEY n'est pas configurée. Impossible d'envoyer l'email.");
      }

      console.log("📧 Envoi de l'email de confirmation de contact à:", event.data.email);
      
      const result = await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: event.data.email,
        subject: "Confirmation de votre demande de contact",
        react: MailConfirmation({
          firstName: event.data.firstName,
          lastName: event.data.lastName,
          email: event.data.email,
          phone: event.data.phone,
          message: event.data.message,
        }),
      });

      if (result.error) {
        console.error("❌ Erreur Resend lors de l'envoi de l'email de confirmation:", result.error);
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }

      console.log("✅ Email de confirmation envoyé avec succès à:", event.data.email);
      return result;
    });
  }
);

export const sendContactNotificationEmail = inngest.createFunction(
  { id: "send-contact-notification-email" },
  { event: "email/contact.notification" },
  async ({ event, step }) => {
    await step.run("send-notification-email", async () => {
      if (!isResendConfigured()) {
        throw new Error("RESEND_API_KEY n'est pas configurée. Impossible d'envoyer l'email.");
      }

      const recipients = ["david@bailnotarie.fr", "shlomi@bailnotarie.fr"];
      console.log("📧 Envoi de l'email de notification d'équipe pour:", event.data.email);

      const result = await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: recipients,
        subject: "Nouvelle demande de contact",
        react: MailNotificationEquipe({
          firstName: event.data.firstName,
          lastName: event.data.lastName,
          email: event.data.email,
          phone: event.data.phone,
          message: event.data.message,
          dateDemande: event.data.dateDemande,
        }),
      });

      if (result.error) {
        console.error("❌ Erreur Resend lors de l'envoi de l'email de notification:", result.error);
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }

      console.log("✅ Email de notification d'équipe envoyé avec succès à:", recipients.join(", "));
      return result;
    });
  }
);

