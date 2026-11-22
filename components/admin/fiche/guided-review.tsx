"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Play, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ComplementComposer } from "@/components/complements/complement-composer";
import { CheckList } from "@/components/admin/check-list";
import { ComplementItemReview } from "@/components/complements/complement-requests-panel";
import type { StaffComplementItem } from "@/lib/actions/complement-requests";
import { REASON_LABELS, type ComplementReasonValue } from "@/lib/utils/complement";
import { cn } from "@/lib/utils";
import { RemindRequestButton, Since } from "./fiche-context";
import { PieceSheet } from "./piece-sheet";
import type { PieceInfo } from "./piece-cards";
import type { PieceGroup } from "./pieces-section";

/** Lance le parcours depuis n'importe où dans la fiche (carte « À faire avant l'envoi »). */
export const START_REVIEW_EVENT = "fiche:start-review";

export function StartReviewButton() {
  return (
    <Button type="button" size="sm" className="h-9 gap-1.5" onClick={() => window.dispatchEvent(new Event(START_REVIEW_EVENT))}>
      <Play className="size-3.5" />
      Commencer la vérification
    </Button>
  );
}

export interface GuidedItem {
  info: PieceInfo;
  group: PieceGroup;
}

/** Une demande en attente du client, à relancer. */
export interface RelanceInfo {
  requestId: string;
  target: "OWNER" | "TENANT";
  email: string;
  createdAt: string;
  lastSentAt: string;
  sentCount: number;
  what: string;
  labels: string[];
}

/** Une information envoyée par le client en réponse à une demande de l'équipe, à accepter ou refuser. */
export interface AnswerInfo {
  target: "OWNER" | "TENANT";
  item: StaffComplementItem;
}

/** Une chose mise de côté pendant la vérification, demandée au client à la fin. */
export interface BasketEntry {
  key: string;
  target: "OWNER" | "TENANT";
  label: string;
  reason: ComplementReasonValue;
  note: string;
}

type Step = { kind: "piece"; key: string } | { kind: "answers" } | { kind: "legal" } | { kind: "relances" } | { kind: "recap" };

const WHO = { OWNER: "au propriétaire", TENANT: "au locataire" } as const;

/**
 * « Commencer la vérification » : un seul parcours, dans l'ordre où l'équipe travaille.
 * 1. Les pièces (réponses reçues d'abord), la pièce à côté de ce qu'il faut vérifier ;
 *    « À redemander » met la pièce de côté.
 * 2. Les contrôles légaux que le logiciel ne tranche pas seul.
 * 3. Les relances à faire.
 * 4. Le récapitulatif : ce qui est mis de côté et les pièces manquantes partent en une demande par
 *    personne (fenêtre « Demander » habituelle, relue avant l'envoi), puis la transmission au notaire.
 * Mêmes validations et mêmes demandes que la fiche : rien de nouveau n'est enregistré.
 */
