import * as React from "react";
import { EmailLayout, Kicker, Title, Lead, InfoCard, Quote, Warn, Actions, Hint, Sign, HELP_REPLY_OR_CALL } from "./_shared/layout";
import { relanceEmailContent, type RelanceEmailInput } from "../lib/utils/relance-content";

export type MailRelanceProps = RelanceEmailInput;

/** Relances envoyées depuis la fenêtre « Relancer » (équipe ou notaire) et l'analyse des diagnostics. */
export default function MailRelance(props: MailRelanceProps) {
  const content = relanceEmailContent(props);
  const alert = props.reason === "RENT_CAP";
  return (
    <EmailLayout preview={content.preview} reference={props.address ? ["Dossier", props.address] : undefined}>
      {content.kicker && <Kicker tone={content.kicker.tone}>{content.kicker.text}</Kicker>}
      <Title>{content.title}</Title>
      <Lead>{content.greeting}</Lead>
      {content.paragraphs.map((paragraph, index) => (
        <Lead key={index}>{paragraph}</Lead>
      ))}
      {content.items.map((item, index) => (
        <InfoCard key={`${item}-${index}`} label={item} />
      ))}
      {content.card &&
        (alert ? (
          <Warn title={`${content.card.label} :`}>{content.card.text}</Warn>
        ) : (
          <InfoCard label={content.card.label}>{content.card.text}</InfoCard>
        ))}
      {content.outro && <Lead>{content.outro}</Lead>}
      {content.note && <Quote author="Un mot pour vous">{content.note}</Quote>}
      <Actions primary={{ label: content.button, href: props.actionUrl }} />
      {content.hint && <Hint>{content.hint}</Hint>}
      <Sign closing={content.closing} help={HELP_REPLY_OR_CALL} />
    </EmailLayout>
  );
}

MailRelance.PreviewProps = {
  reason: "OWNER_FORM",
  name: "Thomas",
  address: "12 rue des Lilas, 75011 Paris",
  actionUrl: "https://www.bailnotarie.fr/intakes/exemple",
} satisfies MailRelanceProps;
