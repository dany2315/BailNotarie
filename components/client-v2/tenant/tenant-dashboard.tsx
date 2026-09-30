"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileSignature,
  FileText,
  LifeBuoy,
  MessageSquare,
  ScanSearch,
  Sparkles,
} from "lucide-react";

import { TodoRow } from "../owner-todo";
import { useOwnerRuntime } from "../owner-runtime";
import {
  EmptyState,
  IconTile,
  MicroLabel,
  OwnerCanvas,
  SectionHeading,
  StatRail,
  Surface,
  Tone,
} from "../owner-ui";
import { TenantAwaitingLine, TenantBailLine } from "./tenant-bail-line";
import {
  ACTIVE_STATUSES,
  STAGE_LABELS,
  type TenantBail,
  type TenantIntake,
  type TenantPendingRequest,
} from "./model";

/* =========================================================================
   Tableau de bord locataire — refonte.

   Mêmes données, mêmes liens, mêmes calculs que `DashboardLocataireClient` :
   le partage entre baux en attente et baux actifs, les trois chiffres, le
   tri des dossiers récents, le formulaire d'intake, les demandes du notaire.

   Ce qui change, c'est la hiérarchie : une phrase qui dit s'il y a quelque
   chose à faire, puis une file « À faire maintenant » qui rassemble ce qui
   attend le locataire, puis ses baux en lecture. Un locataire n'a rien à
   créer — la page ne lui propose donc aucune action de création, seulement
   de quoi comprendre où en est son bail et joindre son notaire.
   ========================================================================= */

export interface TenantDashboardProps {
  baux: TenantBail[];
  pendingRequests: TenantPendingRequest[];
  activeIntake: TenantIntake | null;
  userName: string | null;
}

type TodoItem = {
  key: string;
  icon: React.ElementType;
  tone: Tone;
  kicker: string;
  title: string;
  subtitle?: string | null;
  message?: string | null;
  actionLabel: string;
  href?: string;
};

