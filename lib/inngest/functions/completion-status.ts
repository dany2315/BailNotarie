import { inngest } from "@/lib/inngest/client";
import { 
  updateClientCompletionStatus,
  updatePropertyCompletionStatus
} from "@/lib/utils/completion-status";

/**
 * Fonction Inngest pour calculer et mettre à jour le statut de complétion d'un client
 */
export const calculateClientCompletionStatus = inngest.createFunction(
  {
    id: "bailnotarie-calculate-client-completion-status",
    name: "Calculer le statut de complétion d'un client",
  },
  { event: "completion-status/client.calculate" },
  async ({ event, step }) => {
    const { clientId } = event.data;

    await step.run("calculer-statut-client", async () => {
      await updateClientCompletionStatus(clientId);
    });
  }
);

/**
 * Fonction Inngest pour calculer et mettre à jour le statut de complétion d'un bien
 */
export const calculatePropertyCompletionStatus = inngest.createFunction(
  {
    id: "bailnotarie-calculate-property-completion-status",
    name: "Calculer le statut de complétion d'un bien",
  },
  { event: "completion-status/property.calculate" },
  async ({ event, step }) => {
    const { propertyId } = event.data;

    await step.run("calculer-statut-bien", async () => {
      await updatePropertyCompletionStatus(propertyId);
    });
  }
);

/**
 * Fonction Inngest pour calculer et mettre à jour les statuts de complétion d'un client et d'un bien
 * (utile pour les formulaires owner qui mettent à jour les deux)
 */
export const calculateCompletionStatuses = inngest.createFunction(
  {
    id: "bailnotarie-calculate-completion-statuses",
    name: "Calculer les statuts de complétion (client et bien)",
  },
  { event: "completion-status/calculate-multiple" },
  async ({ event, step }) => {
    const { clientId, propertyId } = event.data;

    // Calculer les statuts en parallèle
    const steps = [];
    if (clientId) {
      steps.push(
        step.run("calculer-statut-client", async () => {
          await updateClientCompletionStatus(clientId);
        })
      );
    }
    if (propertyId) {
      steps.push(
        step.run("calculer-statut-bien", async () => {
          await updatePropertyCompletionStatus(propertyId);
        })
      );
    }
    
    if (steps.length > 0) {
      await Promise.all(steps);
    }
  }
);

