"use client";

import * as React from "react";
import { PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cadre des aperçus d'e-mail de l'équipe (demande de pièces, relance) : destinataire, objet, puis
 * l'e-mail tel qu'il sera reçu, avec l'en-tête BailNotarie des modèles d'e-mail.
 */
export function EmailPreviewFrame({
  to,
  subject,
  children,
}: {
  to: string | null;
  subject: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-2 gap-y-1 text-[13px]">
        <dt className="text-muted-foreground">À</dt>
        <dd className="truncate font-medium">{to || "Aucune adresse e-mail"}</dd>
        <dt className="text-muted-foreground">Objet</dt>
        <dd className="font-medium">{subject}</dd>
      </dl>

      <div className="overflow-hidden rounded-xl border bg-slate-50 p-2 sm:p-3">
        <div className="overflow-hidden rounded-lg bg-white shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 bg-gradient-to-br from-blue-100 to-indigo-100 px-5 py-4">
            <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-[#1e3a8a] text-[11px] font-bold text-white">
              BN
            </span>
            <span className="text-[17px] font-bold text-[#1e3a8a]">BailNotarie</span>
          </div>
          <div className="flex flex-col px-5 pb-6 pt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Bouton d'action de l'e-mail, tel qu'il apparaît au client. */
export function EmailPreviewButton({ children }: { children: React.ReactNode }) {
  return <span className="mx-auto mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-[14px] font-semibold text-white">{children}</span>;
}

/**
 * Texte modifiable directement dans l'aperçu : il se lit comme le reste de l'e-mail, avec un
 * repère « Modifiable » au survol ou au focus (toujours visible sur téléphone).
 */
export function EditableEmailText({
  value,
  onChange,
  maxLength,
  placeholder,
  label,
  boxed = false,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  label: string;
  /** Encadré gris, comme le message de l'équipe dans les relances. */
  boxed?: boolean;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  // Hauteur ajustée au texte.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <label
      className={cn(
        "group relative block rounded-md transition-colors",
        boxed ? "bg-slate-100 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-200" : "-mx-2 px-2 py-1.5 focus-within:bg-blue-50/60 hover:bg-slate-50",
      )}
    >
      <span className="sr-only">{label}</span>
      <textarea
        ref={ref}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={boxed ? 1 : 2}
        className={cn(
          "block w-full resize-none overflow-hidden bg-transparent leading-[1.55] outline-none placeholder:text-slate-400",
          boxed ? "text-[14px] text-slate-800" : "text-[14.5px] text-slate-600",
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2.5 right-1 inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      >
        <PencilLine className="size-3" />
        Modifiable
      </span>
    </label>
  );
}
