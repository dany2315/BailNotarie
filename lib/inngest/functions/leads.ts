import { inngest } from "@/lib/inngest/client";
import { resend, isResendConfigured } from "@/lib/resend";
import MailLeadConversion from "@/emails/mail-lead-conversion";

export const sendLeadConversionEmail = inngest.createFunction(
  { id: "send-lead-conversion-email" },
  { event: "email/lead.conversion" },
  async ({ event, step }) => {
    await step.run("send-lead-conversion-email", async () => {
      if (!isResendConfigured()) {
        throw new Error("RESEND_API_KEY n'est pas configurée. Impossible d'envoyer l'email.");
      }

      console.log("📧 Envoi de l'email de conversion de lead à:", event.data.to);

      const result = await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: event.data.to,
        subject: event.data.subject,
        react: MailLeadConversion({
          convertUrl: event.data.convertUrl,
          isOwnerForm: event.data.isOwnerForm,
          isTenantForm: event.data.isTenantForm,
        }),
      });

      if (result.error) {
        console.error("❌ Erreur Resend lors de l'envoi de l'email de conversion de lead:", result.error);
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }

      console.log("✅ Email de conversion de lead envoyé avec succès à:", event.data.to);
      return result;
    });
  }
);

