import { inngest } from "@/lib/inngest/client";
import { resend, isResendConfigured } from "@/lib/resend";
import MailOwnerForm from "@/emails/mail-owner-form";
import MailTenantForm from "@/emails/mail-tenant-form";

export const sendOwnerFormEmail = inngest.createFunction(
  { id: "send-owner-form-email" },
  { event: "email/intake.owner-form" },
  async ({ event, step }) => {
    await step.run("send-owner-form-email", async () => {
      if (!isResendConfigured()) {
        throw new Error("RESEND_API_KEY n'est pas configurée. Impossible d'envoyer l'email.");
      }

      console.log("📧 Envoi de l'email de formulaire propriétaire à:", event.data.to);

      const result = await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: event.data.to,
        subject: "Formulaire de bail notarié - Propriétaire",
        react: MailOwnerForm({
          firstName: event.data.firstName || "",
          lastName: event.data.lastName || "",
          formUrl: event.data.formUrl,
        }),
      });
      
      if (result.error) {
        console.error("❌ Erreur Resend lors de l'envoi de l'email de formulaire propriétaire:", result.error);
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }

      console.log("✅ Email de formulaire propriétaire envoyé avec succès à:", event.data.to);
      return result;
    });
  }
);

export const sendTenantFormEmail = inngest.createFunction(
  { id: "send-tenant-form-email" },
  { event: "email/intake.tenant-form" },
  async ({ event, step }) => {
    await step.run("send-tenant-form-email", async () => {
      if (!isResendConfigured()) {
        throw new Error("RESEND_API_KEY n'est pas configurée. Impossible d'envoyer l'email.");
      }

      console.log("📧 Envoi de l'email de formulaire locataire à:", event.data.to);

      const result = await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: event.data.to,
        subject: "Formulaire de bail notarié - Locataire",
        react: MailTenantForm({
          firstName: event.data.firstName || "",
          lastName: event.data.lastName || "",
          formUrl: event.data.formUrl,
        }),
      });
      
      if (result.error) {
        console.error("❌ Erreur Resend lors de l'envoi de l'email de formulaire locataire:", result.error);
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }

      console.log("✅ Email de formulaire locataire envoyé avec succès à:", event.data.to);
      return result;
    });
  }
);