export function GuidedReview({
  items,
  pieceKeys,
  basket,
  setBasket,
  legalChecks,
  legalPending,
  answers,
  relances,
  remind,
  sendButton,
  finish,
  diagnostics,
  bailId,
  onExit,
}: {
  items: GuidedItem[];
  /** Pièces du parcours, figées au départ (une pièce validée reste à sa place). */
  pieceKeys: string[];
  basket: BasketEntry[];
  setBasket: React.Dispatch<React.SetStateAction<BasketEntry[]>>;
  legalChecks?: React.ReactNode;
  legalPending: number;
  answers: AnswerInfo[];
  relances: RelanceInfo[];
  remind?: React.ReactNode;
  sendButton?: React.ReactNode;
  /** Dernier bloc du récapitulatif (par défaut : la transmission au notaire). */
  finish?: { title: string; hint: string };
  diagnostics?: React.ReactNode;
  bailId: string;
  onExit: () => void;
}) {
  const steps: Step[] = React.useMemo(
    () => [
      ...pieceKeys.map((key) => ({ kind: "piece" as const, key })),
      ...(answers.length > 0 ? [{ kind: "answers" as const }] : []),
      ...(legalPending > 0 && legalChecks ? [{ kind: "legal" as const }] : []),
      ...(relances.length > 0 || remind ? [{ kind: "relances" as const }] : []),
      { kind: "recap" as const },
    ],
    // Le parcours est figé à l'ouverture : valider une étape ne la fait pas disparaître.
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [index, setIndex] = React.useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const total = steps.length;
  const prev = index > 0 ? () => setIndex(index - 1) : undefined;
  const next = index < total - 1 ? () => setIndex(index + 1) : undefined;
  const label = `Vérification · étape ${index + 1} sur ${total}`;

  if (step.kind === "piece") {
    const item = items.find((candidate) => candidate.info.row.key === step.key);
    if (item) {
      const key = item.info.requestKey;
      const entry = key ? basket.find((b) => b.key === key) ?? null : null;
      return (
        <PieceSheet
          info={item.info}
          index={index}
          total={total}
          locked={!!item.group.verification?.locked}
          editable={item.group.editable}
          complement={item.group.complement}
          bailId={item.group.verification?.bailId ?? item.group.complement?.bailId ?? bailId}
          onClose={onExit}
          onPrev={prev}
          onNext={next}
          extra={item.info.row.kind === "DIAGNOSTICS" ? diagnostics : undefined}
          guided={{
            stepLabel: label,
            inBasket: entry ? { reason: entry.reason, note: entry.note } : null,
            addToBasket: (reason, note) => {
              if (!key || !item.group.complement) return;
              const target = item.group.complement.target;
              setBasket((current) => [...current.filter((b) => b.key !== key), { key, target, label: `${item.info.label}${item.info.owner ? ` · ${item.info.owner}` : ""}`, reason, note }]);
            },
            removeFromBasket: () => key && setBasket((current) => current.filter((b) => b.key !== key)),
          }}
        />
      );
    }
  }

  return (
    <StepSheet
      label={label}
      index={index}
      total={total}
      title={step.kind === "answers" ? "Réponses du client" : step.kind === "legal" ? "Contrôles légaux" : step.kind === "relances" ? "Relances" : step.kind === "piece" ? "Pièce déjà traitée" : "Récapitulatif"}
      onClose={onExit}
      onPrev={prev}
      onNext={next}
      nextLabel={index === total - 2 ? "Voir le récapitulatif" : "Suivant"}
    >
      {step.kind === "piece" && <p className="text-[14px] text-muted-foreground">Cette pièce a changé depuis le début de la vérification. Passez à la suite.</p>}
      {step.kind === "answers" && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-muted-foreground">
            Les informations corrigées par le client. Acceptez-les pour les écrire dans le dossier, ou redemandez.
          </p>
          {answers.map(({ target, item }) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3.5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Réponse {target === "OWNER" ? "du propriétaire" : "du locataire"}
              </p>
              <ComplementItemReview item={item} canArchive />
            </div>
          ))}
        </div>
      )}
      {step.kind === "legal" && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-muted-foreground">
            Ce que le logiciel ne peut pas trancher seul. Validez ce qui est conforme (rond à gauche), corrigez le reste avec les boutons de chaque ligne.
          </p>
          <div className="overflow-hidden rounded-xl border bg-card">
            <CheckList>{legalChecks}</CheckList>
          </div>
        </div>
      )}
      {step.kind === "relances" && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-muted-foreground">Ce que le client n&apos;a pas encore envoyé. Relancez si besoin, puis continuez.</p>
          {remind && <div className="rounded-xl border bg-card p-3.5">{remind}</div>}
          {relances.map((relance) => (
            <div key={relance.requestId} className="flex flex-col gap-2 rounded-xl border bg-card p-3.5">
              <p className="text-[14.5px] font-semibold">
                {relance.what} {WHO[relance.target]}
              </p>
              <p className="text-[13px] text-muted-foreground">
                envoyée <Since iso={relance.createdAt} />
                {relance.sentCount > 1 ? (
                  <>
                    {` · relancée ${relance.sentCount - 1} fois, dernière `}
                    <Since iso={relance.lastSentAt} />
                  </>
                ) : null}
              </p>
              <ul className="flex flex-col gap-0.5 text-[13.5px]">
                {relance.labels.map((itemLabel) => (
                  <li key={itemLabel}>· {itemLabel}</li>
                ))}
              </ul>
              <RemindRequestButton requestId={relance.requestId} email={relance.email} className="w-fit" />
            </div>
          ))}
        </div>
      )}
      {step.kind === "recap" && <Recap items={items} basket={basket} setBasket={setBasket} sendButton={sendButton} finish={finish} />}
    </StepSheet>
  );
}

