import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { sendContactConfirmationEmail, sendContactNotificationEmail } from "@/lib/inngest/functions/contact";
import { sendNotificationEmail } from "@/lib/inngest/functions/notifications";
import { sendOwnerFormEmail, sendTenantFormEmail } from "@/lib/inngest/functions/intake-forms";
import { sendLeadConversionEmail } from "@/lib/inngest/functions/leads";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendContactConfirmationEmail,
    sendContactNotificationEmail,
    sendNotificationEmail,
    sendOwnerFormEmail,
    sendTenantFormEmail,
    sendLeadConversionEmail,
  ],
});

