"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ClipboardList, MessageSquare, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";
import { BailChatSheet } from "@/components/client/bail-chat-sheet";
import { AddTenantDialog } from "../add-tenant-dialog";
import { useOwnerRuntime } from "../owner-runtime";
import { StepBar, useBailFacts, type OwnerBailCardData } from "../owner-bail-card";
import { IconTile, MicroLabel, Pill } from "../owner-ui";

/* =========================================================================
   La ligne d'un bail.

   C'est la brique des quatre compositions : une ligne se lit d'un regard
   (état, locataire, loyer, période), porte ses actions rapides à droite, et
   se déplie sur place pour montrer le reste sans quitter la page. Le détail
   complet — documents, messages, historique — reste dans le tiroir.
   ========================================================================= */

export type BailLineProps = {
  bail: OwnerBailCardData;
  /** Affiche le bien : utile quand les lignes ne sont pas groupées par bien. */
  showProperty?: boolean;
  onOpenDetail: () => void;
  /** Filets de séparation gérés par le conteneur (liste) ou par la ligne. */
  className?: string;
};

function QuickButton({
  label,
  icon: Icon,
  tone = "slate",
  onClick,
  asChild,
}: {
  label: string;
  icon: React.ElementType;
  tone?: "slate" | "blue" | "amber";
  onClick?: () => void;
  asChild?: React.ReactNode;
}) {
  const className = cn(
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/40",
    tone === "blue"
      ? "bg-[#4373f5]/10 text-[#3563e9] hover:bg-[#4373f5]/16"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700 hover:bg-amber-200/80"
        : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
  );
  if (asChild) return <>{asChild}</>;
  return (
    <button type="button" title={label} onClick={onClick} className={className}>
      <Icon className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function BailLine({ bail, showProperty = false, onOpenDetail, className }: BailLineProps) {
  const { demo } = useOwnerRuntime();
  const facts = useBailFacts(bail);
  const [expanded, setExpanded] = React.useState(false);
  const [tenantDialog, setTenantDialog] = React.useState(false);

  const missingTenant = bail.status === "AWAITING_TENANT" && !facts.tenantName;
  const period =
    bail.effectiveDate &&
    `${formatDate(bail.effectiveDate)} → ${facts.endDate ? formatDate(facts.endDate) : "…"}`;

  const quickChat = facts.notaire ? (
    demo ? (
      <QuickButton
        label="Contacter le notaire"
        icon={MessageSquare}
        tone="blue"
        onClick={() => toast.info("Aperçu — la messagerie du notaire s'ouvre ici")}
      />
    ) : (
      <BailChatSheet
        bailId={bail.id}
        trigger={
          <button
            type="button"
            title="Contacter le notaire"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4373f5]/10 text-[#3563e9] transition-colors hover:bg-[#4373f5]/16"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="sr-only">Contacter le notaire</span>
          </button>
        }
      />
    )
  ) : null;

  return (
    <div className={className}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <IconTile icon={facts.view.icon} tone={facts.view.tone} />

        {/* Le corps de la ligne : cliquable pour déplier. */}
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13.5px] font-semibold tracking-tight text-slate-900">
              {showProperty ? facts.propertyLabel : facts.view.title}
            </span>
            {showProperty && <Pill tone={facts.view.tone}>{facts.view.title}</Pill>}
          </span>
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-[12px] text-slate-500">
            <span className="truncate font-medium text-slate-600">
              {missingTenant ? "Locataire à renseigner" : (facts.tenantName ?? "Sans locataire")}
            </span>
            {facts.rent && (
              <>
                <span className="text-slate-300">·</span>
                <span className="tabular-nums">{facts.rent}/mois</span>
              </>
            )}
            {period && (
              <>
                <span className="text-slate-300 max-sm:hidden">·</span>
                <span className="tabular-nums max-sm:hidden">{period}</span>
              </>
            )}
          </span>
        </button>

        {/* Les actions rapides : faisables sans entrer dans le dossier. */}
        <div className="flex shrink-0 items-center gap-1.5">
          {missingTenant && (
            <QuickButton
              label="Ajouter le locataire"
              icon={UserPlus}
              tone="amber"
              onClick={() => setTenantDialog(true)}
            />
          )}
          {quickChat}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={expanded ? "Replier" : "Déplier"}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-300", expanded && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {/* Le dépli : ce qu'il faut de plus, sans changer de page. */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4">
          {facts.view.note && (
            <p className="mb-3.5 text-[12.5px] leading-snug text-slate-500">{facts.view.note}</p>
          )}
          {!facts.terminal && (
            <StepBar
              stepIndex={facts.stepIndex}
              signed={bail.status === "SIGNED"}
              className="mb-4 max-w-[320px]"
            />
          )}
          <div className="flex flex-wrap gap-x-7 gap-y-3">
            <Fact label="Loyer" value={facts.rent ? `${facts.rent} / mois` : null} />
            <Fact label="Bail" value={facts.typeLabel} />
            <Fact label="Période" value={period || null} />
            <Fact label="Locataire" value={facts.tenantName ?? "Non renseigné"} />
            {facts.notaire?.name && <Fact label="Notaire" value={facts.notaire.name} />}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onOpenDetail}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white sm:w-auto"
            >
              Ouvrir le dossier complet
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <AddTenantDialog bailId={bail.id} open={tenantDialog} onOpenChange={setTenantDialog} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <MicroLabel className="mb-0.5">{label}</MicroLabel>
      <p className="truncate text-[13px] font-medium text-slate-800">{value}</p>
    </div>
  );
}

/* ---------- La ligne d'un brouillon --------------------------------------- */

/** Un dossier commencé et pas terminé : une ligne, un geste, rien d'autre. */
export function DraftLine({
  propertyLabel,
  tenantName,
  bailTypeLabel,
  href,
  showProperty = false,
  className,
}: {
  propertyLabel: string;
  tenantName?: string | null;
  bailTypeLabel?: string | null;
  href: string;
  showProperty?: boolean;
  className?: string;
}) {
  const details = [tenantName, bailTypeLabel].filter(Boolean).join(" · ");
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3.5", className)}>
      <IconTile icon={ClipboardList} tone="amber" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13.5px] font-semibold tracking-tight text-slate-900">
            {showProperty ? propertyLabel : "Dossier en cours"}
          </span>
          {/* Sous 640 px, la pastille prenait la place du titre — or
              « Dossier en cours » dit déjà qu'il reste à finaliser. */}
          <span className="hidden shrink-0 sm:inline-flex">
            <Pill tone="amber">À finaliser</Pill>
          </span>
        </p>
        <p className="mt-0.5 truncate text-[12px] text-slate-500">
          {details || "Reprenez là où vous en étiez."}
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-slate-800"
      >
        Reprendre
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
