import { inngest } from "@/lib/inngest/client";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailDocumentRequest from "@/emails/mail-document-request";
import MailDocumentReceived from "@/emails/mail-document-received";
import { notaireTitle } from "@/lib/notaire/form-reminders";
import { senderAs } from "@/lib/utils/email-sender";

/**
 * Envoie un email au client pour une nouvelle demande de document
 */
export const sendDocumentRequestEmail = inngest.createFunction(
  { 
    id: "send-document-request-email",
  },
  { event: "email/document-request.send" },
  async ({ event, step }) => {
    await step.run("send-document-request-email", async () => {
      const notaire = notaireTitle(event.data.notaireName) || "Votre notaire";
      await resendSendEmail({
        from: senderAs(notaireTitle(event.data.notaireName), "contact@bailnotarie.fr"),
        to: event.data.recipientEmail,
        subject: `${notaire} a besoin d'un document : ${event.data.requestTitle}`,
        react: MailDocumentRequest({
          recipientName: event.data.recipientName,
          notaireName: notaire,
          requestTitle: event.data.requestTitle,
          requestContent: event.data.requestContent,
          bailAddress: event.data.bailAddress,
          chatUrl: event.data.chatUrl,
        }),
      });
    });
  }
);

/**
 * Envoie un email au notaire quand un document est reçu en réponse à une demande
 */
export const sendDocumentReceivedEmail = inngest.createFunction(
  { 
    id: "send-document-received-email",
  },
  { event: "email/document-received.send" },
  async ({ event, step }) => {
    await step.run("send-document-received-email", async () => {
      const requestTitle =
        typeof event.data.requestTitle === "string" && event.data.requestTitle.trim().length > 0
          ? event.data.requestTitle
          : "Demande de document";
      const documentNames = Array.isArray(event.data.documentNames)
        ? event.data.documentNames.filter(
            (name: unknown): name is string =>
              typeof name === "string" && name.trim().length > 0
          )
        : [];
      const chatUrl =
        typeof event.data.chatUrl === "string" && event.data.chatUrl.trim().length > 0
          ? event.data.chatUrl
          : process.env.NEXT_PUBLIC_URL || "https://www.bailnotarie.fr";

      await resendSendEmail({
        from: "BailNotarie <contact@bailnotarie.fr>",
        to: event.data.notaireEmail,
        subject: `Pièce reçue de ${event.data.clientName || "votre client"} : ${requestTitle}`,
        react: MailDocumentReceived({
          notaireName: event.data.notaireName,
          clientName: event.data.clientName,
          requestTitle,
          documentNames,
          bailAddress: event.data.bailAddress,
          chatUrl,
        }),
      });
    });
  }
);






