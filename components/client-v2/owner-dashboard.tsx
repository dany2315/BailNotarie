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
  Plus,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { IntakeTarget } from "@prisma/client";
import { toast } from "sonner";

import { deleteBailDraft } from "@/lib/actions/leases";
import { OwnerBailRow } from "./owner-bail-card";
import { useOwnerRuntime } from "./owner-runtime";
import { TodoRow } from "./owner-todo";
import {
  EmptyState,
  IconTile,
  MicroLabel,
  OwnerCanvas,
  PrimaryAction,
  SectionHeading,
  StatRail,
  Surface,
  Tone,
} from "./owner-ui";

/* =========================================================================
   Tableau de bord propriétaire — refonte.

   Mêmes données, mêmes liens, mêmes calculs que `DashboardProprietaireClient`.
   Ce qui change, c'est la hiérarchie de lecture :

   1. une phrase qui dit s'il y a quelque chose à faire ;
   2. « À faire maintenant » : une seule file d'attente qui fusionne les
      messages du notaire, les intakes en cours et les brouillons de bail —
      trois familles de cartes auparavant dispersées ;
   3. « Vos dossiers » : le suivi, en lecture ;
   4. une colonne latérale de repères (étapes, aide) qui n'encombre pas le
      chemin principal.
   ========================================================================= */

type Bail = {
  id: string;
  bailType: string | null;
  bailFamily: string | null;
  status: string;
  rentAmount: number | null;
  effectiveDate: string | null;
  endDate: string | null;
  property: { id: string; label: string | null; fullAddress: string | null };
  parties: Array<{
    id: string;
    profilType: string;
    persons?: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
    entreprise?: { legalName: string | null; name: string | null; email: string | null } | null;
  }>;
  dossierAssignments: Array<{ id: string; notaire: { id: string; name: string | null; email: string } }>;
};

type PendingRequest = {
  id: string;
  title: string;
  content?: string | null;
  createdAt: string | Date;
  bail: { id: string; property: { id: string; label: string | null; fullAddress: string | null } } | null;
};

type ActiveIntake = {
  token: string;
  target: IntakeTarget;
  intakeUrl: string;
  stage: "identity" | "property" | "bail" | "finalize";
  description: string;
  propertyLabel: string | null;
  bailType: string | null;
};

type BailDraft = {
  id: string;
  bailType: string;
  rentAmount: number;
  effectiveDate: string;
  updatedAt: string;
  property: { id: string; label: string | null; fullAddress: string | null };
  parties: Array<{
    id: string;
    profilType: string;
    persons?: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
    entreprise?: { legalName: string | null; name: string | null } | null;
  }>;
};

export interface OwnerDashboardProps {
  baux: Bail[];
  pendingRequests: PendingRequest[];
  activeIntakes: ActiveIntake[];
  bailDrafts: BailDraft[];
  userName: string | null;
}

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

const STAGE_LABELS: Record<string, string> = {
  identity: "Informations personnelles",
  property: "Bien immobilier",
  bail: "Détails du bail",
  finalize: "Documents",
};

const ACTIVE_STATUSES = [
  "DRAFT",
  "AWAITING_TENANT",
  "AWAITING_TENANT_FORM",
  "PENDING_VALIDATION",
  "READY_FOR_NOTARY",
  "CLIENT_CONTACTED",
];

const STATUS_PRIORITY = (status: string) =>
  status === "CLIENT_CONTACTED"
    ? 0
    : status === "AWAITING_TENANT_FORM"
      ? 1
      : status === "PENDING_VALIDATION"
        ? 2
        : status === "READY_FOR_NOTARY"
          ? 3
          : status === "AWAITING_TENANT"
            ? 4
            : status === "DRAFT"
              ? 5
              : status === "SIGNED"
                ? 6
                : 7;

/** Le libellé d'un locataire de brouillon, comme dans l'ancienne DraftCard. */
function draftTenantName(draft: BailDraft) {
  const tenant = draft.parties.find((party) => party.profilType === "LOCATAIRE");
  if (!tenant) return null;
  return (
    tenant.entreprise?.legalName ||
    tenant.entreprise?.name ||
    `${tenant.persons?.[0]?.firstName || ""} ${tenant.persons?.[0]?.lastName || ""}`.trim() ||
    tenant.persons?.[0]?.email ||
    null
  );
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
  onDelete?: () => void;
  deleting?: boolean;
};

