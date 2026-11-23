import * as React from "react";
import { EmailLayout, Kicker, Title, Lead, InfoCard, Actions, Hint, Sign, absoluteUrl } from "./_shared/layout";

interface MailDocumentRequestProps {
  recipientName?: string | null;
  notaireName: string;
  requestTitle: string;
  requestContent: string;
  bailAddress?: string | null;
  chatUrl: string;
}

/** Le notaire demande un document à un client, depuis la conversation du dossier. */
export default function MailDocumentRequest({ recipientName, notaireName, requestTitle, requestContent, bailAddress, chatUrl }: MailDocumentRequestProps) {
  const notaire = (notaireName || "").trim() || "Votre notaire";
  const content = (requestContent || "").trim();
  return (
    <EmailLayout
      preview={`${requestTitle} : envoyez-le en un clic, depuis votre téléphone si vous le souhaitez.`}
      reference={bailAddress ? ["Logement", bailAddress] : ["Votre bail notarié"]}
      footerNote="Vous recevez cet e-mail car votre notaire vous a envoyé une demande pour votre bail."
    >
      <Kicker>De la part de votre notaire</Kicker>
      <Title>{notaire} a besoin d'un document</Title>
      <Lead>{recipientName ? `Bonjour ${recipientName}, pour` : "Bonjour, pour"} préparer la signature de votre bail, votre notaire vous demande :</Lead>
      <InfoCard label={requestTitle}>{content ? `« ${content} »` : undefined}</InfoCard>
      <Actions primary={{ label: "Envoyer le document", href: absoluteUrl(chatUrl) }} />
      <Hint>Un PDF ou une photo nette suffit.</Hint>
      <Sign team={`L'équipe BailNotarie, pour ${notaire}`} />
    </EmailLayout>
  );
}

MailDocumentRequest.PreviewProps = {
  recipientName: "Léa",
  notaireName: "Maître Claire Durand",
  requestTitle: "Attestation d'assurance habitation",
  requestContent: "Merci de me transmettre votre attestation d'assurance habitation pour le logement, à la date d'entrée dans les lieux.",
  bailAddress: "12 rue des Lilas, 75011 Paris",
  chatUrl: "/client/locataire/baux/exemple",
} satisfies MailDocumentRequestProps;
