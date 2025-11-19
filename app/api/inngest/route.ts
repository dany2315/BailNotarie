import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { sendContactConfirmationEmail, sendContactNotificationEmail } from "@/lib/inngest/functions/contact";
import { sendNotificationEmail } from "@/lib/inngest/functions/notifications";
import { sendOwnerFormEmail, sendTenantFormEmail } from "@/lib/inngest/functions/intake-forms";
import { sendLeadConversionEmail } from "@/lib/inngest/functions/leads";

// Enregistrer toutes les fonctions Inngest
const functions = [
  sendContactConfirmationEmail,
  sendContactNotificationEmail,
  sendNotificationEmail,
  sendOwnerFormEmail,
  sendTenantFormEmail,
  sendLeadConversionEmail,
];

// Logger les fonctions enregistrées au démarrage (en développement)
if (process.env.NODE_ENV !== "production") {
  console.log("🔧 Fonctions Inngest enregistrées:", functions.map(f => f.id || "unknown").join(", "));
}

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});