export function TenantDashboard({
  baux,
  pendingRequests,
  activeIntake,
  userName,
}: TenantDashboardProps) {
  const { demo } = useOwnerRuntime();
  const todoRef = React.useRef<HTMLDivElement>(null);

  // Les baux couverts par un intake en cours ne sont pas listés deux fois.
  const intakeBailIds = new Set([activeIntake?.bailId].filter(Boolean));

  const awaitingBails = baux.filter(
    (bail) =>
      bail.status === "AWAITING_TENANT" ||
      bail.status === "AWAITING_TENANT_FORM" ||
      intakeBailIds.has(bail.id),
  );
  const activeBails = baux.filter(
    (bail) =>
      bail.status !== "AWAITING_TENANT" &&
      bail.status !== "AWAITING_TENANT_FORM" &&
      !intakeBailIds.has(bail.id),
  );

  const enCours = activeBails.filter((bail) => ACTIVE_STATUSES.includes(bail.status)).length;
  const signes = activeBails.filter((bail) => bail.status === "SIGNED").length;
  const aTraiter = pendingRequests.length + (activeIntake ? 1 : 0);

  const recentBails = React.useMemo(
    () =>
      [...activeBails]
        .sort((a, b) => {
          const rank = (status: string) =>
            status === "CLIENT_CONTACTED"
              ? 0
              : status === "AWAITING_TENANT_FORM"
                ? 1
                : status === "PENDING_VALIDATION"
                  ? 2
                  : status === "READY_FOR_NOTARY"
                    ? 3
                    : status === "DRAFT"
                      ? 4
                      : status === "SIGNED"
                        ? 5
                        : 6;
          return rank(a.status) - rank(b.status);
        })
        .slice(0, 4),
    [activeBails],
  );

  const todos: TodoItem[] = [
    ...pendingRequests.map((request) => ({
      key: `req-${request.id}`,
      icon: MessageSquare,
      tone: "violet" as Tone,
      kicker: "Votre notaire vous a écrit",
      title: request.title,
      subtitle: request.bail?.property
        ? request.bail.property.label || request.bail.property.fullAddress
        : null,
      message: request.content || null,
      actionLabel: "Répondre",
      href: request.bail ? `/client/locataire/baux/${request.bail.id}?chat=1` : undefined,
    })),
    ...(activeIntake
      ? [
          {
            key: `intake-${activeIntake.token}`,
            icon: ClipboardList,
            tone: "amber" as Tone,
            kicker: `À compléter · ${STAGE_LABELS[activeIntake.stage]}`,
            title: activeIntake.propertyLabel || "Votre dossier locataire",
            subtitle: null,
            message:
              "Votre propriétaire a lancé ce bail — complétez vos informations pour qu'il puisse avancer.",
            actionLabel: "Compléter",
            href: activeIntake.intakeUrl,
          },
        ]
      : []),
  ];

  const firstName = userName?.split(" ")[0];
  const summary =
    aTraiter > 0
      ? `${aTraiter} chose${aTraiter > 1 ? "s" : ""} vous attend${aTraiter > 1 ? "ent" : ""}`
      : enCours > 0
        ? `${enCours} bail${enCours > 1 ? "x" : ""} en cours — rien à faire de votre côté`
        : "Bienvenue dans votre espace locataire";

  const nothingAtAll = activeBails.length === 0 && !activeIntake && awaitingBails.length === 0;

  return (
    <OwnerCanvas>
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:pb-14">
        <header className="mb-5 sm:mb-6">
          <MicroLabel>Espace locataire</MicroLabel>
          <h1 className="lp-title mt-1.5 text-[26px] font-bold text-slate-900 sm:text-[32px]">
            {firstName ? `Bonjour ${firstName}` : "Votre espace"}
          </h1>
          <p className="mt-1 text-[13.5px] text-slate-500">{summary}</p>
        </header>

        <StatRail
          className="mb-6"
          items={[
            { label: "En cours", value: enCours, tone: "slate" },
            {
              label: "À faire",
              value: aTraiter,
              tone: "amber",
              onClick: () => todoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
            },
            { label: "Signés", value: signes, tone: "emerald" },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_296px] lg:gap-8">
          <div className="min-w-0 space-y-6">
            {todos.length > 0 && (
              <section ref={todoRef} className="scroll-mt-28 space-y-3">
                <SectionHeading title="À faire maintenant" count={todos.length} />
                <Surface tone="raised" className="divide-y divide-slate-100 overflow-hidden">
                  {todos.map((todo) => (
                    <TodoRow
                      key={todo.key}
                      icon={todo.icon}
                      tone={todo.tone}
                      kicker={todo.kicker}
                      title={todo.title}
                      subtitle={todo.subtitle}
                      message={todo.message}
                      actionLabel={todo.actionLabel}
                      href={todo.href}
                    />
                  ))}
                </Surface>
              </section>
            )}

            <section className="space-y-3">
              <SectionHeading
                title={activeBails.length > 4 ? "Baux récents" : "Vos baux"}
                action={
                  activeBails.length > 0 ? (
                    <Link
                      href="/client/locataire/baux"
                      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#3563e9] hover:underline"
                    >
                      Voir tout
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : undefined
                }
              />

              {nothingAtAll ? (
                <Surface tone="raised">
                  <EmptyState
                    icon={Sparkles}
                    title="Aucun bail pour l'instant"
                    description="Vous serez prévenu dès qu'un bail vous sera associé — il apparaîtra ici avec son avancement."
                  />
                </Surface>
              ) : (
                <Surface tone="raised" className="divide-y divide-slate-100 overflow-hidden">
                  {/* Le propriétaire prépare encore : rien à faire, mais il faut
                      que ça se voie. */}
                  {awaitingBails.length > 0 && !activeIntake && (
                    <TenantAwaitingLine count={awaitingBails.length} />
                  )}
                  {recentBails.map((bail) => (
                    <TenantBailLine key={bail.id} bail={bail} />
                  ))}
                  {recentBails.length === 0 && awaitingBails.length === 0 && (
                    <EmptyState
                      icon={FileText}
                      title="Aucun bail à suivre"
                      description="Terminez ce qui vous attend ci-dessus : le bail apparaîtra ici dès qu'il avancera."
                    />
                  )}
                </Surface>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Surface tone="raised" className="p-4">
              <MicroLabel className="mb-3">Le parcours</MicroLabel>
              <ol className="relative space-y-3.5">
                <span
                  aria-hidden
                  className="absolute left-[13px] top-3 bottom-3 w-px bg-gradient-to-b from-[#4373f5]/40 to-slate-200"
                />
                {[
                  { icon: ScanSearch, label: "Vérification", hint: "On contrôle chaque pièce" },
                  { icon: FileText, label: "Notaire", hint: "Un notaire rédige l'acte" },
                  { icon: FileSignature, label: "Signature", hint: "En visioconférence" },
                ].map((step) => (
                  <li key={step.label} className="relative flex items-start gap-2.5">
                    <IconTile icon={step.icon} tone="blue" size="sm" className="relative z-10 ring-4 ring-white" />
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[12.5px] font-semibold text-slate-800">{step.label}</p>
                      <p className="text-[11.5px] leading-snug text-slate-500">{step.hint}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Surface>

            <Surface tone="accent" className="p-4">
              <div className="flex items-start gap-2.5">
                <IconTile icon={LifeBuoy} tone="blue" size="sm" className="bg-white" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-slate-800">Une question ?</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-slate-600">
                    Écrivez-nous, on répond dans la journée.
                  </p>
                  <a
                    href="mailto:contact@bailnotarie.fr"
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#3563e9] hover:underline"
                  >
                    contact@bailnotarie.fr
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </Surface>
          </aside>
        </div>
      </div>
    </OwnerCanvas>
  );
}
