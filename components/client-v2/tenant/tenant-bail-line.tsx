"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";
import { BailChatSheet } from "@/components/client/bail-chat-sheet";
import { useOwnerRuntime } from "../owner-runtime";
import { IconTile, MicroLabel, Pill } from "../owner-ui";
import { STEPS, tenantBailFacts, type TenantBail } from "./model";

/* =========================================================================
   La ligne d'un bail, côté locataire.

   Même écriture que chez le propriétaire — un point d'état, un titre, une
   ligne de détail, des actions grises — avec deux différences propres à ce
   côté du bail : c'est le propriétaire qui est nommé, et le dossier complet
   est une page à part entière, pas un tiroir.
   ========================================================================= */

const DOT_TONE: Record<string, string> = {
  amber: "bg-amber-500",
  blue: "bg-[#4373f5]",
  violet: "bg-[#4373f5]",
  emerald: "bg-emerald-500",
  slate: "bg-slate-300",
};

function StatusDot({ tone }: { tone: string }) {
  return <span className={cn("mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full", DOT_TONE[tone])} />;
}

/** Trois segments : ils situent le dossier, ils ne l'expliquent pas. */
export function TenantStepBar({
  stepIndex,
  signed,
  className,
}: {
  stepIndex: number;
  signed: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1", className)}>
      {STEPS.map((step, index) => (
        <span
          key={step}
          title={step}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-500",
            signed || stepIndex > index
              ? "bg-emerald-400"
              : stepIndex === index
                ? "bg-[#4373f5]"
                : "bg-slate-200",
          )}
        />
      ))}
    </span>
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

export function TenantBailLine({
  bail,
  className,
}: {
  bail: TenantBail;
  className?: string;
}) {
  const { demo } = useOwnerRuntime();
  const facts = tenantBailFacts(bail);
  const [expanded, setExpanded] = React.useState(false);

  const period =
    bail.effectiveDate &&
    `${formatDate(bail.effectiveDate)} → ${facts.endDate ? formatDate(facts.endDate) : "…"}`;

  const metaHead = [facts.view.title, facts.proprietaire, facts.rent ? `${facts.rent}/mois` : null]
    .filter(Boolean)
    .join(" · ");

  const detailHref = `/client/locataire/baux/${bail.id}`;

  return (
    <div className={className}>
      <div className="flex items-start gap-2.5 px-4 py-3">
        <StatusDot tone={facts.view.tone} />

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-[13.5px] font-semibold leading-tight tracking-tight text-slate-900">
            {facts.propertyLabel}
          </span>
          <span className="mt-1 block truncate text-[12px] leading-tight text-slate-500">
            {metaHead}
            {period && <span className="max-sm:hidden"> · {period}</span>}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          {facts.notaire &&
            (demo ? (
              <button
                type="button"
                title="Contacter le notaire"
                onClick={() => toast.info("Aperçu — la messagerie du notaire s'ouvre ici")}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#4373f5]/10 hover:text-[#3563e9]"
              >
                <MessageSquare className="h-[17px] w-[17px]" />
                <span className="sr-only">Contacter le notaire</span>
              </button>
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

      {expanded && (
        <div className="border-t border-slate-200/70 bg-white px-4 py-4">
          {facts.view.note && (
            <p className="mb-3.5 text-[12.5px] leading-snug text-slate-500">{facts.view.note}</p>
          )}
          {!facts.terminal && (
            <TenantStepBar
              stepIndex={facts.stepIndex}
              signed={bail.status === "SIGNED"}
              className="mb-4 max-w-[320px]"
            />
          )}
          <div className="flex flex-wrap gap-x-7 gap-y-3">
            <Fact label="Bien" value={facts.propertyDescription} />
            <Fact label="Loyer" value={facts.rent ? `${facts.rent} / mois` : null} />
            <Fact label="Nature" value={facts.familyLabel} />
            <Fact label="Bail" value={facts.typeLabel} />
            <Fact label="Période" value={period || null} />
            <Fact label="Propriétaire" value={facts.proprietaire ?? "Non renseigné"} />
            <Fact label="Notaire" value={facts.notaire?.name ?? null} />
          </div>

          {!facts.notaire && (
            <p className="mt-3.5 flex items-center gap-1.5 text-[12px] text-slate-400">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Assignation d&apos;un notaire en cours…
            </p>
          )}

          {demo ? (
            <button
              type="button"
              onClick={() => toast.info("Aperçu — la page du dossier s'ouvre ici")}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              Ouvrir le dossier complet
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              href={detailHref}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              Ouvrir le dossier complet
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Le bail que le propriétaire prépare encore : rien à faire, mais il doit se
    voir, sinon le locataire croit que rien n'avance. */
export function TenantAwaitingLine({ count }: { count: number }) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3.5">
      <IconTile icon={Clock} tone="slate" size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[13.5px] font-semibold leading-tight text-slate-900">
          {count > 1 ? `${count} dossiers en attente` : "Dossier en attente"}
          <Pill tone="slate">Côté propriétaire</Pill>
        </p>
        <p className="mt-1 text-[12px] leading-snug text-slate-500">
          Votre propriétaire prépare votre bail. Vous recevrez un lien pour compléter votre
          dossier dès qu&apos;il sera prêt.
        </p>
      </div>
    </div>
  );
}
