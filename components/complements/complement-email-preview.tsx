"use client";

import * as React from "react";
import { PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPLEMENT_MESSAGE_MAX, complementEmailContent, type ComplementEmailItem } from "@/lib/utils/complement";

/**
 * Aperçu de l'e-mail de demande, fidèle au modèle envoyé (mêmes textes, même mise en page).
 * Le message se modifie directement dans l'aperçu.
 */
export function ComplementEmailPreview({
  name,
  email,
  address,
  message,
  onMessageChange,
  items,
  reminder = false,
}: {
  name: string;
  email: string | null;
  address: string;
  message: string;
  onMessageChange: (value: string) => void;
  items: ComplementEmailItem[];
  reminder?: boolean;
}) {
  const content = complementEmailContent({ name, address, message, items, reminder });
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Hauteur ajustée au texte : le message se lit comme dans l'e-mail.
  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [message]);

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-2 gap-y-1 text-[13px]">
        <dt className="text-muted-foreground">À</dt>
        <dd className="truncate font-medium">{email || "Aucune adresse e-mail"}</dd>
        <dt className="text-muted-foreground">Objet</dt>
        <dd className="font-medium">{content.subject}</dd>
      </dl>

      <div className="overflow-hidden rounded-xl border bg-slate-50 p-2 sm:p-3">
        <div className="overflow-hidden rounded-lg bg-white shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 bg-gradient-to-br from-blue-100 to-indigo-100 px-5 py-4">
            <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-[#1e3a8a] text-[11px] font-bold text-white">
              BN
            </span>
            <span className="text-[17px] font-bold text-[#1e3a8a]">BailNotarie</span>
          </div>

          <div className="flex flex-col px-5 pb-6 pt-6">
            <p className="text-[17px] font-bold text-slate-800">{content.greeting}</p>
            <p className="mt-0.5 text-[12.5px] text-slate-500">{content.context}</p>

            <label className="group relative -mx-2 mt-4 block rounded-md px-2 py-1.5 transition-colors focus-within:bg-blue-50/60 hover:bg-slate-50">
              <span className="sr-only">Message de l&apos;e-mail</span>
              <textarea
                ref={textareaRef}
                value={message}
                maxLength={COMPLEMENT_MESSAGE_MAX}
                onChange={(event) => onMessageChange(event.target.value)}
                rows={2}
                className="block w-full resize-none overflow-hidden bg-transparent text-[14.5px] leading-[1.55] text-slate-600 outline-none"
              />
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -top-2.5 right-1 inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 shadow-sm transition-opacity",
                  "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                )}
              >
                <PencilLine className="size-3" />
                Modifiable
              </span>
            </label>

            <ul className="mt-4 flex flex-col gap-2">
              {content.items.map((item, index) => (
                <li key={`${item.label}-${index}`} className="rounded-[10px] border border-slate-200 px-3.5 py-3">
                  <p className="text-[14px] font-bold leading-snug text-slate-900">{item.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{item.detail}</p>
                </li>
              ))}
            </ul>

            <span className="mx-auto mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-[14px] font-semibold text-white">{content.button}</span>
            <p className="mt-4 text-center text-[12.5px] text-slate-500">{content.outro}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