function StepSheet({
  label,
  index,
  total,
  title,
  children,
  onClose,
  onPrev,
  onNext,
  nextLabel,
}: {
  label: string;
  index: number;
  total: number;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel: string;
}) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(760px,100vw)]">
        <div className="flex shrink-0 flex-col gap-2 border-b bg-card px-6 pb-4 pt-5 pr-12">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11.5px] font-bold tabular-nums text-white">
              {index + 1} / {total}
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{label}</span>
          </div>
          <SheetTitle className="text-[24px] font-bold leading-tight tracking-tight">{title}</SheetTitle>
          <SheetDescription className="sr-only">{label}</SheetDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex shrink-0 justify-between gap-2 border-t bg-card px-6 py-3">
          <Button type="button" variant="outline" className="h-10 gap-1.5" disabled={!onPrev} onClick={onPrev}>
            <ArrowLeft className="size-4" />
            Précédente
          </Button>
          {onNext ? (
            <Button type="button" className="h-10 gap-1.5" onClick={onNext}>
              {nextLabel}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" variant="outline" className="h-10" onClick={onClose}>
              Terminer
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Fin du parcours : ce qui part au client, en une demande par personne, puis la transmission. */
function Recap({
  items,
  basket,
  setBasket,
  sendButton,
  finish = { title: "Transmettre au notaire", hint: "Le bouton s'active quand tout est vérifié et qu'il ne manque rien." },
}: {
  items: GuidedItem[];
  basket: BasketEntry[];
  setBasket: React.Dispatch<React.SetStateAction<BasketEntry[]>>;
  sendButton?: React.ReactNode;
  finish?: { title: string; hint: string };
}) {
  const verified = items.filter((i) => i.info.state === "ok").length;
  const toCheck = items.filter(
    (i) => (i.info.state === "todo" || i.info.state === "received") && !basket.some((b) => b.key === i.info.requestKey),
  ).length;
  // Pièces manquantes pas encore demandées : proposées dans la même demande (cochées d'avance).
  const missing = items.filter(
    (i) => i.info.state === "missing" && i.info.requestKey && i.group.complement && !basket.some((b) => b.key === i.info.requestKey),
  );
  const [withMissing, setWithMissing] = React.useState<Set<string>>(() => new Set(missing.map((m) => m.info.requestKey!)));
  const [composer, setComposer] = React.useState<"OWNER" | "TENANT" | null>(null);
  const bailId = items.find((i) => i.group.complement)?.group.complement?.bailId;
  // Personnes à qui on peut écrire (propriétaire, locataire s'il a son espace) : on peut leur demander des
  // informations même si aucune pièce n'a été mise de côté.
  const targets = (["OWNER", "TENANT"] as const).filter((target) => items.some((i) => i.group.complement?.target === target));

  const entriesFor = (target: "OWNER" | "TENANT") => [
    ...basket.filter((b) => b.target === target),
    ...missing
      .filter((m) => m.group.complement?.target === target && withMissing.has(m.info.requestKey!))
      .map((m) => ({ key: m.info.requestKey!, target, label: `${m.info.label}${m.info.owner ? ` · ${m.info.owner}` : ""}`, reason: "MISSING" as const, note: "" })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-[13px] font-semibold text-green-800">
          <Check className="size-3.5" strokeWidth={3} />
          {verified} pièce{verified > 1 ? "s" : ""} vérifiée{verified > 1 ? "s" : ""}
        </span>
        {basket.length > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-[13px] font-semibold text-red-800">
            {basket.length} à redemander
          </span>
        )}
        {missing.length > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[13px] font-semibold text-amber-900">
            {missing.length} manquante{missing.length > 1 ? "s" : ""}
          </span>
        )}
        {toCheck > 0 && (
          <span className="rounded-full border px-3 py-1 text-[13px] font-semibold text-muted-foreground">{toCheck} encore à vérifier</span>
        )}
      </div>

      {targets.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[17px] font-semibold">Faut-il demander quelque chose au client ?</h3>
          <p className="text-[13.5px] text-muted-foreground">
            Des pièces, ou des informations à compléter ou corriger. Si rien ne manque, passez directement à la transmission.
          </p>
        </div>
      )}

      {targets.map((target) => {
        const entries = entriesFor(target);
        const own = basket.filter((b) => b.target === target);
        const missingFor = missing.filter((m) => m.group.complement?.target === target);
        return (
          <section key={target} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <h3 className="text-[16px] font-semibold">{own.length + missingFor.length > 0 ? `À demander ${WHO[target]}` : `Au ${target === "OWNER" ? "propriétaire" : "locataire"}`}</h3>
            {own.length === 0 && missingFor.length === 0 && (
              <p className="text-[13.5px] text-muted-foreground">Aucune pièce mise de côté. Vous pouvez quand même lui demander une information.</p>
            )}
            {own.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {own.map((entry) => (
                  <li key={entry.key} className="flex items-center justify-between gap-2 text-[14px]">
                    <span className="min-w-0">
                      <span className="font-medium">{entry.label}</span>
                      <span className="text-muted-foreground"> · {REASON_LABELS[entry.reason].toLowerCase()}</span>
                      {entry.note ? <span className="text-muted-foreground"> · « {entry.note} »</span> : null}
                    </span>
                    <button
                      type="button"
                      aria-label={`Retirer ${entry.label}`}
                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                      onClick={() => setBasket((current) => current.filter((b) => b.key !== entry.key))}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {missingFor.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Pièces manquantes</p>
                {missingFor.map((m) => (
                  <label key={m.info.row.key} className="flex cursor-pointer items-center gap-2 text-[14px]">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={withMissing.has(m.info.requestKey!)}
                      onChange={(event) =>
                        setWithMissing((current) => {
                          const nextSet = new Set(current);
                          if (event.target.checked) nextSet.add(m.info.requestKey!);
                          else nextSet.delete(m.info.requestKey!);
                          return nextSet;
                        })
                      }
                    />
                    {m.info.label}
                    {m.info.owner ? <span className="text-muted-foreground"> · {m.info.owner}</span> : null}
                  </label>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant={entries.length > 0 ? "default" : "outline"}
              className="h-11 w-fit gap-1.5"
              disabled={!bailId}
              onClick={() => setComposer(target)}
            >
              <Send className="size-4" />
              {entries.length > 0 ? `Préparer la demande ${WHO[target]} (${entries.length})` : `Demander des informations ${WHO[target]}`}
            </Button>
            <p className="text-[12.5px] text-muted-foreground">
              {entries.length > 0
                ? "Dans la fenêtre, vous pouvez ajouter des informations à corriger, puis vous relisez l'e-mail avant l'envoi."
                : "Vous choisissez quoi demander, puis vous relisez l'e-mail avant l'envoi."}
            </p>
          </section>
        );
      })}

      {basket.length === 0 && missing.length === 0 && (
        <p className="flex items-center gap-2 text-[14.5px] font-medium text-green-800">
          <ClipboardCheck className="size-5" />
          Aucune pièce à redemander. Rien à demander ? Terminez ou transmettez au notaire.
        </p>
      )}

      {sendButton && (
        <section className={cn("flex flex-col gap-2 rounded-xl border bg-card p-4")}>
          <h3 className="text-[16px] font-semibold">{finish.title}</h3>
          <p className="text-[13.5px] text-muted-foreground">{finish.hint}</p>
          <div className="w-fit">{sendButton}</div>
        </section>
      )}

      {composer && bailId && (
        <ComplementComposer
          bailId={bailId}
          target={composer}
          open
          onOpenChange={(open) => !open && setComposer(null)}
          preselect={{ items: entriesFor(composer).map((entry) => ({ key: entry.key, reason: entry.reason, note: entry.note })) }}
          onSent={(keys) => {
            setBasket((current) => current.filter((b) => !keys.includes(b.key)));
            setWithMissing((current) => new Set([...current].filter((key) => !keys.includes(key))));
            setComposer(null);
          }}
        />
      )}
    </div>
  );
}
