"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Loader2, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { IconTile, MicroLabel, QuietAction, Surface, Tone } from "./owner-ui";

/* =========================================================================
   Les choses à faire.

   L'ancien espace client séparait visuellement trois familles qui, pour le
   propriétaire, sont une seule et même chose : « on attend quelque chose de
   moi ». Un message du notaire, un formulaire d'intake à finir, un brouillon
   de bail interrompu — même carte, même geste, même endroit.

   `TodoRow` est la brique commune ; `OwnerTodoCard` reprend exactement les
   props de `OwnerProgressCard` pour rester remplaçable telle quelle.
   ========================================================================= */

export function TodoRow({
  icon,
  tone = "amber",
  kicker,
  title,
  subtitle,
  message,
  actionLabel,
  href,
  onAction,
  onDelete,
  deleting = false,
  className,
}: {
  icon: React.ElementType;
  tone?: Tone;
  kicker?: string;
  title: string;
  subtitle?: string | null;
  message?: string | null;
  actionLabel: string;
  href?: string;
  onAction?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  className?: string;
}) {
  const action = href ? (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-slate-800"
    >
      {actionLabel}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  ) : (
    <button
      type="button"
      onClick={onAction}
      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-slate-800"
    >
      {actionLabel}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className={cn("flex items-start gap-3 p-4", className)}>
      <IconTile icon={icon} tone={tone} />

      <div className="min-w-0 flex-1 space-y-1">
        {kicker && <MicroLabel>{kicker}</MicroLabel>}
        <p className="truncate text-[14px] font-semibold leading-tight tracking-tight text-slate-900">{title}</p>
        {subtitle && <p className="truncate text-[12px] text-slate-500">{subtitle}</p>}
        {message && <p className="text-[12.5px] leading-snug text-slate-500">{message}</p>}

        {/* Sur mobile l'action passe sous le texte : on garde une cible large
            plutôt qu'un bouton comprimé à droite. */}
        <div className="flex items-center gap-2 pt-1.5 sm:hidden">
          {action}
          {onDelete && <DeleteButton onDelete={onDelete} deleting={deleting} />}
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {action}
        {onDelete && <DeleteButton onDelete={onDelete} deleting={deleting} />}
      </div>
    </div>
  );
}

function DeleteButton({ onDelete, deleting }: { onDelete: () => void; deleting: boolean }) {
  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={deleting}
      title="Supprimer ce brouillon"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      <span className="sr-only">Supprimer</span>
    </button>
  );
}

/* ---------- Remplaçante directe de `OwnerProgressCard` -------------------- */

export function OwnerTodoCard({
  propertyLabel,
  tenantName,
  bailTypeLabel,
  message,
  continueHref,
  continueLabel = "Reprendre",
  onDelete,
  deleting = false,
}: {
  propertyLabel: string | null;
  tenantName?: string | null;
  bailTypeLabel?: string | null;
  message: string;
  continueHref: string;
  continueLabel?: string;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const heading = propertyLabel || "Bien non renseigné";
  const details = [tenantName, bailTypeLabel].filter(Boolean).join(" · ") || null;

  return (
    <Surface tone="raised" className="overflow-hidden">
      {/* Un filet ambre en haut suffit à dire « inachevé » : pas besoin de
          teinter toute la carte comme avant. */}
      <div aria-hidden className="h-1 bg-gradient-to-r from-amber-400 to-amber-300" />
      <TodoRow
        icon={ClipboardList}
        tone="amber"
        kicker="Demande en cours"
        title={heading}
        subtitle={details}
        message={message}
        actionLabel={continueLabel}
        href={continueHref}
        onDelete={onDelete}
        deleting={deleting}
      />
    </Surface>
  );
}
