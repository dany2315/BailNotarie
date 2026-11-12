"use client";

import * as React from "react";
import { COMPLEMENT_MESSAGE_MAX, complementEmailContent, type ComplementEmailItem } from "@/lib/utils/complement";
import { EditableEmailText, EmailPreviewButton, EmailPreviewFrame } from "@/components/emails/email-preview-frame";

/**
 * Aperçu de l'e-mail de demande, fidèle au modèle envoyé (mêmes textes, même mise en page).
 * Le message se modifie directement dans l'aperçu.
 */
export function ComplementEmailPreview({
  name,
  recipientName,
  email,
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
  address: string;
  message: string;
  onMessageChange: (value: string) => void;
  items: ComplementEmailItem[];
  reminder?: boolean;
}) {
  const content = complementEmailContent({ name, address, message, items, reminder });

  return (
    <EmailPreviewFrame to={email} toName={recipientName} subject={content.subject}>
      <p className="text-[17px] font-bold text-slate-800">{content.greeting}</p>
      <p className="mt-0.5 text-[12.5px] text-slate-500">{content.context}</p>

      <div className="mt-4">
        <EditableEmailText label="Message de l'e-mail" value={message} onChange={onMessageChange} maxLength={COMPLEMENT_MESSAGE_MAX} />
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {content.items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="rounded-[10px] border border-slate-200 px-3.5 py-3">
            <p className="text-[14px] font-bold leading-snug text-slate-900">{item.label}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{item.detail}</p>
          </li>
        ))}
      </ul>

      <EmailPreviewButton>{content.button}</EmailPreviewButton>
      <p className="mt-4 text-center text-[12.5px] text-slate-500">{content.outro}</p>
    </EmailPreviewFrame>
  );
}
