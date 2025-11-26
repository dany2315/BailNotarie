import { inngest } from "@/lib/inngest/client";
import { resend } from "@/lib/resend";
import MailOwnerForm from "@/emails/mail-owner-form";
import MailTenantForm from "@/emails/mail-tenant-form";
import MailRequestStatus from "@/emails/mail-request-status";

export const sendOwnerFormEmail = inngest.createFunction(
  { id: "send-owner-form-email" },
  { event: "email/intake.owner-form" },
  async ({ event, step }) => {
    await step.run("send-owner-form-email", async () => {
      const result = await resend.emails.send({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
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
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
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

export const sendRequestStatusEmail = inngest.createFunction(
  { id: "send-request-status-email" },
  { event: "email/request-status.send" },
  async ({ event, step }) => {
    await step.run("send-request-status-email", async () => {
      const result = await resend.emails.send({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: event.data.to,
        subject: "Suivi de votre demande de bail notarié",
        react: MailRequestStatus({
          firstName: event.data.firstName,
          lastName: event.data.lastName,
          currentStep: event.data.currentStep,
          status: event.data.status,
          propertyAddress: event.data.propertyAddress,
          profilType: event.data.profilType,
          intakeLinkToken: event.data.intakeLinkToken,
        }),
      });
      
      if (result.error) {
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }
      
      return result;
    });
  }
);

