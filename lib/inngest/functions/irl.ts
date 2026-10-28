import { inngest } from "@/lib/inngest/client";
import { syncIrlFromInsee } from "@/lib/irl-index";

/** Chaque matin, récupère auprès de l'INSEE les nouveaux indices de référence des loyers. */
export const syncIrl = inngest.createFunction(
  { id: "irl-sync" },
  { cron: "TZ=Europe/Paris 0 7 * * *" },
  async ({ step }) => step.run("sync-irl-from-insee", () => syncIrlFromInsee()),
);
