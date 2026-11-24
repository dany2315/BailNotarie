"use client";

import * as React from "react";
import { PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { PHONE } from "@/emails/_shared/contact";

/**
 * Aperçus d'e-mail de l'équipe et du notaire (demande de pièces, relances) : destinataire, objet, puis
 * l'e-mail tel qu'il sera reçu. Les blocs ci-dessous reprennent le dessin de emails/_shared/layout.tsx
 * (en-tête blanc avec la référence du dossier, titre, encadrés, bouton, signature, pied de page) :
 * à garder alignés quand la mise en page des e-mails change.
 */
export function EmailPreviewFrame({
  to,
  toName,
  toRole,
  subject,
  reference,
  footerNote,
  children,
}: {
  to: string | null;
  /** Qui reçoit l'e-mail : « SCI Les Tilleuls », « Camille Durand »… */
  toName?: string | null;
  /** « Propriétaire », « Locataire ». */
  toRole?: string;
  subject: string;
  /** Lignes en haut à droite de l'e-mail : « Dossier », l'adresse… */
  reference?: string[];
  /** Pourquoi la personne reçoit cet e-mail (pied de page). */
  footerNote?: string;
  children: React.ReactNode;
}) {
  // Sans nom connu, le nom affiché serait l'e-mail lui-même : on montre alors le rôle.
  const name = toName && toName !== to ? toName : toRole;
  const role = name !== toRole ? toRole : undefined;
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-2 gap-y-1 text-[13px]">
        <dt className="text-muted-foreground">À</dt>
        <dd className="min-w-0">
          {name ? (
            <>
              <span className="block truncate">
                <span className="font-semibold">{name}</span>
                {role && <span className="text-muted-foreground"> · {role}</span>}
              </span>
              <span className={cn("block truncate", to ? "text-muted-foreground" : "font-medium text-red-700")}>{to || "Aucune adresse e-mail"}</span>
            </>
          ) : (
            <span className="block truncate font-medium">{to || "Aucune adresse e-mail"}</span>
          )}
        </dd>
        <dt className="text-muted-foreground">Objet</dt>
        <dd className="font-medium">{subject}</dd>
      </dl>

      <div className="overflow-hidden rounded-xl bg-slate-100 p-2 sm:p-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white font-[Arial,Helvetica,sans-serif]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
            <span className="flex shrink-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logoSans.png" alt="" width={30} height={30} className="size-[30px] rounded-full" />
              <span className="text-[18px] font-bold text-[#1e3a8a]">BailNotarie</span>
            </span>
            {reference && reference.length > 0 && (
              <span className="min-w-0 text-right text-[12px] leading-[17px] text-slate-500">
                {reference.map((line, i) => (
                  <span key={i} className="block truncate">
                    {line}
                  </span>
                ))}
              </span>
            )}
          </div>
          <div className="flex flex-col px-5 py-6 sm:px-6">{children}</div>
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5 text-[12px] leading-[19px] text-slate-500 sm:px-6">
            BailNotarie · {PHONE} · www.bailnotarie.fr
            {footerNote && <span className="block">{footerNote}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Petit titre au-dessus du titre (« À régler avant la signature »…). */
export function EmailPreviewKicker({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "amber" }) {
  return (
    <p className={cn("mb-2.5 text-[13px] font-bold uppercase tracking-[0.05em]", tone === "amber" ? "text-amber-700" : "text-blue-700")}>{children}</p>
  );
}

export function EmailPreviewTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[22px] font-bold leading-[28px] text-slate-900">{children}</p>;
}

/** Paragraphe de l'e-mail. */
export function EmailPreviewText({ children }: { children: React.ReactNode }) {
  return <p className="mb-[18px] whitespace-pre-line text-[15px] leading-6 text-slate-700">{children}</p>;
}

/** Encadré : un intitulé (avec une pastille éventuelle) et une explication. */
export function EmailPreviewCard({ label, badge, children }: { label: React.ReactNode; badge?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
      <p className="text-[14px] font-bold leading-[21px] text-slate-900">
        {label}
        {badge && <span className="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-[12px] font-bold text-amber-700">{badge}</span>}
      </p>
      {children && <p className="mt-1 whitespace-pre-line text-[14px] leading-[21px] text-slate-600">{children}</p>}
    </div>
  );
}

/** Encadré d'alerte (orange). */
export function EmailPreviewWarn({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mb-[18px] rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-[14px] leading-[21px] text-orange-900">
      {title && <b>{title} </b>}
      {children}
    </div>
  );
}

/** Bouton d'action de l'e-mail, tel qu'il apparaît au client. */
export function EmailPreviewButton({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 mt-5 inline-flex self-start rounded-[10px] bg-blue-700 px-5 py-3 text-[15px] font-bold text-white">{children}</span>
  );
}

/** Ligne d'aide sous le bouton. */
export function EmailPreviewHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[13px] leading-[19px] text-slate-500">{children}</p>;
}

/** Signature : formule, équipe et une ligne d'aide facultative. */
export function EmailPreviewSign({ closing = "À très vite,", team = "L'équipe BailNotarie", help }: { closing?: string; team?: string; help?: React.ReactNode }) {
  return (
    <p className="mt-6 text-[14px] leading-[22px] text-slate-600">
      {closing}
      <br />
      <b className="text-slate-900">{team}</b>
      {help && (
        <>
          <br />
          {help}
        </>
      )}
    </p>
  );
}

/**
 * Texte modifiable directement dans l'aperçu : il se lit comme le reste de l'e-mail, avec un
 * repère « Modifiable » au survol ou au focus (toujours visible sur téléphone).
 * `boxed` : encadré gris « Un mot pour vous », comme le mot ajouté dans les relances.
 */
export function EditableEmailText({
  value,
  onChange,
  maxLength,
  placeholder,
  label,
  boxed = false,
  caption,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  label: string;
  /** Encadré gris, comme le message de l'équipe dans les relances. */
  boxed?: boolean;
  /** Petit intitulé au-dessus du texte encadré (« Un mot pour vous »). */
  caption?: string;
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
        boxed ? "rounded-xl bg-slate-50 px-4 py-3.5 focus-within:ring-2 focus-within:ring-blue-200" : "-mx-2 px-2 py-1.5 focus-within:bg-blue-50/60 hover:bg-slate-50",
      )}
    >
      <span className="sr-only">{label}</span>
      {boxed && caption && <span aria-hidden className="mb-1 block text-[12px] text-slate-500">{caption}</span>}
      <textarea
        ref={ref}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={boxed ? 1 : 2}
        className={cn(
          "block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-slate-400",
          boxed ? "text-[15px] italic leading-[23px] text-slate-700" : "text-[15px] leading-6 text-slate-700",
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2.5 right-1 inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold not-italic text-blue-700 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      >
        <PencilLine className="size-3" />
        Modifiable
      </span>
    </label>
  );
}
