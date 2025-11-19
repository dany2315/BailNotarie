import { inngest } from "@/lib/inngest/client";
import { resend } from "@/lib/resend";
import MailConfirmation from "@/emails/mail-Confirmation";
import MailNotificationEquipe from "@/emails/mail-Notification-Equipe";

export const sendContactConfirmationEmail = inngest.createFunction(
  { id: "send-contact-confirmation-email" },
  { event: "email/contact.confirmation" },
  async ({ event, step }) => {
    await step.run("send-confirmation-email", async () => {
      await resend.emails.send({
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
    });
  }
);

export const sendContactNotificationEmail = inngest.createFunction(
  { id: "send-contact-notification-email" },
  { event: "email/contact.notification" },
  async ({ event, step }) => {
    await step.run("send-notification-email", async () => {
      await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: ["david@bailnotarie.fr", "shlomi@bailnotarie.fr"],
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
    });
  }
);

