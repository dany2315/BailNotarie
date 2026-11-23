import { inngest } from "@/lib/inngest/client";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailConfirmation from "@/emails/mail-Confirmation";
import MailNotificationEquipe, { contactTeamSubject } from "@/emails/mail-Notification-Equipe";

export const sendContactConfirmationEmail = inngest.createFunction(
  { id: "send-contact-confirmation-email" },
  { event: "email/contact.confirmation" },
  async ({ event, step }) => {
    await step.run("send-confirmation-email", async () => {
      await resendSendEmail({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: event.data.email,
        subject: `Bien reçu${event.data.firstName ? `, ${event.data.firstName}` : ""} : on vous rappelle sous 24 h ouvrées`,
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
      await resendSendEmail({
        from: "Support BailNotarie <support@bailnotarie.fr>",
        to: ["david@bailnotarie.fr", "laetitia@bailnotarie.fr"],
        subject: contactTeamSubject(event.data.firstName, event.data.lastName),
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

