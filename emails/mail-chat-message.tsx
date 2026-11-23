import * as React from "react";
import { EmailLayout, Title, Lead, Quote, Actions, Hint, absoluteUrl } from "./_shared/layout";

interface MailChatMessageProps {
  recipientName?: string | null;
  senderName: string;
  senderRole: "notaire" | "client";
  messagePreview: string;
  bailAddress?: string | null;
  chatUrl: string;
}

/** Nouveau message dans la conversation du bail, quand le destinataire n'est pas connecté. */
export default function MailChatMessage({ recipientName, senderName, senderRole, messagePreview, bailAddress, chatUrl }: MailChatMessageProps) {
  const sender = typeof senderName === "string" && senderName.trim() ? senderName.trim() : senderRole === "notaire" ? "Votre notaire" : "Votre client";
  const text = typeof messagePreview === "string" ? messagePreview.trim() : "";
  const excerpt = text.length > 400 ? `${text.slice(0, 400)}…` : text || "Nouveau message reçu.";
  const toNotaire = senderRole === "client";
  return (
    <EmailLayout
      preview={`« ${excerpt.slice(0, 110)}${excerpt.length > 110 ? "…" : ""} »`}
      reference={bailAddress ? ["Conversation du bail", bailAddress] : ["Conversation du bail"]}
      footerNote="Vous recevez cet e-mail car un message a été posté dans la conversation du bail alors que vous n'étiez pas connecté."
    >
      <Title>{sender} vous a écrit</Title>
      {recipientName && <Lead>{toNotaire ? `${recipientName},` : `Bonjour ${recipientName},`}</Lead>}
      <Quote author={sender}>{excerpt}</Quote>
      <Actions primary={{ label: `Répondre à ${sender}`, href: absoluteUrl(chatUrl) }} />
      <Hint>
        {toNotaire
          ? "La réponse arrive directement dans la conversation du dossier."
          : "Votre réponse arrive directement dans la conversation du bail, que le notaire suit."}
      </Hint>
    </EmailLayout>
  );
}

MailChatMessage.PreviewProps = {
  recipientName: "Thomas",
  senderName: "Maître Claire Durand",
  senderRole: "notaire",
  messagePreview:
    "Bonjour Monsieur Bernard, je vous propose une signature le jeudi 4 décembre à 10 h à l'étude. Pouvez-vous me confirmer que cette date vous convient, ainsi qu'à votre locataire ?",
  bailAddress: "12 rue des Lilas, 75011 Paris",
  chatUrl: "https://www.bailnotarie.fr/client/proprietaire/baux/exemple",
} satisfies MailChatMessageProps;
