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
      const senderName =
        typeof event.data.senderName === "string" && event.data.senderName.trim().length > 0
          ? event.data.senderName
          : "Un utilisateur";
      const messagePreview =
        typeof event.data.messagePreview === "string" ? event.data.messagePreview : "";
      const chatUrl =
        typeof event.data.chatUrl === "string" && event.data.chatUrl.trim().length > 0
          ? event.data.chatUrl
          : process.env.NEXT_PUBLIC_URL || "https://www.bailnotarie.fr";

      await resendSendEmail({
        from: "Messagerie BailNotarie <support@bailnotarie.fr>",
        to: event.data.recipientEmail,
        subject: `💬 Nouveau message de ${senderName} - BailNotarie`,
        react: MailChatMessage({
          recipientName: event.data.recipientName,
          senderName,
          senderRole: event.data.senderRole,
          messagePreview,
          bailAddress: event.data.bailAddress,
          chatUrl,
        }),
      });
    });
  }
);