export function OwnerDashboard({
  baux,
  pendingRequests,
  activeIntakes,
  bailDrafts: initialBailDrafts,
  userName,
}: OwnerDashboardProps) {
  const { demo } = useOwnerRuntime();
  const [bailDrafts, setBailDrafts] = React.useState(initialBailDrafts);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const todoRef = React.useRef<HTMLDivElement>(null);

  const handleDeleteDraft = async (id: string) => {
    setDeletingId(id);
    try {
      if (demo) await new Promise((resolve) => setTimeout(resolve, 350));
      else await deleteBailDraft(id);
      setBailDrafts((prev) => prev.filter((draft) => draft.id !== id));
      toast.success("Brouillon supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Chiffres (identiques à l'ancien tableau de bord) ───────────────────────
  const enCours = baux.filter((bail) => ACTIVE_STATUSES.includes(bail.status)).length;
  const aTraiter = pendingRequests.length + activeIntakes.length + bailDrafts.length;
  const signes = baux.filter((bail) => bail.status === "SIGNED").length;

  const recentBails = React.useMemo(
    () => [...baux].sort((a, b) => STATUS_PRIORITY(a.status) - STATUS_PRIORITY(b.status)).slice(0, 4),
    [baux],
  );

  // ── La file d'attente unique ───────────────────────────────────────────────
  const todos: TodoItem[] = [
    // Le notaire attend une réponse : c'est ce qui bloque le plus un dossier.
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
      href: request.bail
        ? `/client/proprietaire/demandes?open=bail-${request.bail.id}&chat=1`
        : undefined,
    })),
    // Un formulaire commencé ailleurs (lien d'intake).
    ...activeIntakes.map((intake) => ({
      key: `intake-${intake.token}`,
      icon: ClipboardList,
      tone: "amber" as Tone,
      kicker: `À compléter · ${STAGE_LABELS[intake.stage]}`,
      title: intake.propertyLabel || "Dossier en cours",
      subtitle: intake.bailType ? BAIL_TYPE_LABELS[intake.bailType] || intake.bailType : null,
      message: intake.description,
      actionLabel: "Continuer",
      href: intake.intakeUrl,
    })),
    // Un bail commencé depuis l'interface et laissé en brouillon.
    ...bailDrafts.map((draft) => {
      const tenantName = draftTenantName(draft);
      const propertyLabel = draft.property.label || draft.property.fullAddress?.split(",")[0] || "Bien";
      const hasRent = draft.rentAmount > 0;
      const step = !tenantName ? "Locataire" : !hasRent ? "Détails du bail" : "Paiement";
      const message = !tenantName
        ? "Ajoutez un locataire pour continuer — ou laissez le dossier de côté, il vous attend."
        : !hasRent
          ? "Renseignez le loyer et les dates du bail."
          : "Tout est prêt : il ne reste que le paiement pour soumettre la demande.";
      return {
        key: `draft-${draft.id}`,
        icon: FileText,
        tone: "amber" as Tone,
        kicker: `À compléter · ${step}`,
        title: propertyLabel,
        subtitle: [tenantName, draft.bailType ? BAIL_TYPE_LABELS[draft.bailType] || draft.bailType : null]
          .filter(Boolean)
          .join(" · ") || null,
        message,
        actionLabel: "Reprendre",
        href: `/client/proprietaire/baux/new?draftId=${draft.id}`,
        onDelete: () => handleDeleteDraft(draft.id),
        deleting: deletingId === draft.id,
      };
    }),
  ];

  const firstName = userName?.split(" ")[0];
  const summary =
    aTraiter > 0
      ? `${aTraiter} chose${aTraiter > 1 ? "s" : ""} vous attend${aTraiter > 1 ? "ent" : ""}`
      : enCours > 0
        ? `${enCours} dossier${enCours > 1 ? "s" : ""} en cours — rien à faire de votre côté`
        : "Aucun dossier en cours";

  const nothingAtAll = baux.length === 0 && todos.length === 0;

  return (
    <OwnerCanvas>
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:pb-14">
        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            <MicroLabel>Espace propriétaire</MicroLabel>
            <h1 className="lp-title mt-1.5 text-[26px] font-bold text-slate-900 sm:text-[32px]">
              {firstName ? `Bonjour ${firstName}` : "Votre espace"}
            </h1>
            <p className="mt-1 text-[13.5px] text-slate-500">{summary}</p>
          </div>
          <Link href="/client/proprietaire/baux/new" className="max-sm:w-full">
            <PrimaryAction className="w-full py-3 sm:w-auto">
              <Plus className="h-4 w-4" />
              Nouveau dossier
            </PrimaryAction>
          </Link>
        </header>

        {/* ── Chiffres ────────────────────────────────────────────────────── */}
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
            {/* ── À faire maintenant ──────────────────────────────────────── */}
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
                      onDelete={todo.onDelete}
                      deleting={todo.deleting}
                    />
                  ))}
                </Surface>
              </section>
            )}

            {/* ── Suivi des dossiers ──────────────────────────────────────── */}
            <section className="space-y-3">
              <SectionHeading
                title={baux.length > 4 ? "Dossiers récents" : "Vos dossiers"}
                action={
                  baux.length > 0 ? (
                    <Link
                      href="/client/proprietaire/demandes"
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
                    title="Votre premier bail commence ici"
                    description="Ajoutez le bien, indiquez le locataire quand vous le connaissez, et un notaire prend le relais."
                    action={
                      <Link href="/client/proprietaire/baux/new" className="mt-1">
                        <PrimaryAction className="py-3">
                          <Plus className="h-4 w-4" />
                          Constituer un dossier
                        </PrimaryAction>
                      </Link>
                    }
                  />
                </Surface>
              ) : recentBails.length === 0 ? (
                <Surface tone="quiet">
                  <EmptyState
                    icon={FileText}
                    title="Aucun dossier soumis"
                    description="Terminez ce qui vous attend ci-dessus : le dossier apparaîtra ici dès qu'il sera transmis."
                  />
                </Surface>
              ) : (
                <Surface tone="raised" className="divide-y divide-slate-100 overflow-hidden">
                  {recentBails.map((bail) => (
                    <OwnerBailRow
                      key={bail.id}
                      bail={bail}
                      // Dans la maquette, la page « Mes dossiers » n'est pas une URL :
                      // on ouvre un aperçu plutôt qu'un lien qui mènerait au login.
                      href={demo ? undefined : `/client/proprietaire/demandes?open=bail-${bail.id}`}
                      onOpen={
                        demo
                          ? () => toast.info("Aperçu — le dossier s'ouvre dans « Mes dossiers »")
                          : undefined
                      }
                    />
                  ))}
                </Surface>
              )}
            </section>
          </div>

          {/* ── Colonne de repères ─────────────────────────────────────────── */}
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
