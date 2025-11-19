import { Inngest } from "inngest";

/**
 * Configuration Inngest
 * 
 * En développement local avec Inngest Dev Server:
 * - INNGEST_EVENT_KEY n'est pas nécessaire
 * - Inngest Dev Server écoute sur http://localhost:8288
 * - Le client doit pointer vers le Dev Server
 * 
 * En production:
 * - INNGEST_EVENT_KEY est requis
 * - L'URL de l'application doit être configurée dans Inngest Dashboard
 */
export const inngest = new Inngest({ 
  id: "bailnotarie",
  name: "BailNotarie",
  eventKey: process.env.INNGEST_EVENT_KEY,
  // En développement, pointer vers Inngest Dev Server
  // En production, utiliser Inngest Cloud (détecté automatiquement)
  ...(process.env.NODE_ENV !== "production" && !process.env.INNGEST_EVENT_KEY
    ? {
        // En développement local avec Dev Server, utiliser l'URL du Dev Server
        baseURL: process.env.INNGEST_BASE_URL || "http://localhost:8288",
      }
    : {}),
});

