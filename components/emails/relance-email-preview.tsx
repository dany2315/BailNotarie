"use client";

import * as React from "react";
import { HELP_REPLY_OR_CALL } from "@/emails/_shared/contact";
import { RELANCE_BODY_MAX, type relanceEmailContent } from "@/lib/utils/relance-content";
import {
  EditableEmailText,
  EmailPreviewButton,
  EmailPreviewCard,
  EmailPreviewFrame,
  EmailPreviewHint,
  EmailPreviewKicker,
  EmailPreviewSign,
  EmailPreviewText,
  EmailPreviewTitle,
  EmailPreviewWarn,
} from "@/components/emails/email-preview-frame";

/**
 * Aperçu d'une relance, dans le même ordre que emails/mail-relance.tsx : titre, salutation, texte
 * (modifiable), éléments listés, encadré, mot ajouté (modifiable), bouton, aide, signature.
 */
export function RelanceEmailPreview({
  content,
  reason,
  address,
  to,
  toName,
  toRole,
  body,
  onBodyChange,
  note,
  onNoteChange,
  noteLabel,
  notePlaceholder,
  noteMax,
}: {
  content: ReturnType<typeof relanceEmailContent>;
  reason: string;
  address: string;
  to: string | null;
  toName?: string | null;
  toRole?: string;
  /** Texte modifié ; null : le texte prévu. */
  body: string | null;
  onBodyChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  noteLabel: string;
  notePlaceholder: string;
  noteMax: number;
}) {
  return (
    <EmailPreviewFrame to={to} toName={toName} toRole={toRole} subject={content.subject} reference={address ? ["Dossier", address] : undefined}>
      {content.kicker && <EmailPreviewKicker tone={content.kicker.tone}>{content.kicker.text}</EmailPreviewKicker>}
      <EmailPreviewTitle>{content.title}</EmailPreviewTitle>
      <EmailPreviewText>{content.greeting}</EmailPreviewText>
      <div className="mb-[18px] -mt-3">
        <EditableEmailText label="Texte de l'e-mail" value={body ?? content.paragraphs.join("\n\n")} onChange={onBodyChange} maxLength={RELANCE_BODY_MAX} />
      </div>
      {content.items.map((item, index) => (
        <EmailPreviewCard key={`${item}-${index}`} label={item} />
      ))}
      {content.card &&
        (reason === "RENT_CAP" ? (
          <EmailPreviewWarn title={`${content.card.label} :`}>{content.card.text}</EmailPreviewWarn>
        ) : (
          <EmailPreviewCard label={content.card.label}>{content.card.text}</EmailPreviewCard>
        ))}
      {content.outro && <EmailPreviewText>{content.outro}</EmailPreviewText>}
      <EditableEmailText boxed caption="Un mot pour vous" label={noteLabel} placeholder={notePlaceholder} value={note} onChange={onNoteChange} maxLength={noteMax} />
      <EmailPreviewButton>{content.button}</EmailPreviewButton>
      {content.hint && <EmailPreviewHint>{content.hint}</EmailPreviewHint>}
      <EmailPreviewSign closing={content.closing} help={HELP_REPLY_OR_CALL} />
    </EmailPreviewFrame>
  );
}
