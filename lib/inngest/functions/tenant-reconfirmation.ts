import { inngest } from "@/lib/inngest/client";
import { sendTenantReconfirmationEmail, type TenantReconfirmationEmailData } from "@/lib/bail/tenant-reconfirmation-email";

/**
 * E-mail unique au locataire quand ses conditions doivent être reconfirmées (M15), sans relance.
 * L'événement part pendant l'enregistrement de la modification : on attend une minute qu'il soit terminé,
 * puis l'envoi ne se fait que si la demande est toujours en cours (voir sendTenantReconfirmationEmail).
 */
export const sendTenantReconfirmation = inngest.createFunction(
  { id: "send-tenant-reconfirmation-email", name: "E-mail au locataire : conditions à reconfirmer" },
  { event: "email/tenant-reconfirmation.send" },
  async ({ event, step }) => {
    await step.sleep("attendre-la-fin-de-l-enregistrement", "1m");
    return step.run("envoyer-si-toujours-attendu", () => sendTenantReconfirmationEmail(event.data as TenantReconfirmationEmailData));
  },
);
