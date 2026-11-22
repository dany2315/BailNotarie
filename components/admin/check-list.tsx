"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifyBullet } from "@/components/admin/verify-buttons";
import { ClaimTag, useFiche } from "@/components/admin/fiche/fiche-context";

/**
 * Briques de la fiche de vérification : un bloc (« Le bail », « Propriétaire »…)
 * contient des points de contrôle, chacun avec son état, ses données et ses
 * actions. Composants de présentation, utilisables côté serveur.
 */

/** ok : renseigné / présent · missing : manquant · todo : à contrôler par nous. */
export type PointState = "ok" | "missing" | "todo" | "info";

export function PointIcon({ state }: { state: PointState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-bold",
        state === "ok" && "bg-green-100 text-green-800",
        state === "missing" && "bg-red-100 text-red-800",
        state === "todo" && "border-2 border-slate-300 bg-background",
        // Information affichée seulement (téléphone, e-mail, adresse) : rien à valider.
        state === "info" && "after:size-1.5 after:rounded-full after:bg-slate-300 after:content-['']",
      )}
    >
      {state === "ok" ? <Check className="size-3.5" strokeWidth={3} /> : state === "missing" ? "!" : null}
    </span>
  );
}

export function CheckPoint({
  state,
  label,
  children,
  note,
  actions,
  actionsBelow = false,
  verify,
  tags,
  claimKeys,
  foldable = false,
}: {
  state: PointState;
  label: ReactNode;
  /** Données du point (une ligne par élément, retours à la ligne conservés). */
  children?: ReactNode;
  /** Ce qui manque, en rouge sous les données. */
  note?: ReactNode;
  actions?: ReactNode;
  /** Plusieurs actions : sous le contenu, pour lui laisser toute la largeur. */
  actionsBelow?: boolean;
  /** Point à valider par l'équipe : la pastille de gauche valide ou retire la validation. */
  verify?: { bailId: string; pointKey: string; verified: boolean; locked?: boolean };
  /* Fiche dossier (présentation « une page ») : sans effet ailleurs. */
  /** Contrôles du logiciel en pastilles courtes, sous la valeur. */
  tags?: ReactNode;
  /** Clés de la fenêtre « Demander » : la ligne dit si elle est déjà réclamée ou reçue. */
  claimKeys?: string[];
  /** Contrôle fait par le logiciel : une ligne, le détail se déplie. */
  foldable?: boolean;
}) {
  const fiche = useFiche();
  const [open, setOpen] = React.useState(false);
  if (fiche) {
    const bullet = verify && state !== "missing" ? <VerifyBullet {...verify} /> : <PointIcon state={state} />;
    const showBody = !foldable || open;
    return (
      <li className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 gap-y-1.5 px-5 py-3.5 @2xl:grid-cols-[22px_150px_minmax(0,1fr)_auto]">
        {bullet}
        <span className="pt-0.5 text-[14px] font-semibold leading-snug">{label}</span>
        <div className="col-start-2 flex min-w-0 flex-col gap-1.5 @2xl:col-start-3 @2xl:pt-0.5">
          {showBody && children && <div className="whitespace-pre-line break-words text-[14px] leading-relaxed text-foreground/85">{children}</div>}
          {note && <span className="whitespace-pre-line text-[13px] font-semibold text-red-700">{note}</span>}
          {(tags || claimKeys) && (
            <div className="flex flex-wrap gap-1.5">
              {tags}
              <ClaimTag keys={claimKeys} />
            </div>
          )}
          {foldable && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-primary hover:underline"
            >
              {open ? "Masquer le détail" : "Voir le détail"}
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            </button>
          )}
          {actionsBelow && actions && showBody && <div className="flex flex-wrap items-start gap-2 pt-1">{actions}</div>}
        </div>
        {!actionsBelow && actions && (
          <div className="col-start-2 flex flex-wrap items-start gap-2 @2xl:col-start-4 @2xl:justify-end">{actions}</div>
        )}
      </li>
    );
  }
  return (
    <li
      className={cn(
        // Actions à droite seulement si le bloc est assez large (requête de conteneur, pas d'écran).
        "grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 gap-y-2.5 px-5 py-3.5",
        !actionsBelow && "@xl:grid-cols-[22px_minmax(0,1fr)_auto]",
      )}
    >
      {verify && state !== "missing" ? <VerifyBullet {...verify} /> : <PointIcon state={state} />}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[14.5px] font-semibold leading-snug">{label}</span>
        {children && <div className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/80">{children}</div>}
        {note && <span className="whitespace-pre-line text-[13px] font-semibold text-red-700">{note}</span>}
      </div>
      {actions && (
        <div
          className={cn(
            "col-span-2 flex flex-wrap items-start gap-2 [&>*]:flex-1 @xl:[&>*]:flex-none",
            actionsBelow ? "@xl:col-start-2 @xl:col-span-1" : "@xl:col-span-1 @xl:justify-end",
          )}
        >
          {actions}
        </div>
      )}
    </li>
  );
}

export function CheckList({ children }: { children: ReactNode }) {
  return <ul className="@container flex flex-col divide-y">{children}</ul>;
}

export type ChipTone = "ok" | "missing" | "todo" | "neutral";

export function StateChip({ tone, children, className }: { tone: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center whitespace-nowrap rounded-md px-2.5 text-[12.5px] font-semibold",
        tone === "ok" && "bg-green-100 text-green-800",
        tone === "missing" && "bg-red-100 text-red-800",
        tone === "todo" && "bg-slate-200 text-slate-700",
        tone === "neutral" && "bg-slate-100 text-slate-600",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CheckSection({
  id,
  title,
  subtitle,
  headerRight,
  children,
  footer,
  number,
}: {
  id?: string;
  /** Fiche dossier : numéro de la section (dans l'ordre de l'acte). */
  number?: number;
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    // scroll-mt : les ancres du sommaire ne passent pas sous l'en-tête collant.
    <section id={id} className="scroll-mt-64 overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {number != null && (
            <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[13px] font-bold text-muted-foreground">
              {number}
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[17px] font-semibold leading-snug">{title}</h2>
            {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {headerRight && <div className="flex flex-wrap items-center gap-2">{headerRight}</div>}
      </header>
      {children}
      {footer && <div className="border-t px-5 py-4">{footer}</div>}
    </section>
  );
}
