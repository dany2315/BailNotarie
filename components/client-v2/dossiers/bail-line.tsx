"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, MessageSquare, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";
import { BailChatSheet } from "@/components/client/bail-chat-sheet";
import { AddTenantDialog } from "../add-tenant-dialog";
import { useOwnerRuntime } from "../owner-runtime";
import { StepBar, useBailFacts, type OwnerBailCardData } from "../owner-bail-card";
import { MicroLabel } from "../owner-ui";
import { stageOf } from "./model";

/* =========================================================================
   La ligne d'un bail.

   Elle est volontairement presque sans couleur : à l'intérieur d'une fiche de
   bien, c'est le bien qui porte l'identité visuelle, et ses baux forment une
   liste calme en dessous. Un point de deux pixels suffit à dire l'état —
   ambre s'il attend quelque chose de vous, bleu s'il avance, vert s'il est
   terminé. Le reste est du texte.

   Une ligne se lit d'un regard, porte ses actions rapides à droite, et se
   déplie sur place pour montrer l'avancement et les détails. Le dossier
   complet — documents, messages, historique — reste dans le tiroir.
   ========================================================================= */

const DOT_TONE: Record<string, string> = {
  todo: "bg-amber-500",
  running: "bg-[#4373f5]",
  done: "bg-emerald-500",
};

function StatusDot({ status, className }: { status: string; className?: string }) {
  const stage = stageOf(status);
  const terminal = stage === "done" && status !== "SIGNED";
  return (
    <span
      className={cn(
        "mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full",
        terminal ? "bg-slate-300" : DOT_TONE[stage],
        className,
      )}
    />
  );
}

/** Les actions rapides restent grises : elles se voient par leur forme, pas
    par leur couleur, et ne concurrencent pas l'en-tête du bien. */
function QuickButton({
  label,
  icon: Icon,
  accent,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  accent?: "amber" | "blue";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/40",
        accent === "amber"
          ? "hover:bg-amber-50 hover:text-amber-600"
          : accent === "blue"
            ? "hover:bg-[#4373f5]/10 hover:text-[#3563e9]"
            : "hover:bg-slate-100 hover:text-slate-700",
      )}
    >
      <Icon className="h-[17px] w-[17px]" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export type BailLineProps = {
  bail: OwnerBailCardData;
  /** Affiche le bien : utile quand les lignes ne sont pas groupées par bien. */
  showProperty?: boolean;
  onOpenDetail: () => void;
  className?: string;
};

export function BailLine({ bail, showProperty = false, onOpenDetail, className }: BailLineProps) {
  const { demo } = useOwnerRuntime();
  const facts = useBailFacts(bail);
  const [expanded, setExpanded] = React.useState(false);
  const [tenantDialog, setTenantDialog] = React.useState(false);

  const missingTenant = bail.status === "AWAITING_TENANT" && !facts.tenantName;
  const period =
    bail.effectiveDate &&
    `${formatDate(bail.effectiveDate)} → ${facts.endDate ? formatDate(facts.endDate) : "…"}`;

  /* Sur une ligne groupée par bien, le titre est l'état ; sinon c'est le bien,
     et l'état rejoint la ligne de détail. La période part la première sous
     640 px : c'est la donnée la plus longue et la moins consultée en
     déplacement — elle reste dans le dépli. */
  const metaHead = [
    showProperty ? facts.view.title : null,
    missingTenant ? "Locataire à renseigner" : facts.tenantName,
    facts.rent ? `${facts.rent}/mois` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={className}>
      <div className="flex items-start gap-2.5 px-4 py-3">
        <StatusDot status={bail.status} />

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-[13.5px] font-semibold leading-tight tracking-tight text-slate-900">
            {showProperty ? facts.propertyLabel : facts.view.title}
          </span>
          <span className="mt-1 block truncate text-[12px] leading-tight text-slate-500">
            {metaHead}
            {period && <span className="max-sm:hidden"> · {period}</span>}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          {missingTenant && (
            <QuickButton
              label="Ajouter le locataire"
              icon={UserPlus}
              accent="amber"
              onClick={() => setTenantDialog(true)}
            />
          )}
          {facts.notaire &&
            (demo ? (
              <QuickButton
                label="Contacter le notaire"
                icon={MessageSquare}
                accent="blue"
                onClick={() => toast.info("Aperçu — la messagerie du notaire s'ouvre ici")}
              />
            ) : (
              <BailChatSheet
                bailId={bail.id}
                trigger={
                  <button
                    type="button"
                    title="Contacter le notaire"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#4373f5]/10 hover:text-[#3563e9]"
                  >
                    <MessageSquare className="h-[17px] w-[17px]" />
                    <span className="sr-only">Contacter le notaire</span>
                  </button>
                }
              />
            ))}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
        <div className="border-t border-slate-200/70 bg-white px-4 py-4">
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
          <button
            type="button"
            onClick={onOpenDetail}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
          >
            Ouvrir le dossier complet
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
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
  const meta = [showProperty ? "Dossier non finalisé" : null, tenantName, bailTypeLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn("flex items-start gap-2.5 px-4 py-3", className)}>
      <StatusDot status="DRAFT" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold leading-tight tracking-tight text-slate-900">
          {showProperty ? propertyLabel : "Dossier non finalisé"}
        </p>
        <p className="mt-1 truncate text-[12px] leading-tight text-slate-500">
          {meta || "Reprenez là où vous en étiez."}
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
      >
        Reprendre
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
