import { inngest } from "@/lib/inngest/client";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailOwnerForm from "@/emails/mail-owner-form";
import MailTenantForm from "@/emails/mail-tenant-form";
import MailConfirmation from "@/emails/mail-Confirmation";
import MailTenantSubmitted from "@/emails/mail-tenant-submitted";
import { getDossierEmailContext, tokenFromFormUrl } from "@/lib/email/dossier-context";

export const sendOwnerFormEmail = inngest.createFunction(
  { id: "send-owner-form-email" },
  { event: "email/intake.owner-form" },
  async ({ event, step }) => {
    await step.run("send-owner-form-email", async () => {
      const result = await resendSendEmail({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: event.data.to,
        subject:
          event.data.emailContext === "admin"
            ? `${event.data.firstName ? `${event.data.firstName}, votre` : "Votre"} bail notarié démarre : complétez votre dossier`
            : event.data.emailContext === "landing_owner"
              ? "Votre dossier de bail notarié est ouvert"
              : "Votre locataire vous propose un bail notarié : complétez votre partie",
        react: MailOwnerForm({
          firstName: event.data.firstName || "",
          lastName: event.data.lastName || "",
          formUrl: event.data.formUrl,
          emailContext: event.data.emailContext || "default",
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
      // Nom du propriétaire, adresse et prénom du locataire lus sur le dossier du lien.
      const dossier = await getDossierEmailContext({ token: tokenFromFormUrl(event.data.formUrl) });
      const firstName = (event.data.firstName || "").trim() || dossier.tenantFirstName || "";
      const result = await resendSendEmail({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: event.data.to,
        subject: dossier.ownerName
          ? `${firstName ? `${firstName}, ` : ""}${dossier.ownerName} prépare votre bail notarié : complétez vos informations`
          : `${firstName ? `${firstName}, votre` : "Votre"} bail notarié n'attend plus que vous`,
        react: MailTenantForm({
          firstName,
          lastName: event.data.lastName || "",
          formUrl: event.data.formUrl,
          ownerName: dossier.ownerName,
          propertyAddress: dossier.propertyAddress,
          premisesWord: dossier.premisesWord,
        }),
      });
      
      if (result.error) {
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }
      
      return result;
    });
  }
);

export const sendIntakeConfirmationEmail = inngest.createFunction(
  { id: "send-intake-confirmation-email" },
  { event: "email/intake.confirmation" },
  async ({ event, step }) => {
    await step.run("send-intake-confirmation-email", async () => {
      // Adresse, autre partie et invitation du locataire lues sur le dossier du client (s'il est connu).
      const dossier = event.data.clientId ? await getDossierEmailContext({ clientId: event.data.clientId }) : null;
      const result = await resendSendEmail({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: event.data.email,
        subject:
          event.data.role === "LOCATAIRE"
            ? `Merci${event.data.firstName ? ` ${event.data.firstName}` : ""}, vos informations sont bien transmises`
            : `C'est envoyé${event.data.firstName ? `, ${event.data.firstName}` : ""} : votre dossier passe en vérification`,
        react: MailConfirmation({
          firstName: event.data.firstName,
          lastName: event.data.lastName,
          email: event.data.email,
          phone: event.data.phone || "",
          role: event.data.role,
          propertyAddress: dossier?.propertyAddress,
          ownerName: dossier?.ownerName,
          tenantName: dossier?.tenantName,
          tenantInvited: dossier ? dossier.tenantInvited : undefined,
        }),
      });
      
      if (result.error) {
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }
      
      return result;
    });
  }
);

export const sendTenantSubmittedNotificationEmail = inngest.createFunction(
  { id: "send-tenant-submitted-notification-email" },
  { event: "email/intake.tenant-submitted" },
  async ({ event, step }) => {
    await step.run("send-tenant-submitted-notification-email", async () => {
      const result = await resendSendEmail({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: event.data.ownerEmail,
        subject: `Bonne nouvelle : ${[event.data.tenantFirstName, event.data.tenantLastName].filter(Boolean).join(" ") || "votre locataire"} a complété ses informations`,
        react: MailTenantSubmitted({
          ownerFirstName: event.data.ownerFirstName || "",
          ownerLastName: event.data.ownerLastName || "",
          tenantFirstName: event.data.tenantFirstName || "",
          tenantLastName: event.data.tenantLastName || "",
          propertyAddress: event.data.propertyAddress,
          interfaceUrl: event.data.interfaceUrl,
        }),
      });
      
      if (result.error) {
        throw new Error(`Erreur Resend: ${result.error.message}`);
      }
      
      return result;
    });
  }
);

