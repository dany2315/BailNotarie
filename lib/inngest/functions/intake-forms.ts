import { inngest } from "@/lib/inngest/client";
import { resend } from "@/lib/resend";
import MailOwnerForm from "@/emails/mail-owner-form";
import MailTenantForm from "@/emails/mail-tenant-form";

export const sendOwnerFormEmail = inngest.createFunction(
  { id: "send-owner-form-email" },
  { event: "email/intake.owner-form" },
  async ({ event, step }) => {
    await step.run("send-owner-form-email", async () => {
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
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }
      
      return result;
    });
  }
);

export const sendTenantFormEmail = inngest.createFunction(
  { id: "send-tenant-form-email" },
  { event: "email/intake.tenant-form" },
  async ({ event, step }) => {
    await step.run("send-tenant-form-email", async () => {
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
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }
      
      return result;
    });
  }
);

