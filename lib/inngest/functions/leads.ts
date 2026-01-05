import { inngest } from "@/lib/inngest/client";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailLeadConversion from "@/emails/mail-lead-conversion";

export const sendLeadConversionEmail = inngest.createFunction(
  { id: "send-lead-conversion-email" },
  { event: "email/lead.conversion" },
  async ({ event, step }) => {
    await step.run("send-lead-conversion-email", async () => {
      await resendSendEmail({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: event.data.to,
        subject: event.data.subject,
        react: MailLeadConversion({
          convertUrl: event.data.convertUrl,
          isOwnerForm: event.data.isOwnerForm,
          isTenantForm: event.data.isTenantForm,
        }),
      });
    });
  }
);

