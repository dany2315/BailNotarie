import { inngest } from "@/lib/inngest/client";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailNotification from "@/emails/mail-notification";

export const sendNotificationEmail = inngest.createFunction(
  { id: "send-notification-email" },
  { event: "email/notification.send" },
  async ({ event, step }) => {
    await step.run("send-notification-email", async () => {
      await resendSendEmail({
        from: "Support BailNotarie <support@bailnotarie.fr>",
        to: event.data.to,
        subject: "Nouvelle notification - BailNotarie",
        react: MailNotification({
          userName: event.data.userName,
          notificationMessage: event.data.notificationMessage,
          interfaceUrl: event.data.interfaceUrl,
        }),
      });
    });
  }
);

