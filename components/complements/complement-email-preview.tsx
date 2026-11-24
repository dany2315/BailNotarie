"use client";

import * as React from "react";
import { COMPLEMENT_MESSAGE_MAX, complementEmailContent, type ComplementEmailItem } from "@/lib/utils/complement";
import {
  EditableEmailText,
  EmailPreviewButton,
  EmailPreviewCard,
  EmailPreviewFrame,
  EmailPreviewHint,
  EmailPreviewSign,
  EmailPreviewText,
  EmailPreviewTitle,
} from "@/components/emails/email-preview-frame";

/**
 * Aperçu de l'e-mail de demande (ou de son rappel), fidèle au modèle envoyé (emails/mail-complement.tsx :
 * mêmes textes, même mise en page). Le message se modifie directement dans l'aperçu.
 */
export function ComplementEmailPreview({
  name,
  recipientName,
  email,
  role,
  address,
  message,
  onMessageChange,
  items,
  reminder = false,
}: {
  name: string;
  /** Nom affiché sur la ligne « À » (avec repli sur l'e-mail ou « Propriétaire »). */
  recipientName?: string;
  email: string | null;
  /** « Propriétaire », « Locataire ». */
  role?: string;
  address: string;
  message: string;
  onMessageChange: (value: string) => void;
  items: ComplementEmailItem[];
  reminder?: boolean;
}) {
  const content = complementEmailContent({ name, address, message, items, reminder });
  const hasDocuments = items.some((item) => item.kind !== "FIELD");

  return (
    <EmailPreviewFrame
      to={email}
      toName={recipientName}
      toRole={role}
      subject={content.subject}
      reference={["Dossier", address]}
      footerNote="Vous recevez cet e-mail car votre dossier de bail notarié est en cours de vérification."
    >
      <EmailPreviewTitle>{content.title}</EmailPreviewTitle>
      <EmailPreviewText>{content.greeting}</EmailPreviewText>
      <div className="mb-[18px] -mt-3">
        <EditableEmailText label="Message de l'e-mail" value={message} onChange={onMessageChange} maxLength={COMPLEMENT_MESSAGE_MAX} />
      </div>
      {content.items.map((item, index) => (
        <EmailPreviewCard key={`${item.label}-${index}`} label={item.label} badge={item.reason}>
          {item.detail}
        </EmailPreviewCard>
      ))}
      <EmailPreviewButton>{content.button}</EmailPreviewButton>
      {hasDocuments && <EmailPreviewHint>Un PDF ou une photo nette prise au téléphone suffit.</EmailPreviewHint>}
      <EmailPreviewSign closing="Merci et à très vite," help="Une question sur une pièce ? Répondez simplement à cet e-mail." />
    </EmailPreviewFrame>
  );
}
