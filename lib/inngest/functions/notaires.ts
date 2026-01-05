import { inngest } from "@/lib/inngest/client";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailNotaireWelcome from "@/emails/mail-notaire-welcome";

export const sendNotaireWelcomeEmail = inngest.createFunction(
  { id: "send-notaire-welcome-email" },
  { event: "email/notaire.welcome" },
  async ({ event, step }) => {
    await step.run("send-welcome-email", async () => {
      await resendSendEmail({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: event.data.email,
        subject: "Bienvenue sur BailNotarie - Votre compte notaire",
        react: MailNotaireWelcome({
          userName: event.data.userName,
          email: event.data.email,
          loginUrl: event.data.loginUrl,
        }),
      });
    });
  }
);

