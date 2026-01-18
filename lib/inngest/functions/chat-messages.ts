import { inngest } from "@/lib/inngest/client";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailChatMessage from "@/emails/mail-chat-message";

export const sendChatMessageNotificationEmail = inngest.createFunction(
  { 
    id: "send-chat-message-notification-email",
    // Throttle pour éviter le spam si beaucoup de messages sont envoyés rapidement
    throttle: {
      key: "event.data.recipientEmail",
      limit: 1,
      period: "5m", // Maximum 1 email par destinataire toutes les 5 minutes
    },
  },
  { event: "email/chat-message.send" },
  async ({ event, step }) => {
    await step.run("send-chat-message-notification-email", async () => {
      await resendSendEmail({
        from: "Messagerie BailNotarie <support@bailnotarie.fr>",
        to: event.data.recipientEmail,
        subject: `💬 Nouveau message de ${event.data.senderName} - BailNotarie`,
        react: MailChatMessage({
          recipientName: event.data.recipientName,
          senderName: event.data.senderName,
          senderRole: event.data.senderRole,
          messagePreview: event.data.messagePreview,
          bailAddress: event.data.bailAddress,
          chatUrl: event.data.chatUrl,
        }),
      });
    });
  }
);

