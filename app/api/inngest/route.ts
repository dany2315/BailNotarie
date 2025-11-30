import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { sendContactConfirmationEmail, sendContactNotificationEmail } from "@/lib/inngest/functions/contact";
import { sendNotificationEmail } from "@/lib/inngest/functions/notifications";
import { sendOwnerFormEmail, sendTenantFormEmail, sendRequestStatusEmail } from "@/lib/inngest/functions/intake-forms";
import { sendLeadConversionEmail } from "@/lib/inngest/functions/leads";
import { sendBlogCommentNotificationEmail } from "@/lib/inngest/functions/blog-comments";
import { 
  calculateClientCompletionStatus, 
  calculatePropertyCompletionStatus,
  calculateCompletionStatuses 
} from "@/lib/inngest/functions/completion-status";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendContactConfirmationEmail,
    sendContactNotificationEmail,
    sendNotificationEmail,
    sendOwnerFormEmail,
    sendTenantFormEmail,
    sendRequestStatusEmail,
    sendLeadConversionEmail,
    sendBlogCommentNotificationEmail,
    calculateClientCompletionStatus,
    calculatePropertyCompletionStatus,
    calculateCompletionStatuses,
  ],
});

