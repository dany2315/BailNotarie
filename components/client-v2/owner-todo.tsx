"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { IconTile, MicroLabel, Tone } from "./owner-ui";

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
  /* Une demande du notaire rattachée à aucun bail n'a nulle part où mener :
     l'ancienne carte n'affichait alors pas de bouton, la ligne non plus. */
  const action = !href && !onAction ? null : href ? (
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
