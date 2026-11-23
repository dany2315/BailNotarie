import * as React from "react";
import { EmailLayout, Title, Lead, InfoCard, Actions, Hint, Sign } from "./_shared/layout";
import { complementEmailContent, type ComplementEmailInput } from "../lib/utils/complement";

export interface MailComplementProps extends ComplementEmailInput {
  /** Page de la demande dans l'espace client. */
  actionUrl: string;
}

/** Pièces ou informations demandées par l'équipe (ou le notaire) : la liste, le motif de chacune et le lien vers l'espace client. */
export default function MailComplement(props: MailComplementProps) {
  const content = complementEmailContent(props);
  const hasDocuments = props.items.some((item) => item.kind !== "FIELD");
  return (
    <EmailLayout
      preview={content.preview}
      reference={["Dossier", props.address]}
      footerNote="Vous recevez cet e-mail car votre dossier de bail notarié est en cours de vérification."
    >
      <Title>{content.title}</Title>
      <Lead>{content.greeting}</Lead>
      <Lead>{content.message}</Lead>
      {content.items.map((item, index) => (
        <InfoCard key={`${item.label}-${index}`} label={item.label} badge={item.reason}>
          {item.detail}
        </InfoCard>
      ))}
      <Actions primary={{ label: content.button, href: props.actionUrl }} />
      {hasDocuments && <Hint>Un PDF ou une photo nette prise au téléphone suffit.</Hint>}
      <Sign closing="Merci et à très vite," help="Une question sur une pièce ? Répondez simplement à cet e-mail." />
    </EmailLayout>
  );
}

MailComplement.PreviewProps = {
  name: "Thomas",
  address: "12 rue des Lilas, 75011 Paris",
  actionUrl: "https://www.bailnotarie.fr/client/demande/exemple",
  items: [
    { label: "Pièce d'identité de Thomas Bernard", reason: "ILLEGIBLE", note: "Merci d'envoyer le recto et le verso." },
    { label: "Règlement de copropriété", reason: "MISSING" },
  ],
} satisfies MailComplementProps;
