import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BellRing, Check, CreditCard, Euro, FileUp, Lock, MessageSquarePlus, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { BailStatus, CompletionStatus, DocumentKind } from "@prisma/client";
import { getLease, getBailMissingData } from "@/lib/actions/leases";
import { getDocuments } from "@/lib/actions/documents";
import { getBailFollowUp, type IntakeTracking } from "@/lib/actions/admin-bail";
import { InternalNotes } from "@/components/comments/internal-notes";
import { TenantCreateButton } from "@/components/leases/tenant-create-button";
import { BailAuditTimeline } from "@/components/leases/bail-audit-timeline";
import { BailMoreMenu } from "@/components/leases/bail-more-menu";
import { SendToNotaryButton } from "@/components/leases/send-to-notary-dialog";
import { RemindButton, ReminderSummary } from "@/components/reminders/remind-button";
import { getReminderPanel, type ReminderPanel } from "@/lib/actions/reminders";
import { getBailComplementRequests, getMissingFieldCounts } from "@/lib/actions/complement-requests";
import { complementCountLabel } from "@/lib/utils/complement";
import { ComplementRequestsPanel } from "@/components/complements/complement-requests-panel";
import { AskFieldsButton, ComplementRequestButton } from "@/components/complements/complement-composer";
import { describeRentCapZone, rentCapBlocking, rentCapOverLines } from "@/lib/rent-cap";
import { assessRentRules } from "@/lib/rent-rules";
import { PROOF_LABELS, VACANCY_MONTHS, relocationSummaryLines } from "@/lib/utils/rent-relocation";
import { rentRulesToForm } from "@/lib/utils/rent-draft";
import { RentRulesEditor } from "@/components/admin/rent-rules-editor";
import { EXEMPTION_LABELS, PERIOD_LABELS, ROOMS_LABELS } from "@/lib/utils/rent-cap";
import { RentCapEditor, RentCapExemptionButton, RentSupplementButton } from "@/components/admin/rent-cap-editor";
import { intakeSummary } from "@/lib/utils/intake-summary";
import { PartyCheckSection, buildPartyPoints, docPoints, docRowKeys, partyPieceRows, withVerified, type KbisCheck } from "@/components/admin/party-check-section";
import { CheckList, CheckPoint, CheckSection, StateChip } from "@/components/admin/check-list";
import { ValidateAllButton } from "@/components/admin/verify-buttons";
import { pointKey, summarize, summaryChip } from "@/lib/utils/verification";
import { prisma } from "@/lib/prisma";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { DiagnosticsLegend } from "@/components/documents/diagnostics-legend";
import { buildChecklistRows, toChecklistDocument } from "@/lib/utils/document-checklist";
import { getBailDocumentRules, getRequiredPropertyFields } from "@/lib/utils/required-fields";
import { requiresOccupancyDeclaration } from "@/lib/rent-cap";
import { formatCurrency, formatDate, formatSurface } from "@/lib/utils/formatters";
import {
  ACTOR_LABELS,
  STAGES,
  STAGE_ORDER,
  STATUS_LABELS,
  STALE_AFTER_DAYS,
  daysSince,
  getLastActivity,
  getNextAction,
  getStage,
  isActiveStage,
} from "@/lib/utils/bail-stage";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { BailTermsEditor, type BailTermInput } from "@/components/admin/bail-terms-editor";
import { assessDpe } from "@/lib/utils/dpe";
import { PropertyDetailsEditor, PropertyFurnitureEditor } from "@/components/admin/property-editors";
import { commercialComplianceRules, commercialDepositWarning, type RuleTone, type RuleView } from "@/lib/utils/commercial-compliance";
import { asksBoughtDuringMarriage, commercialPaymentText, commercialTermsToForm, commercialVatText, complexTypeValue } from "@/lib/utils/commercial-terms";
import { CommercialTermsInline, EditTermsLink } from "@/components/admin/commercial-terms-editor";
import { FicheAutoRefresh, FicheProvider, RemindRequestButton, RuleTag, Since, type FicheClaim } from "@/components/admin/fiche/fiche-context";
import { ContactCard } from "@/components/admin/fiche/contact-card";
import { PiecesSection, type PieceGroup } from "@/components/admin/fiche/pieces-section";
import { StartReviewButton } from "@/components/admin/fiche/guided-review";
import { questionsForDataFields } from "@/lib/rules/complement-questions";
import { fieldComplementKey } from "@/lib/utils/complement";

/** Règle de la Conformité légale → ligne des « Conditions commerciales » qui la corrige. */
const TERMS_ROW_FOR_RULE: Record<string, string> = {
  duree: "derogatory",
  charges: "charges",
  travaux: "pastWorks",
  indexation: "indexation",
  conjoint: "marriage",
};
import { formatDossierFee } from "@/lib/utils/dossier-fee";
import { HISTORICAL_PAID_LABEL, isBailPaid, knownPaymentDate, paymentKind } from "@/lib/payments/paid";
import { HistoricalPaymentReview } from "@/components/admin/historical-payment-review";
import { ArchivedDocuments } from "@/components/admin/archived-documents";
import { dpeDateValue } from "@/components/admin/dpe-summary";
import { DiagnosticsPanel } from "@/components/admin/diagnostics-analysis";
import { isDiagnosticAnalysisConfigured } from "@/lib/diagnostics/openai";
import { loadDiagnosticState } from "@/lib/diagnostics/state";
import { LocalDateTime } from "@/components/shared/local-date-time";
import { formatDateTime } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";
// « Analyser les diagnostics » lit les fichiers après la réponse : jusqu'à 2 minutes pour un gros dossier.
export const maxDuration = 300;

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
  COMMERCIAL_3_6_9: "Bail commercial 3-6-9",
  COMMERCIAL_DEROGATOIRE: "Bail commercial dérogatoire",
};
const BAIL_FAMILY_LABELS: Record<string, string> = { HABITATION: "Habitation", COMMERCIAL: "Commercial" };
const PROPERTY_TYPE_LABELS: Record<string, string> = { APPARTEMENT: "Appartement", MAISON: "Maison", BOUTIQUE: "Boutique", BUREAU: "Bureau", LOCAL_ACTIVITE: "Local d'activité", ENTREPOT: "Entrepôt", AUTRE_LOCAL: "Autre local" };
const SUBDIVISION_AGE_LABELS: Record<string, string> = {
  YES: "Lotissement autorisé il y a plus de 10 ans (règlement non demandé)",
  NO: "Lotissement autorisé il y a moins de 10 ans",
  UNKNOWN: "Ancienneté du lotissement inconnue",
};
const LEGAL_STATUS_LABELS: Record<string, string> = {
  PLEIN_PROPRIETE: "Pleine propriété",
  CO_PROPRIETE: "Copropriété",
  LOTISSEMENT: "Lotissement",
};
const BAIL_FIELD_LABELS: Record<string, string> = {
  rentAmount: "Loyer",
  effectiveDate: "Date de prise d'effet",
  paymentDay: "Jour de paiement",
  securityDeposit: "Dépôt de garantie",
  tenant: "Locataire",
  owner: "Propriétaire",
  property: "Bien",
};

const FURNITURE: Array<{ key: string; label: string }> = [
  { key: "hasLiterie", label: "Literie avec couette ou couverture" },
  { key: "hasRideaux", label: "Volets ou rideaux" },
  { key: "hasPlaquesCuisson", label: "Plaques de cuisson" },
  { key: "hasFour", label: "Four ou micro-onde" },
  { key: "hasRefrigerateur", label: "Réfrigérateur" },
  { key: "hasCongelateur", label: "Congélateur (-6° max)" },
  { key: "hasVaisselle", label: "Vaisselle" },
  { key: "hasUstensilesCuisine", label: "Ustensiles de cuisine" },
  { key: "hasTable", label: "Table" },
  { key: "hasSieges", label: "Sièges" },
  { key: "hasEtageresRangement", label: "Étagères de rangement" },
  { key: "hasLuminaires", label: "Luminaires" },
  { key: "hasMaterielEntretien", label: "Matériel d'entretien" },
];

/** Qui a la main, dans la ligne de statut de l'en-tête. */
const WAITING_ON: Record<string, string> = {
  nous: "à faire par nous",
  proprietaire: "en attente du propriétaire",
  locataire: "en attente du locataire",
  client: "en attente du client",
  notaire: "chez le notaire",
};

const COMPLETION_LABELS: Record<string, string> = {
  NOT_STARTED: "Pas commencé",
  PARTIAL: "Incomplet",
  PENDING_CHECK: "À vérifier",
  COMPLETED: "Vérifié",
};

function partyDisplayName(party: any): string {
  if (!party) return "";
  if (party.type === "PERSONNE_MORALE") return party.entreprise?.legalName || party.entreprise?.name || "Société";
  const names = (party.persons || []).map((p: any) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean);
  return names.join(" et ") || party.persons?.[0]?.email || "";
}

/** Ligne « libellé : valeur » des encadrés de la colonne et des détails. */
function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

/** Règle de « Conformité légale » contrôlée par le logiciel, sans clic de l'équipe. */
function AutoLabel({ children }: { children: ReactNode }) {
  return (
    <span className="flex flex-col gap-0.5">
      {children}
      <span className="text-[12px] font-medium text-green-700">✓ vérifié par le logiciel</span>
    </span>
  );
}

/** À la place de « Valider » quand le logiciel a déjà vérifié la règle. */
function AutoVerified() {
  // Déjà dit sous le titre de la ligne (« ✓ vérifié par le logiciel ») : rien à ajouter dans les boutons.
  return null;
}

const FACT_TONE: Record<RuleTone, string> = {
  ok: "text-green-800",
  warn: "text-amber-800",
  neutral: "text-foreground",
};

/** Contenu d'une règle commerciale : tableau « libellé : valeur » ou répartition en pastilles. */
function RuleViewBlock({ view }: { view: RuleView }) {
  if (view.kind === "split") {
    return (
      <span className="@container block whitespace-normal">
      <span className="grid grid-cols-1 items-start gap-x-3 gap-y-1 @sm:grid-cols-[92px_minmax(0,1fr)] @sm:gap-y-1.5">
        {view.groups.map((group) => (
          <Fragment key={group.label}>
            <span
              className={cn(
                "mt-1 text-[12.5px] font-semibold first:mt-0 @sm:mt-0 @sm:pt-0.5",
                group.tone === "missing" ? "text-red-700" : group.tone === "tenant" ? "text-sky-800" : "text-slate-700",
              )}
            >
              {group.label}
            </span>
            <span className="flex flex-wrap gap-1">
              {group.items.length === 0 ? (
                <span className="text-[13px] text-muted-foreground">aucune charge</span>
              ) : (
                group.items.map((item) => (
                  <span
                    key={item.label}
                    title={item.fixed ? "Toujours à la charge du propriétaire (article R145-35)" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12.5px] leading-tight",
                      group.tone === "missing"
                        ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                        : group.tone === "tenant"
                          ? "bg-sky-50 text-sky-900"
                          : "bg-slate-100 text-slate-800",
                    )}
                  >
                    {item.fixed && <Lock className="size-3 shrink-0 opacity-60" aria-label="imposé par la loi" />}
                    {item.label}
                  </span>
                ))
              )}
            </span>
          </Fragment>
        ))}
      </span>
      </span>
    );
  }
  return (
    // Étroit (téléphone) : libellé au-dessus de la valeur ; sinon deux colonnes.
    <span className="@container block whitespace-normal">
    <span className="grid grid-cols-1 gap-x-3 @sm:grid-cols-[160px_minmax(0,1fr)] @sm:gap-y-1">
      {view.facts.map((fact) => (
        <Fragment key={fact.label}>
          <span className="mt-1 text-[12.5px] text-muted-foreground first:mt-0 @sm:mt-0 @sm:text-[13px]">{fact.label}</span>
          <span className={cn("flex min-w-0 flex-col text-[13.5px] font-medium", FACT_TONE[fact.tone || "neutral"])}>
            {fact.values.map((value) => (
              <span key={value} className="break-words">
                {value}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
    </span>
  );
}

/** Bouton de relance de l'en-tête : une phrase courte qui dit quoi demander à qui, comme « Demander 3 pièces au propriétaire ». */
const RELANCE_ACTIONS: Record<string, { label: string; title: string; icon: "bell" | "tenant" | "rent" }> = {
  OWNER_FORM: { label: "Relancer le propriétaire pour son formulaire", title: "Relancer le propriétaire", icon: "bell" },
  TENANT_TO_ADD: { label: "Demander le locataire au propriétaire", title: "Demander le locataire au propriétaire", icon: "tenant" },
  TENANT_FORM: { label: "Relancer le locataire pour son formulaire", title: "Relancer le locataire", icon: "bell" },
  TENANT_VIA_OWNER: { label: "Relancer le propriétaire pour son locataire", title: "Relancer le propriétaire", icon: "bell" },
};
const RENT_CAP_ACTION = { label: "Prévenir le propriétaire du plafond de loyer", title: "Prévenir le propriétaire", icon: "rent" as const };
const FALLBACK_ACTION = { label: "Relancer le client", title: "Relancer le client", icon: "bell" as const };

/**
 * Bouton de relance de l'en-tête, nommé d'après ce que le dossier attend : relance due, puis
 * plafond de loyer, puis relance à venir. Les pièces manquantes ont leur propre bouton
 * (« Demander des pièces »), affiché quand aucune relance n'est due.
 */
function remindAction(panel: ReminderPanel, rentCapOver: boolean, piecesToAsk: boolean): { label: string; title: string; icon: "bell" | "tenant" | "rent" } | null {
  const dueNeed = panel.needs.find((n) => n.due);
  if (dueNeed) return RELANCE_ACTIONS[dueNeed.reason] || FALLBACK_ACTION;
  if (piecesToAsk) return null;
  if (rentCapOver) return RENT_CAP_ACTION;
  const nextNeed = panel.needs[0];
  if (nextNeed) return RELANCE_ACTIONS[nextNeed.reason] || FALLBACK_ACTION;
  return null;
}

/** « formulaire rempli le 01/10 » pour le sous-titre d'un bloc. */
function formNote(link: IntakeTracking | undefined): string | null {
  if (!link) return null;
  if (link.submittedAt) return `formulaire rempli le ${formatDate(link.submittedAt)}`;
  return "formulaire en attente";
}

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lease = await getLease(id);
  if (!lease) notFound();

  // Pièces archivées depuis ce dossier (remplacées par une nouvelle) : conservées, visibles de l'équipe.
  const archivedDocuments = await prisma.document.findMany({
    where: { archivedBailId: lease.id, archivedAt: { not: null } },
    orderBy: { archivedAt: "desc" },
    select: { id: true, kind: true, label: true, fileKey: true, mimeType: true, archivedAt: true, archivedByName: true, replacedBy: { select: { label: true } } },
  });

  const tenant = lease.parties?.find((p: any) => p.profilType === "LOCATAIRE") || null;
  const owner = lease.parties?.find((p: any) => p.profilType === "PROPRIETAIRE") || lease.property?.owner || null;

  // Paiements Stripe de ce dossier qui ne sont pas (encore) rattachés au bail : en cours de vérification,
  // ou confirmés alors que le formulaire n'est pas envoyé. Affichés à l'équipe, jamais comptés comme « payé ».
  const openPayments = await prisma.dossierPayment.findMany({
    where: { bailId: null, intakeLink: { bailId: lease.id }, status: { in: ["PROCESSING", "UNKNOWN", "SUCCEEDED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, stripePaymentIntentId: true, stripePaidAt: true, confirmedAt: true, lastError: true },
    take: 5,
  });

  const [tenantClientDocs, ownerClientDocs, propertyDocuments, bailDocuments, missingData, followUp, verificationChecks] = await Promise.all([
    tenant ? getDocuments({ clientId: tenant.id }) : Promise.resolve([]),
    owner ? getDocuments({ clientId: owner.id }) : Promise.resolve([]),
    lease.property ? getDocuments({ propertyId: lease.property.id }) : Promise.resolve([]),
    getDocuments({ bailId: lease.id }),
    getBailMissingData(lease.id),
    getBailFollowUp(lease.id),
    prisma.bailVerificationCheck.findMany({ where: { bailId: lease.id }, select: { pointKey: true } }),
  ]);
  const [reminderPanel, complementRequests, missingFieldCounts] = await Promise.all([
    getReminderPanel(lease.id),
    getBailComplementRequests(lease.id),
    getMissingFieldCounts(lease.id),
  ]);
  const verifiedKeys = new Set(verificationChecks.map((c) => c.pointKey));

  // Pièces du client hors personnes et société (déjà affichées dans leur bloc).
  // Une pièce du bail ou du bien a sa propre section, même si un client y est aussi rattaché.
  const commonDocs = (docs: any[]) => docs.filter((doc: any) => !doc.personId && !doc.entrepriseId && !doc.bailId && !doc.propertyId);

  const stage = getStage(lease.status);
  const lastActivity = getLastActivity(lease.updatedAt, followUp.lastActivityAt);
  const waitingDays = daysSince(lastActivity);
  const nextAction = getNextAction({
    status: lease.status,
    hasTenant: !!tenant,
    hasNotaire: !!followUp.notaire,
    pendingNotaireRequests: followUp.pendingRequests.length,
  });
  const ownerName = partyDisplayName(owner);
  const tenantName = partyDisplayName(tenant);
  const isMeuble = lease.bailType === "BAIL_MEUBLE_1_ANS" || lease.bailType === "BAIL_MEUBLE_9_MOIS";
  const property: any = lease.property;

  // Bouton principal selon l'étape.
  const canSend =
    lease.status === BailStatus.AWAITING_TENANT_FORM ||
    lease.status === BailStatus.PENDING_VALIDATION ||
    (lease.status === BailStatus.READY_FOR_NOTARY && !followUp.notaire);

  // Contrôles automatiques réellement en place.
  // Bail commercial : pas de plafond légal du dépôt de garantie
  const isCommercial = lease.bailFamily === "COMMERCIAL";
  const maxDeposit = isMeuble ? lease.rentAmount * 2 : lease.rentAmount;
  const depositOk = isCommercial || lease.securityDeposit <= maxDeposit;
  const docsMissing =
    (missingData?.owner?.totalMissingDocuments || 0) +
    (missingData?.tenant?.totalMissingDocuments || 0) +
    (missingData?.property?.missingDocuments.length || 0);
  const surface = property?.surfaceM2 ? Number(property.surfaceM2) : null;

  const ownerIntake = followUp.intakes.find((i) => i.target === "OWNER");
  const tenantIntake = followUp.intakes.find((i) => i.target === "TENANT");


  // ---- Fiche de vérification : un point par donnée, comme la maquette ----
  // Une fois le dossier envoyé au notaire, ses points sont considérés comme
  // vérifiés et verrouillés.
  const pastVerification = stage.key === "notaire" || stage.key === "signe" || stage.key === "clos";
  const bailLocked = pastVerification;
  // La vérification est propre à chaque dossier : un client ou un bien déjà « Complété »
  // (par exemple pour un autre dossier) se revérifie ici. Seul l'envoi au notaire verrouille.
  const ownerLocked = pastVerification;
  const tenantLocked = pastVerification;
  const propertyLocked = pastVerification;

  // Le bail
  const bailMissing = new Set(missingData?.bail.missingFields || []);
  const dateValue = (date: Date | string | null | undefined) => (date ? format(new Date(date), "yyyy-MM-dd") : "");
  const months = lease.rentAmount > 0 ? Math.round((lease.securityDeposit / lease.rentAmount) * 10) / 10 : null;
  // Le locataire confirme le loyer, les charges et la date d'entrée en envoyant son formulaire.
  // Si ces conditions changent ensuite (ou si le locataire est remplacé), l'accord est archivé et redemandé.
  const tenantConfirmation = lease.tenantConfirmedTermsAt
    ? `Loyer, charges et date d'entrée confirmés par le locataire le ${formatDate(lease.tenantConfirmedTermsAt)}`
    : (lease as any).tenantReconfirmationRequestedAt
      ? `Confirmation du locataire à renouveler : conditions ou locataire modifiés le ${formatDate((lease as any).tenantReconfirmationRequestedAt)} (il la redonne depuis son espace)`
      : null;
  const bailPoints = [
    {
      key: pointKey("bail:type", [lease.bailType, lease.bailFamily, lease.effectiveDate, lease.endDate]),
      label: "Type et durée",
      missing: ["effectiveDate"].filter((f) => bailMissing.has(f)),
      fields: [
        { field: "bailType", label: "Type de bail", value: lease.bailType },
        { field: "bailFamily", label: "Usage", value: lease.bailFamily },
        { field: "effectiveDate", label: "Date de prise d'effet", value: dateValue(lease.effectiveDate), missing: bailMissing.has("effectiveDate") },
      ] as BailTermInput[],
      text: [
        `${BAIL_TYPE_LABELS[lease.bailType] || lease.bailType} · ${BAIL_FAMILY_LABELS[lease.bailFamily] || lease.bailFamily}`,
        lease.effectiveDate
          ? `À partir du ${formatDate(lease.effectiveDate)}${lease.endDate ? ` jusqu'au ${formatDate(lease.endDate)}` : ""}`
          : null,
      ],
    },
    {
      key: pointKey("bail:loyer", [lease.rentAmount, lease.monthlyCharges, lease.paymentDay]),
      label: "Loyer et charges",
      missing: ["rentAmount", "paymentDay"].filter((f) => bailMissing.has(f)),
      fields: [
        { field: "rentAmount", label: isCommercial ? "Loyer mensuel hors taxes et hors charges" : "Loyer hors charges", value: lease.rentAmount > 0 ? String(lease.rentAmount) : "", missing: bailMissing.has("rentAmount") },
        { field: "monthlyCharges", label: isCommercial ? "Provision mensuelle pour charges" : "Charges mensuelles", value: String(lease.monthlyCharges ?? 0) },
        { field: "paymentDay", label: "Jour de paiement", value: lease.paymentDay ? String(lease.paymentDay) : "", missing: bailMissing.has("paymentDay") },
      ] as BailTermInput[],
      text: isCommercial
        ? [
            lease.rentAmount > 0
              ? `${formatCurrency(lease.rentAmount)} HT de loyer + ${formatCurrency(lease.monthlyCharges)} de provision pour charges par mois`
              : null,
            lease.rentAmount > 0 ? `Soit ${formatCurrency(lease.rentAmount * 12)} HT de loyer par an` : null,
            [commercialPaymentText((lease as any).commercialTerms, lease.paymentDay), commercialVatText((lease as any).commercialTerms)]
              .filter(Boolean)
              .join(" · ") || null,
            // Accord du locataire : en pastille sur la ligne (rentTags).
          ]
        : [
            lease.rentAmount > 0
              ? `${formatCurrency(lease.rentAmount)} de loyer + ${formatCurrency(lease.monthlyCharges)} de charges par mois`
              : null,
            lease.paymentDay ? `Payable le ${lease.paymentDay} de chaque mois` : null,
            // Accord du locataire : en pastille sur la ligne (rentTags).
          ],
    },
    {
      key: pointKey("bail:depot", [lease.securityDeposit, lease.rentAmount, lease.bailType]),
      label: "Dépôt de garantie",
      missing: ["securityDeposit"].filter((f) => bailMissing.has(f)),
      fields: [
        {
          field: "securityDeposit",
          label: "Dépôt de garantie",
          value: String(lease.securityDeposit ?? 0),
          missing: bailMissing.has("securityDeposit"),
          help: lease.rentAmount > 0 && !isCommercial ? `Maximum ${formatCurrency(maxDeposit)} (${isMeuble ? "2 mois de loyer, meublé" : "1 mois de loyer, bail nu"})` : undefined,
        },
      ] as BailTermInput[],
      text: [`${formatCurrency(lease.securityDeposit)}${months !== null ? ` · ${String(months).replace(".", ",")} mois de loyer hors charges` : ""}`],
    },
  ];
  // Locataire, propriétaire ou bien absents : comptés une seule fois, dans leur propre section.
  // Conditions du bail : saisies et exigées par le formulaire du propriétaire, confirmées par le locataire.
  // Plus de validation ligne par ligne ; une information manquante (ancien dossier) bloque toujours l'envoi.
  const bailStates = withVerified(
    bailPoints.filter((p) => p.missing.length > 0).map((p) => ({ key: p.key, missing: true })),
    verifiedKeys,
    bailLocked,
  );

  // Propriétaire et locataire
  const ownerPoints = buildPartyPoints(owner, missingData?.owner || null, commonDocs(ownerClientDocs), "PROPRIETAIRE", { commercial: isCommercial });
  const tenantPoints = buildPartyPoints(tenant, missingData?.tenant || null, commonDocs(tenantClientDocs), "LOCATAIRE", { commercial: isCommercial });
  const ownerStates = withVerified(ownerPoints.points, verifiedKeys, ownerLocked);
  const tenantStates = withVerified(tenantPoints.points, verifiedKeys, tenantLocked);

  // Plafond de loyer : calculé selon l'arrêté d'encadrement en vigueur dans la commune du bien.
  // Avec la relocation en zone tendue (dernier loyer, IRL, travaux, loyer sous-évalué) et le complément de loyer.
  const rentRules = property ? await assessRentRules({ property, bail: lease }) : null;
  const rentCap = rentRules?.cap ?? null;

  // Le bien
  const furniturePresent = property ? FURNITURE.filter((item) => !!property[item.key]).length : 0;
  // Pièces propres à ce bail (bail commercial, déclaration d'occupation) : mêmes règles que le formulaire.
  const bailDocRules = getBailDocumentRules({
    bailFamily: lease.bailFamily,
    property,
    previouslyLet: (lease as any).commercialTerms?.previouslyLet,
    occupancyDeclarationRequired: !isCommercial && !!rentCap && requiresOccupancyDeclaration(rentCap),
  });
  const ruleLabels = Object.fromEntries(bailDocRules.filter((rule) => rule.label).map((rule) => [rule.kind, rule.label as string]));
  const propertyRules = bailDocRules.filter((rule) => rule.target === "property");
  const bailRules = bailDocRules.filter((rule) => rule.target === "bail");
  const propertyDocRows = property
    ? buildChecklistRows(
        [
          ...getRequiredPropertyFields(property.legalStatus, property.subdivisionOver10Years).requiredDocuments,
          ...propertyRules.filter((rule) => rule.required).map((rule) => rule.kind),
        ],
        (propertyDocuments as any[]).map(toChecklistDocument),
        {
          keyPrefix: `property-${property.id}`,
          target: { propertyId: property.id },
          labels: ruleLabels,
          optionalKinds: propertyRules.filter((rule) => !rule.required).map((rule) => rule.kind),
          extras: { [DocumentKind.DIAGNOSTICS]: <DiagnosticsLegend key="diagnostics-legend" /> },
        },
      )
    : [];
  const bailDocRows = buildChecklistRows([], (bailDocuments as any[]).map(toChecklistDocument), {
    keyPrefix: `bail-${lease.id}`,
    target: { bailId: lease.id },
    labels: ruleLabels,
    optionalKinds: bailRules.map((rule) => rule.kind),
    extras: { [DocumentKind.DIAGNOSTICS]: <DiagnosticsLegend key="diagnostics-legend" /> },
  });
  const propertyDocKeys = docRowKeys(propertyDocRows);
  const propertyDescKey = property
    ? pointKey(`property:${property.id}:description`, [
        property.fullAddress,
        property.label,
        property.type,
        property.surfaceM2 ? Number(property.surfaceM2) : null,
        property.legalStatus,
        property.status,
      ])
    : "property:absent";
  const propertyDescMissing = !property || (missingData?.property?.missingFields.length || 0) > 0;
  // Description du bien : exigée par le formulaire, plus validée à la main (seule une donnée manquante compte).
  const propertyStates = withVerified(
    [...(propertyDescMissing ? [{ key: propertyDescKey, missing: true }] : []), ...docPoints(propertyDocRows, propertyDocKeys)],
    verifiedKeys,
    propertyLocked,
  );

  // Contrôles réglementaires (manuels)
  // Diagnostics lus par l'IA, une ligne par diagnostic avec les décisions de l'équipe (null si tables absentes).
  const diagnosticState = property ? await loadDiagnosticState(property.id, isCommercial) : null;
  // Modifiables jusqu'à la signature : le notaire voit les mises à jour.
  const diagnosticsLocked = stage.key === "signe" || stage.key === "clos";
  const rentCapLines = rentCap ? rentCapOverLines(rentCap) : null;
  // Contrôlé automatiquement : loyer conforme à l'arrêté applicable, ou pas de plafond (commune non encadrée,
  // hors périmètre, bail commercial, logement exclu). Adresse non localisée ou bail hors période : à la main.
  // Sans date de prise d'effet, le plafond n'est qu'indicatif : jamais « vérifié automatiquement ».
  const capAuto =
    !!rentCap &&
    !rentCap.effectiveDateMissing &&
    ((rentCap.status === "ok" && rentCap.validity === "in") ||
      (rentCap.status === "not_concerned" && rentCap.notConcerned !== "no_address"));
  // Complément de loyer interdit pour un logement classé F ou G : bloquant comme un dépassement.
  const capMissing = !property || (!!rentCap && rentCapBlocking(rentCap)) || !!rentRules?.supplement.forbidden;
  // Relocation en zone tendue : maximum calculé, justificatifs reçus ou à demander.
  const relocation = rentRules?.relocation ?? null;
  const bailDocKinds = new Set((bailDocuments as any[]).map((doc) => doc.kind as string));
  const proofIds = (bailDocuments as any[]).filter((doc) => relocation?.proofs.includes(doc.kind)).map((doc) => doc.id).sort();
  const missingProofs = (relocation?.proofs ?? []).filter((kind) => !bailDocKinds.has(kind));
  const relocAuto = !relocation || relocation.status === "not_concerned";
  const relocMissing =
    !!relocation &&
    (relocation.status === "over" || (relocation.status === "missing" && !relocation.undeclared) || missingProofs.length > 0);
  const rulesPoints = [
    {
      key: pointKey("rules:plafond", [
        lease.rentAmount,
        surface,
        property?.inseeCode || null,
        rentCap?.zone?.code || null,
        property?.mainRooms ?? null,
        property?.constructionPeriod || null,
        lease.bailType,
        lease.rentSupplementReason || null,
        lease.rentCapExemption || null,
        lease.effectiveDate ? new Date(lease.effectiveDate).toISOString().slice(0, 10) : null,
      ]),
      label: "Plafond de loyer",
    },
    {
      key: pointKey("rules:relocation", [
        lease.rentAmount,
        property?.inseeCode || null,
        property?.dpeClass || null,
        lease.relocationLetBefore ?? null,
        lease.previousTenantLeftAt ? new Date(lease.previousTenantLeftAt).toISOString().slice(0, 10) : null,
        lease.previousRentAmount ?? null,
        lease.previousRentRevisedRecently ?? null,
        lease.rentIncreaseReason || null,
        lease.worksAmount ?? null,
        lease.neighborhoodRent ?? null,
        ...proofIds,
      ]),
      label: "Évolution du loyer",
    },
  ];
  // DPE saisi à la main : à saisir, expiré ou classe interdite à la location = bloquant.
  // Bail commercial : DPE à annexer, sans interdiction de louer selon la classe (propre au logement).
  const dpe = assessDpe(property?.dpeClass, property?.dpeDate, undefined, { commercial: isCommercial });
  // Classe reportée automatiquement depuis les diagnostics lus ; un DPE absent ou expiré est signalé dans « Diagnostics ».
  const dpeBanned = !isCommercial && !!property?.dpeClass && !!property?.dpeDate && !dpe.expired && dpe.blocking;
  // Bail commercial : règles du Code de commerce à la place du plafond et de la relocation en zone tendue.
  const commercialTerms = (lease as any).commercialTerms ?? null;
  const commercialRules = isCommercial ? commercialComplianceRules({ bail: lease, terms: commercialTerms, owner, tenant }) : [];
  const commercialKeys: Record<string, string> = Object.fromEntries(
    commercialRules.map((rule) => [rule.id, pointKey(`rules:commercial:${rule.id}`, rule.values)]),
  );
  const depositWarning = isCommercial
    ? commercialDepositWarning({ rentAmount: lease.rentAmount, securityDeposit: lease.securityDeposit, rentPeriodicity: commercialTerms?.rentPeriodicity })
    : null;
  // Contrôles du registre (immatriculation du locataire, pouvoirs des signataires) : affichés et validés dans le
  // panneau du Kbis de chaque société quand ce Kbis est déposé. Mêmes clés de validation qu'avant.
  const hasKbis = (points: typeof ownerPoints) => points.docRows.some((row) => row.kind === DocumentKind.KBIS && row.documents.length > 0);
  const ownerKbisChecks: KbisCheck[] = [];
  const tenantKbisChecks: KbisCheck[] = [];
  const movedRuleIds = new Set<string>();
  for (const rule of commercialRules) {
    if ((rule.id !== "immatriculation" && rule.id !== "signataires") || rule.view?.kind !== "facts") continue;
    const facts = rule.view.facts;
    const sides = facts.map((fact) => (fact.label === "Propriétaire" ? "owner" : fact.label === "Locataire" ? "tenant" : null));
    // Toutes les sociétés concernées doivent avoir leur Kbis ; sinon le contrôle reste dans « Le bail ».
    if (sides.length === 0 || !sides.every((side) => side && hasKbis(side === "owner" ? ownerPoints : tenantPoints))) continue;
    const key = commercialKeys[rule.id];
    movedRuleIds.add(rule.id);
    facts.forEach((fact, index) => {
      (sides[index] === "owner" ? ownerKbisChecks : tenantKbisChecks).push({
        key,
        label: rule.id === "signataires" ? "Peut signer pour la société" : "Inscription au registre",
        ruleLabel: rule.label,
        value: fact.values.join(" · "),
        tone: fact.tone === "ok" ? "ok" : "warn",
        auto: rule.auto,
        verified: bailLocked || rule.auto || verifiedKeys.has(key),
      });
    });
  }
  const movedRuleKeys = new Set([...movedRuleIds].map((id) => commercialKeys[id]));
  const rulesStates = [
    ...(isCommercial ? [] : withVerified([{ key: rulesPoints[0].key, missing: capMissing }], verifiedKeys, bailLocked || capAuto)),
    // Logement dont la classe DPE est interdite à la location (G, puis F en 2028) : l'envoi au notaire reste bloqué.
    ...withVerified([{ key: "rules:dpe-classe", missing: dpeBanned }], verifiedKeys, true),
    ...(isCommercial ? [] : withVerified([{ key: rulesPoints[1].key, missing: relocMissing }], verifiedKeys, bailLocked || relocAuto)),
    ...commercialRules.flatMap((rule) =>
      withVerified([{ key: commercialKeys[rule.id], missing: rule.missing }], verifiedKeys, bailLocked || rule.auto),
    ),
    // Dépôt de garantie : limite légale contrôlée par le logiciel.
    ...withVerified([{ key: "rules:depot", missing: !depositOk }], verifiedKeys, true),
  ];
  // Pièces obligatoires : rappel dans cette section, mais comptées une seule fois (dans leur section) pour l'avancement.
  const piecesState = withVerified([{ key: "rules:pieces", missing: docsMissing > 0 }], verifiedKeys, true);
  const missingDocGroups = [
    { href: "#bloc-proprietaire", label: (owner?.persons?.length || 0) > 1 ? "Propriétaires" : "Propriétaire", count: missingData?.owner?.totalMissingDocuments || 0 },
    { href: "#bloc-locataire", label: "Locataire", count: missingData?.tenant?.totalMissingDocuments || 0 },
    { href: "#bloc-bien", label: "Le bien", count: missingData?.property?.missingDocuments.length || 0 },
  ].filter((group) => group.count > 0);

  // Paiement des frais de dossier : contrôlé automatiquement (Stripe), bloquant s'il manque.
  // Payé = confirmé par Stripe, ou ancien paiement vérifié et confirmé par l'équipe (règle commune).
  const paid = isBailPaid(lease);
  const historicalPayment = lease.historicalPayment;
  const paidHistorically = paymentKind(lease) === "historical";
  const paidOn = knownPaymentDate(lease);
  const paymentStates = withVerified([{ key: "payment:paid", missing: !paid }], verifiedKeys, true);

  const isVerified = (key: string, locked: boolean) => locked || verifiedKeys.has(key);
  // Même ordre que la page : la conformité légale en tête.
  const sections = [
    { id: "bloc-controles", title: "Conformité légale", summary: summarize([...rulesStates, ...piecesState]) },
    { id: "bloc-bail", title: "Le bail", summary: summarize(bailStates) },
    { id: "bloc-paiement", title: "Paiement", summary: summarize(paymentStates) },
    { id: "bloc-proprietaire", title: (owner?.persons?.length || 0) > 1 ? "Propriétaires" : "Propriétaire", summary: summarize(ownerStates) },
    { id: "bloc-locataire", title: "Locataire", summary: summarize(tenantStates) },
    { id: "bloc-bien", title: "Le bien", summary: summarize(propertyStates) },
  ];
  // Résumé d'une section par son identifiant (l'ordre des sections peut changer).
  const sectionSummary = (id: string) => sections.find((section) => section.id === id)!.summary;
  const overall = summarize([...bailStates, ...paymentStates, ...ownerStates, ...tenantStates, ...propertyStates, ...rulesStates]);
  const totalMissing = Math.max(missingData?.totalMissing ?? 0, overall.missing);

  const sendDisabledReason = !tenant
    ? "Ajoutez d'abord le locataire."
    : !paid
      ? "Les frais de dossier ne sont pas payés."
      : totalMissing > 0
      ? `${totalMissing} élément${totalMissing > 1 ? "s" : ""} manquant${totalMissing > 1 ? "s" : ""}.`
      : overall.remaining > 0
        ? `Encore ${overall.remaining} point${overall.remaining > 1 ? "s" : ""} à valider.`
        : null;

  const reminderData = reminderPanel.success ? reminderPanel.data : null;
  const rentCapNotify = rentCap?.status === "over" && !bailLocked && rentCapLines?.length ? rentCapLines : null;
  // Pièces manquantes, demandées avec la fenêtre « Demander des pièces ». Pas à une personne qui
  // remplit encore son formulaire (il les demande déjà) ni à qui a déjà une demande en cours.
  const formPending = new Set<string>((reminderData?.needs ?? []).filter((n) => n.reason === "OWNER_FORM" || n.reason === "TENANT_FORM").map((n) => n.target));
  if (ownerIntake?.status === "PENDING") formPending.add("OWNER");
  if (tenantIntake?.status === "PENDING") formPending.add("TENANT");
  const requestedFrom = new Set(complementRequests.filter((request) => request.origin === "TEAM").map((request) => request.target));
  const askable = (target: "OWNER" | "TENANT") => !pastVerification && !formPending.has(target) && !requestedFrom.has(target);
  const missingPieces = {
    OWNER: owner && askable("OWNER") ? (missingData?.owner?.totalMissingDocuments || 0) + (missingData?.property?.missingDocuments.length || 0) : 0,
    TENANT: tenant && askable("TENANT") ? missingData?.tenant?.totalMissingDocuments || 0 : 0,
  };
  const pieceTargets = (["OWNER", "TENANT"] as const).filter((target) => missingPieces[target] > 0);
  const piecesCount = missingPieces.OWNER + missingPieces.TENANT;
  // Informations manquantes (mêmes règles que le formulaire), demandées dans la même fenêtre que les pièces.
  const missingInfos = {
    OWNER: owner && askable("OWNER") ? missingFieldCounts.OWNER : 0,
    TENANT: tenant && askable("TENANT") ? missingFieldCounts.TENANT : 0,
  };
  const askTargets = (["OWNER", "TENANT"] as const).filter((target) => missingPieces[target] + missingInfos[target] > 0);
  const askWhat = complementCountLabel([
    ...Array.from({ length: missingPieces.OWNER + missingPieces.TENANT }, () => ({ kind: "DOCUMENT" as const })),
    ...Array.from({ length: missingInfos.OWNER + missingInfos.TENANT }, () => ({ kind: "FIELD" as const })),
  ]);
  const piecesLabel =
    askTargets.length > 1
      ? `Demander ${askWhat}`
      : askTargets.length === 1
        ? `Demander ${askWhat} au ${askTargets[0] === "OWNER" ? "propriétaire" : "locataire"}`
        : null;
  const remind = reminderData && stage.key !== "clos" ? remindAction(reminderData, !!rentCapNotify, !!piecesLabel) : null;
  // « Demander » sur une pièce manquante : même fenêtre, ouverte sur les éléments manquants de cette personne.
  const stepItems = STAGE_ORDER.filter((key) => key !== "clos" || stage.key === "clos");
  const progress = overall.total > 0 ? Math.round((overall.verified / overall.total) * 100) : 0;
  const ctaHelp = pastVerification
    ? "Dossier validé et transmis au notaire."
    : !tenant
      ? "Bouton bloqué : ajoutez d'abord le locataire."
      : !paid
        ? "Bouton bloqué : les frais de dossier ne sont pas payés (ils se règlent à la fin du formulaire propriétaire)."
        : totalMissing > 0
        ? `Bouton bloqué : ${totalMissing} élément${totalMissing > 1 ? "s" : ""} manquant${totalMissing > 1 ? "s" : ""}. Demandez-${totalMissing > 1 ? "les" : "le"} au client ou saisissez-${totalMissing > 1 ? "les" : "le"} si vous ${totalMissing > 1 ? "les " : "l'"}avez obtenu${totalMissing > 1 ? "s" : ""} par téléphone.`
        : overall.remaining > 0
          ? `Encore ${overall.remaining} point${overall.remaining > 1 ? "s" : ""} à valider avant l'envoi au notaire.`
          : "Tout est vérifié : le dossier peut partir chez le notaire.";

  // ---- Présentation « une page » (maquette A) : rien de nouveau n'est calculé ni enregistré ----
  // Lignes déjà réclamées au client (demandes en cours), par clé de la fenêtre « Demander ».
  const claims: Record<string, FicheClaim> = {};
  for (const request of complementRequests) {
    for (const item of request.items) {
      if (item.status === "ACCEPTED") continue;
      claims[item.key] = {
        status: item.status === "PROVIDED" ? "PROVIDED" : "PENDING",
        target: request.target as "OWNER" | "TENANT",
        origin: request.origin as "TEAM" | "NOTAIRE",
        reason: item.reason,
        sentAt: request.lastSentAt,
        submittedAt: request.submittedAt,
        requestId: request.id,
        requestStatus: request.status,
        email: request.recipientEmail,
        sentCount: request.sentCount,
        item,
      };
    }
  }
  const bailClaimKeys = (fields: string[]) =>
    questionsForDataFields("bail", fields, { commercial: isCommercial }).map((qid) => fieldComplementKey(qid, { bailId: lease.id }));
  const propertyClaimKeys = property
    ? questionsForDataFields("property", ["fullAddress", "surfaceM2", "type", "legalStatus", "inShoppingCenter"], { commercial: isCommercial }).map((qid) =>
        fieldComplementKey(qid, { propertyId: property.id }),
      )
    : [];
  // Contrôles du logiciel, en pastilles sur la ligne du loyer et du dépôt (le détail reste dans « Le bail »).
  const rentTags = (
    <>
      {!isCommercial && rentCap && (
        <RuleTag tone={capMissing ? "bad" : capAuto ? "ok" : "warn"}>
          {capMissing
            ? rentCap.status === "missing"
              ? "Plafond : informations à compléter"
              : "Au-dessus du plafond de loyer"
            : capAuto
              ? rentCap.status === "ok"
                ? "✓ Sous le plafond de loyer"
                : "✓ Pas d'encadrement des loyers ici"
              : "Plafond de loyer : à vérifier ci-dessous"}
        </RuleTag>
      )}
      {!isCommercial && relocation && (
        <RuleTag tone={relocMissing ? "bad" : relocAuto ? "ok" : "warn"}>
          {relocMissing ? "Hausse du loyer à revoir (zone tendue)" : relocAuto ? "✓ Hors zone tendue" : "Zone tendue : à vérifier ci-dessous"}
        </RuleTag>
      )}
      {lease.tenantConfirmedTermsAt ? (
        <RuleTag tone="ok">✓ Confirmé par le locataire le {formatDate(lease.tenantConfirmedTermsAt)}</RuleTag>
      ) : (lease as any).tenantReconfirmationRequestedAt ? (
        <RuleTag tone="warn">Accord du locataire à redonner</RuleTag>
      ) : null}
    </>
  );
  const depositTags = isCommercial ? (
    depositWarning ? <RuleTag tone="warn">{depositWarning}</RuleTag> : null
  ) : (
    <RuleTag tone={depositOk ? "ok" : "bad"}>
      {depositOk
        ? `✓ Dans la limite légale (${isMeuble ? "2 mois en meublé" : "1 mois en location vide"})`
        : `Au-dessus de la limite légale de ${formatCurrency(maxDeposit)}`}
    </RuleTag>
  );
  const contactOf = (party: any) => {
    if (!party) return { phone: null as string | null, email: null as string | null };
    const person = party.type === "PERSONNE_MORALE" ? null : (party.persons?.find((p: any) => p.isPrimary) ?? party.persons?.[0]);
    return {
      phone: (person?.phone || party.entreprise?.phone || null) as string | null,
      email: (person?.email || party.entreprise?.email || null) as string | null,
    };
  };
  const ownerContact = contactOf(owner);
  const tenantContact = contactOf(tenant);

  // « Le bail » réunit le bail et ses contrôles légaux (pièces obligatoires : dans « À faire »).
  const bailAndRules = summarize([...bailStates, ...rulesStates.filter((st) => !movedRuleKeys.has(st.key))]);

  // « À faire avant l'envoi » : une ligne par chose qui attend, avec son bouton.
  const WHO_OF = { OWNER: "propriétaire", TENANT: "locataire" } as const;
  const fmtShort = (iso: string) => formatDate(iso).slice(0, 5);
  const todoRows: Array<{ key: string; tone: "action" | "wait" | "todo" | "done"; text: ReactNode; meta?: ReactNode; action?: ReactNode }> = [];
  for (const request of complementRequests) {
    const who = WHO_OF[request.target as "OWNER" | "TENANT"];
    const received = request.items.filter((item) => item.status === "PROVIDED");
    const waiting = request.items.filter((item) => item.status === "PENDING");
    const byNotary = request.origin === "NOTAIRE";
    if (received.length > 0) {
      todoRows.push({
        key: `recu-${request.id}`,
        tone: byNotary ? "wait" : "action",
        text: byNotary ? `Le ${who} a répondu au notaire` : `Le ${who} a répondu`,
        meta: (
          <>
            {complementCountLabel(received.map((item) => ({ kind: item.type })))} à contrôler{byNotary ? " par le notaire" : ""}
            {request.submittedAt ? (
              <>
                {" · reçu "}
                <Since iso={request.submittedAt} />
              </>
            ) : null}
          </>
        ),
        action: byNotary ? undefined : (
          <a href="#demandes" className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90">
            Contrôler
          </a>
        ),
      });
    }
    if (waiting.length > 0 && request.status === "OPEN") {
      todoRows.push({
        key: `attente-${request.id}`,
        tone: "wait",
        // « pièce » et « information » sont féminins : réclamée, réclamées.
        text: `${complementCountLabel(waiting.map((item) => ({ kind: item.type })))} ${byNotary ? "demandée" : "réclamée"}${waiting.length > 1 ? "s" : ""}${byNotary ? " par le notaire" : ""} au ${who}`,
        meta: (
          <>
            {"envoyée "}
            <Since iso={request.createdAt} />
            {request.sentCount > 1 ? (
              <>
                {` · relancée ${request.sentCount - 1} fois, dernière `}
                <Since iso={request.lastSentAt} />
              </>
            ) : null}
          </>
        ),
        action: byNotary || pastVerification ? undefined : <RemindRequestButton requestId={request.id} email={request.recipientEmail} />,
      });
    }
  }
  if (!tenant && !pastVerification) {
    todoRows.push({ key: "locataire", tone: "action", text: "Ajouter le locataire", action: <TenantCreateButton bailId={lease.id} variant="outline" className="h-9" /> });
  }
  if (remind && reminderData) {
    todoRows.push({
      key: "relance",
      tone: "action",
      text: remind.title,
      action: (
        <RemindButton
          bailId={lease.id}
          label="Relancer"
          title={remind.title}
          focus="all"
          size="sm"
          icon={remind.icon === "tenant" ? <UserPlus className="size-4" /> : remind.icon === "rent" ? <Euro className="size-4" /> : <BellRing className="size-4" />}
          initialPanel={reminderData}
          rentCapLines={rentCapNotify}
          className="h-9"
        />
      ),
    });
  }
  if (!paid) {
    todoRows.push({
      key: "paiement",
      tone: "action",
      text: "Frais de dossier non payés",
      meta: openPayments.length > 0 ? "paiement Stripe en cours de vérification" : historicalPayment?.status === "PENDING" ? "ancien paiement à vérifier" : undefined,
      action: (
        <a href="#bloc-paiement" className="inline-flex h-9 items-center rounded-md border px-3 text-[13px] font-semibold hover:bg-muted">
          Voir
        </a>
      ),
    });
  }
  if (docsMissing > 0) {
    todoRows.push({
      key: "pieces",
      tone: piecesLabel ? "action" : "wait",
      text: `${docsMissing} pièce${docsMissing > 1 ? "s" : ""} manquante${docsMissing > 1 ? "s" : ""}`,
      meta: missingDocGroups.map((group) => `${group.label} · ${group.count}`).join(" · "),
      action:
        askTargets.length > 0 && piecesLabel ? (
          <ComplementRequestButton bailId={lease.id} target={askTargets[0]} alsoTarget={askTargets[1]} label="Demander" icon={<FileUp className="size-4" />} />
        ) : undefined,
    });
  } else if (piecesLabel && askTargets.length > 0) {
    todoRows.push({
      key: "infos",
      tone: "action",
      text: piecesLabel.replace(/^Demander /, "").replace(/^./, (c) => c.toUpperCase()) + " à demander",
      action: <ComplementRequestButton bailId={lease.id} target={askTargets[0]} alsoTarget={askTargets[1]} label="Demander" icon={<FileUp className="size-4" />} />,
    });
  }
  if (!isCommercial && (lease as any).tenantReconfirmationRequestedAt && !lease.tenantConfirmedTermsAt) {
    todoRows.push({
      key: "accord",
      tone: "wait",
      text: "Accord du locataire à redonner",
      meta: (
        <>
          {"conditions ou locataire modifiés "}
          <Since iso={(lease as any).tenantReconfirmationRequestedAt} />
        </>
      ),
      action: (
        <a href="#bloc-bail" className="inline-flex h-9 items-center rounded-md border px-3 text-[13px] font-semibold hover:bg-muted">
          Voir
        </a>
      ),
    });
  }
  if (!isCommercial && isMeuble && property && furniturePresent < FURNITURE.length) {
    todoRows.push({
      key: "meuble",
      tone: "action",
      text: `Meublé : ${FURNITURE.length - furniturePresent} équipement${FURNITURE.length - furniturePresent > 1 ? "s" : ""} non coché${FURNITURE.length - furniturePresent > 1 ? "s" : ""}`,
      action: (
        <a href="#bloc-bien" className="inline-flex h-9 items-center rounded-md border px-3 text-[13px] font-semibold hover:bg-muted">
          Voir
        </a>
      ),
    });
  }
  if (!pastVerification && diagnosticState && diagnosticState.counts.toFix + diagnosticState.counts.toCheck > 0) {
    todoRows.push({
      key: "diagnostics",
      tone: "action",
      text: "Diagnostics",
      meta: [
        diagnosticState.counts.toFix ? `${diagnosticState.counts.toFix} à remplacer` : null,
        diagnosticState.counts.toCheck ? `${diagnosticState.counts.toCheck} à vérifier` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      action: (
        <a href="#bloc-pieces" className="inline-flex h-9 items-center rounded-md border px-3 text-[13px] font-semibold hover:bg-muted">
          Voir
        </a>
      ),
    });
  }
  // Pièces : contrôlées dans « Pièces du dossier » ; les sections ne comptent ici que leurs informations.
  // Données prouvées par une pièce (identité, société, situation familiale) : vérifiées avec elle.
  const linkedKeys = [...partyPieceRows(ownerPoints, ownerLocked, verifiedKeys, ownerKbisChecks), ...partyPieceRows(tenantPoints, tenantLocked, verifiedKeys, tenantKbisChecks)].flatMap(
    (row) => row.linkedPoints?.map((linked) => linked.key) ?? [],
  );
  const pieceKeys = new Set([...Object.values(ownerPoints.docKeys), ...Object.values(tenantPoints.docKeys), ...Object.values(propertyDocKeys), ...linkedKeys]);
  const withoutPieces = (states: Array<{ key: string; missing: boolean; verified: boolean }>) => states.filter((st) => !pieceKeys.has(st.key));
  const piecesSummary = summarize([...ownerStates, ...tenantStates, ...propertyStates, ...rulesStates].filter((st) => pieceKeys.has(st.key)));
  for (const section of [
    { id: "bloc-pieces", title: "Pièces du dossier", summary: { ...piecesSummary, missing: 0 }, show: true },
    { id: "bloc-proprietaire", title: (owner?.persons?.length || 0) > 1 ? "Propriétaires" : "Propriétaire", summary: summarize(withoutPieces(ownerStates)), show: !!owner },
    { id: "bloc-locataire", title: "Locataire", summary: summarize(withoutPieces(tenantStates)), show: !!tenant },
    { id: "bloc-bien", title: "Le bien", summary: summarize(withoutPieces(propertyStates)), show: !!property },
    { id: "bloc-bail", title: "Le bail", summary: bailAndRules, show: true },
  ]) {
    if (!section.show || (section.summary.remaining === 0 && section.summary.missing === 0)) continue;
    todoRows.push({
      key: section.id,
      tone: "todo",
      text: section.title,
      meta: [
        section.summary.remaining > 0 ? `${section.summary.remaining} point${section.summary.remaining > 1 ? "s" : ""} à vérifier` : null,
        section.summary.missing > 0 ? `${section.summary.missing} manquant${section.summary.missing > 1 ? "s" : ""}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      action: (
        <a href={`#${section.id}`} className="inline-flex h-9 items-center px-2 text-[13px] font-semibold text-primary hover:underline">
          Vérifier →
        </a>
      ),
    });
  }
  const verificationOf = (keys: Record<string, string>, locked: boolean) => ({
    bailId: lease.id,
    locked,
    points: Object.fromEntries(Object.entries(keys).map(([rowKey, key]) => [rowKey, { pointKey: key, verified: isVerified(key, locked) }])),
  });
  const pieceGroups: PieceGroup[] = [
    ...(owner
      ? [
          {
            id: "pieces-proprietaire",
            title: (owner?.persons?.length || 0) > 1 ? "Propriétaires" : "Propriétaire",
            name: ownerName,
            rows: partyPieceRows(ownerPoints, ownerLocked, verifiedKeys, ownerKbisChecks),
            verification: verificationOf(ownerPoints.docKeys, ownerLocked),
            complement: pastVerification ? undefined : { bailId: lease.id, target: "OWNER" as const },
            editable: !ownerLocked,
          },
        ]
      : []),
    ...(tenant
      ? [
          {
            id: "pieces-locataire",
            title: "Locataire",
            name: tenantName,
            rows: partyPieceRows(tenantPoints, tenantLocked, verifiedKeys, tenantKbisChecks),
            verification: verificationOf(tenantPoints.docKeys, tenantLocked),
            complement: pastVerification ? undefined : { bailId: lease.id, target: "TENANT" as const },
            editable: !tenantLocked,
          },
        ]
      : []),
    ...(property
      ? [
          {
            id: "pieces-logement",
            title: "Le logement",
            rows: propertyDocRows.map((row) => ({
              ...row,
              compare: row.kind === DocumentKind.TITLE_DEED && ownerName ? `Propriétaire déclaré : ${ownerName}` : undefined,
            })),
            verification: verificationOf(propertyDocKeys, propertyLocked),
            complement: propertyLocked ? undefined : { bailId: lease.id, target: "OWNER" as const },
            editable: !propertyLocked,
          },
        ]
      : []),
    ...(bailDocRows.length > 0
      ? [
          {
            id: "pieces-bail",
            title: "Le bail",
            rows: bailDocRows,
            complement: pastVerification ? undefined : { bailId: lease.id, target: "OWNER" as const },
            editable: true,
          },
        ]
      : []),
  ];

  // Contrôles légaux (plafond, relocation, règles du bail commercial) : dans « Le bail », et repris tels quels
  // dans le parcours « Commencer la vérification ».
  const legalChecks = (
    <>
                {!isCommercial && (
                <>
                <CheckPoint
                  state={capMissing ? "missing" : isVerified(rulesPoints[0].key, bailLocked || capAuto) ? "ok" : "todo"}
                  label={capAuto && !bailLocked ? <AutoLabel>Plafond de loyer</AutoLabel> : "Plafond de loyer"}
                  foldable={capAuto && !capMissing}
                  actionsBelow
                  verify={capAuto ? undefined : { bailId: lease.id, pointKey: rulesPoints[0].key, verified: isVerified(rulesPoints[0].key, bailLocked), locked: bailLocked }}
                  note={
                    !rentCap
                      ? null
                      : rentRules?.supplement.forbidden
                        ? `Complément de loyer interdit (logement classé F ou G) : loyer à ramener à ${formatCurrency(rentRules.supplement.base ?? 0)} au plus`
                      : rentCap.status === "missing"
                        ? `À saisir : ${rentCap.missing.join(", ")}`
                        : rentCap.status === "over" && !rentCap.supplement
                          ? rentCap.validity === "in"
                            ? `Au-dessus du plafond de ${formatCurrency(rentCap.overBy ?? 0)} par mois : à corriger, ou complément de loyer à justifier`
                            : `Au-dessus du plafond de cet arrêté de ${formatCurrency(rentCap.overBy ?? 0)} par mois : vérifiez l'arrêté applicable à la date du bail`
                          : null
                  }
                  actions={
                    !bailLocked && (!!rentCap?.territory || rentCap?.status === "over" || !!lease.rentSupplementReason || (!capMissing && capAuto)) ? (
                    <>
                      {property && rentCap?.territory && rentCap.status !== "no_data" && rentCap.notConcerned !== "exempt" && !bailLocked && (
                        <RentCapEditor
                          propertyId={property.id}
                          periods={rentCap.territory.periods}
                          zones={rentCap.territory.zones}
                          zoneMode={rentCap.territory.zoneMode}
                          detectedZone={rentCap.zone && rentCap.zone.source !== "manual" ? rentCap.zone.label : null}
                          allowOutside={rentCap.territory.partialCommune}
                          zoneHint={
                    rentCap.zoneHint ? (rentCap.zoneHint.kind === "limit" ? rentCap.zoneHint.label : `${rentCap.zoneHint.label} ou hors du périmètre`) : null
                  }
                          values={{ mainRooms: property.mainRooms, constructionPeriod: property.constructionPeriod, rentCapZone: property.rentCapZone }}
                        />
                      )}
                      {rentCap?.territory && !bailLocked && (
                        <RentCapExemptionButton bailId={lease.id} exemption={lease.rentCapExemption} note={lease.rentCapExemptionNote} />
                      )}
                      {(rentCap?.status === "over" || lease.rentSupplementReason) && !bailLocked && (
                        <RentSupplementButton bailId={lease.id} reason={lease.rentSupplementReason} />
                      )}
                      {!capMissing && capAuto && !bailLocked && <AutoVerified />}
                    </>
                    ) : null
                  }
                >
                  <span className="flex flex-col gap-1">
                    {!rentCap || !rentCap.territory ? (
                      <>
                        <span>
                          {lease.rentAmount > 0
                            ? `${formatCurrency(lease.rentAmount)} hors charges${surface ? ` pour ${formatSurface(surface)}, soit ${(lease.rentAmount / surface).toFixed(2).replace(".", ",")} €/m²` : ""}.`
                            : "Loyer non renseigné."}
                        </span>
                        <span className="text-muted-foreground">
                          {rentCap?.referentialUnavailable
                            ? "Référentiel des loyers indisponible : contrôle de l'encadrement impossible pour le moment. Le dossier ne peut pas partir chez le notaire tant que les barèmes ne sont pas importés et vérifiés."
                            : rentCap?.notConcerned === "commercial"
                            ? "Bail commercial : l'encadrement des loyers ne s'applique pas."
                            : property?.inseeCode
                              ? "Commune non soumise à l'encadrement des loyers : pas de plafond à respecter."
                              : "Adresse non localisée : vérifiez si la commune est soumise à l'encadrement des loyers."}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          {rentCap.territory.label}
                          {rentCap.status !== "no_data" && rentCap.notConcerned !== "exempt" ? ` · ${describeRentCapZone(rentCap)}` : ""}
                        </span>
                        {rentCap.effectiveDateMissing && (
                          <span className="font-semibold text-amber-800">
                            Date de prise d&apos;effet non renseignée : plafond calculé avec l&apos;arrêté en vigueur aujourd&apos;hui, à titre
                            indicatif. Il sera recalculé quand la date sera saisie.
                          </span>
                        )}
                        {rentCap.notConcerned === "exempt" && (
                          <span className="font-semibold text-amber-800">
                            Logement exclu de l&apos;encadrement : {EXEMPTION_LABELS[rentCap.exemption?.code || ""] || rentCap.exemption?.code}
                            {rentCap.exemption?.note ? ` (${rentCap.exemption.note})` : ""}
                            {lease.rentCapExemptionAt ? `, indiqué le ${formatDate(lease.rentCapExemptionAt)}` : ""}
                            {lease.rentCapExemptionByName ? ` par ${lease.rentCapExemptionByName}` : ""}. Pas de plafond à respecter.
                          </span>
                        )}
                        {rentCap.notConcerned === "outside_perimeter" && (
                          <span className="text-muted-foreground">
                            Commune encadrée en partie seulement : ce logement n&apos;a pas de plafond à respecter.
                          </span>
                        )}
                        {rentCap.status === "no_data" && (
                          <>
                            <span>
                              {lease.rentAmount > 0 && surface
                                ? `Loyer : ${formatCurrency(lease.rentAmount)} hors charges, soit ${(lease.rentAmount / surface).toFixed(2).replace(".", ",")} €/m².`
                                : "Loyer ou surface non renseigné."}
                            </span>
                            <span className="font-semibold text-amber-800">
                              Barème officiel pas encore intégré : comparez avec le simulateur officiel, puis validez.
                            </span>
                          </>
                        )}
                        {(rentCap.status === "missing" || rentCap.status === "ok" || rentCap.status === "over") && (
                          <span className="text-muted-foreground">
                            {[
                              property?.mainRooms ? ROOMS_LABELS[Math.min(4, property.mainRooms)] : "pièces ?",
                              property?.constructionPeriod ? (PERIOD_LABELS[property.constructionPeriod] || property.constructionPeriod).toLowerCase() : "époque ?",
                              rentCap.furnished ? "meublé" : "non meublé",
                              rentCap.territory.houseTypes ? (property?.type === "MAISON" ? "maison" : property?.type === "APPARTEMENT" ? "appartement" : "type ?") : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                        {rentCap.reference && rentCap.maxRent != null && (
                          <>
                            <span>
                              Loyer : {formatCurrency(rentCap.rent)} hors charges, soit {(rentCap.rentPerM2 ?? 0).toFixed(2).replace(".", ",")} €/m²
                            </span>
                            <span>
                              Plafond (loyer de référence majoré) : {rentCap.reference.max.toFixed(2).replace(".", ",")} €/m², soit{" "}
                              <strong className="font-semibold">{formatCurrency(rentCap.maxRent)}</strong> au maximum
                            </span>
                            {rentCap.status === "ok" && (
                              <span className="font-semibold text-green-700">
                                Conforme : {formatCurrency(Math.abs(rentCap.overBy ?? 0))} sous le plafond
                              </span>
                            )}
                          </>
                        )}
                        {lease.rentSupplementReason && rentCap.status === "over" && (
                          <span className="font-semibold text-amber-800">
                            Complément de loyer justifié
                            {lease.rentSupplementAt ? ` le ${formatDate(lease.rentSupplementAt)}` : ""}
                            {lease.rentSupplementByName ? ` par ${lease.rentSupplementByName}` : ""} : {lease.rentSupplementReason}
                            {rentRules?.supplement.amount != null && rentRules.supplement.base != null
                              ? ` (loyer de base ${formatCurrency(rentRules.supplement.base)} + complément ${formatCurrency(rentRules.supplement.amount)})`
                              : ""}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Arrêté en vigueur du {formatDate(rentCap.territory.validFrom)} au {formatDate(rentCap.territory.validTo)} · barème
                          intégré le {formatDate(rentCap.territory.importedAt)} ·{" "}
                          <a href={rentCap.territory.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                            {rentCap.territory.mapUrl === rentCap.territory.sourceUrl ? "texte officiel et cartes des zones" : "texte officiel"}
                          </a>
                          {rentCap.territory.simulatorUrl && (
                            <>
                              {" · "}
                              <a href={rentCap.territory.simulatorUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                simulateur officiel
                              </a>
                            </>
                          )}
                          {rentCap.territory.mapUrl && rentCap.territory.mapUrl !== rentCap.territory.sourceUrl && (
                            <>
                              {" · "}
                              <a href={rentCap.territory.mapUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                cartes des zones
                              </a>
                            </>
                          )}
                        </span>
                        {rentCap.notConcerned !== "exempt" && rentCap.notConcerned !== "outside_perimeter" && rentCap.validity === "after" && (
                          <span className="text-[13px] font-semibold text-amber-800">
                            Le bail prend effet le {formatDate(lease.effectiveDate)}, après la fin de cet arrêté : vérifiez s&apos;il est
                            prolongé ou remplacé, puis validez à la main.
                          </span>
                        )}
                        {rentCap.notConcerned !== "exempt" && rentCap.notConcerned !== "outside_perimeter" && rentCap.validity === "before" && (
                          <span className="text-[13px] font-semibold text-amber-800">
                            Le bail prend effet le {formatDate(lease.effectiveDate)}, avant cet arrêté : c&apos;est l&apos;arrêté précédent qui
                            s&apos;applique. Vérifiez avec le simulateur officiel, puis validez à la main.
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </CheckPoint>
                <CheckPoint
                  state={relocMissing ? "missing" : isVerified(rulesPoints[1].key, bailLocked || relocAuto) ? "ok" : "todo"}
                  label={relocAuto && !bailLocked ? <AutoLabel>Évolution du loyer (zone tendue)</AutoLabel> : "Évolution du loyer (zone tendue)"}
                  foldable={relocAuto && !relocMissing}
                  actionsBelow
                  verify={relocAuto ? undefined : { bailId: lease.id, pointKey: rulesPoints[1].key, verified: isVerified(rulesPoints[1].key, bailLocked), locked: bailLocked }}
                  note={
                    !relocation
                      ? null
                      : relocation.status === "over"
                        ? `Au-dessus du maximum à la relocation de ${formatCurrency(relocation.overBy ?? 0)} par mois : loyer à corriger`
                        : relocation.status === "missing" && !relocation.undeclared
                          ? `À compléter : ${relocation.missing.join(", ")}`
                          : missingProofs.length
                            ? `Justificatif${missingProofs.length > 1 ? "s" : ""} à demander : ${missingProofs.map((kind) => PROOF_LABELS[kind]?.label.toLowerCase()).join(", ")}`
                            : null
                  }
                  actions={
                    !bailLocked && ((!!relocation && relocation.notConcerned === null) || (!relocMissing && relocAuto)) ? (
                      <>
                        {relocation && relocation.notConcerned === null && relocMissing && owner && (
                          <AskFieldsButton bailId={lease.id} target="OWNER" scope="bail" targetId={lease.id} fields={["relocationLetBefore"]} />
                        )}
                        {relocation && relocation.notConcerned === null && (
                          <RentRulesEditor bailId={lease.id} values={rentRulesToForm(lease)} missing={relocation.undeclared} />
                        )}
                        {!relocMissing && relocAuto && <AutoVerified />}
                      </>
                    ) : null
                  }
                >
                  <span className="flex flex-col gap-1">
                    {!relocation ? (
                      <span className="text-muted-foreground">Bien non renseigné.</span>
                    ) : relocation.notConcerned ? (
                      <span className="text-muted-foreground">
                        {relocation.notConcerned === "commercial"
                          ? "Bail commercial : non concerné."
                          : relocation.notConcerned === "no_address"
                            ? "Adresse non localisée : vérifiez si la commune est en zone tendue."
                            : "Commune hors zone tendue : le loyer est libre à la relocation."}
                      </span>
                    ) : (
                      <>
                        <span className="text-muted-foreground">
                          Commune en zone tendue : à la relocation, le loyer ne peut pas dépasser celui du locataire précédent, sauf exceptions
                          (décret n° 2017-1198).
                        </span>
                        {relocation.undeclared && (
                          <span className="font-semibold text-amber-800">
                            Questions non renseignées (dossier créé avant ces questions) : complétez-les avec le propriétaire.
                          </span>
                        )}
                        {relocation.situation === "first" && <span>Première mise en location, déclarée par le propriétaire.</span>}
                        {(relocation.situation === "relet" || relocation.situation === "vacant") && lease.previousTenantLeftAt && (
                          <span>
                            Départ du locataire précédent le {formatDate(lease.previousTenantLeftAt)}
                            {relocation.situation === "vacant" ? ` : logement vide depuis ${VACANCY_MONTHS} mois ou plus.` : "."}
                          </span>
                        )}
                        {relocationSummaryLines(relocation).map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                        {relocation.status === "ok" && (
                          <span className="font-semibold text-green-700">
                            Conforme : {formatCurrency(Math.abs(relocation.overBy ?? 0))} sous le maximum
                          </span>
                        )}
                        {relocation.proofs.length > 0 && (
                          <span className="text-[13px]">
                            Justificatifs :{" "}
                            {relocation.proofs
                              .map((kind) => `${PROOF_LABELS[kind]?.label.toLowerCase()} (${bailDocKinds.has(kind) ? "reçu" : "à demander"})`)
                              .join(", ")}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </CheckPoint>
                </>
                )}
                {commercialRules.filter((rule) => !movedRuleIds.has(rule.id)).map((rule) => {
                  const key = commercialKeys[rule.id];
                  const locked = bailLocked || rule.auto;
                  const verified = !rule.missing && isVerified(key, locked);
                  return (
                    <CheckPoint
                      key={rule.id}
                      state={rule.missing ? "missing" : verified ? "ok" : "todo"}
                      label={rule.auto && !bailLocked ? <AutoLabel>{rule.label}</AutoLabel> : rule.label}
                      foldable={rule.auto && !rule.missing}
                      // Boutons sous le contenu : le tableau garde toute la largeur.
                      actionsBelow
                      note={rule.note}
                      verify={rule.auto ? undefined : { bailId: lease.id, pointKey: key, verified, locked: bailLocked }}
                      actions={
                        !bailLocked && rule.editsTerms ? (
                          <>
                            {rule.editsTerms && <EditTermsLink row={TERMS_ROW_FOR_RULE[rule.id] ?? "activity"} />}
                            {!rule.missing && rule.auto && <AutoVerified />}
                          </>
                        ) : null
                      }
                    >
                      <span className="flex flex-col gap-1.5">
                        {rule.view && <RuleViewBlock view={rule.view} />}
                        {rule.warnings.map((line) => (
                          <span key={line} className="text-[13px] leading-snug text-amber-800">
                            {line}
                          </span>
                        ))}
                        {rule.legal && <span className="text-xs text-muted-foreground">{rule.legal}</span>}
                      </span>
                    </CheckPoint>
                  );
                })}
    </>
  );
  const legalPending = bailLocked ? 0 : summarize(rulesStates.filter((st) => !movedRuleKeys.has(st.key))).pendingKeys.length;
  // Réponses du parcours : informations reçues (les pièces reçues sont des étapes « pièce »).
  const answers = pastVerification
    ? []
    : complementRequests
        .filter((request) => request.origin === "TEAM")
        .flatMap((request) =>
          request.items
            .filter((item) => item.status === "PROVIDED" && !item.kind)
            .map((item) => ({ target: request.target as "OWNER" | "TENANT", item })),
        );
  // Relances du parcours : demandes de l'équipe encore sans réponse.
  const relances = pastVerification
    ? []
    : complementRequests
        .filter((request) => request.origin === "TEAM" && request.status === "OPEN" && request.items.some((item) => item.status === "PENDING"))
        .map((request) => {
          const waiting = request.items.filter((item) => item.status === "PENDING");
          return {
            requestId: request.id,
            target: request.target as "OWNER" | "TENANT",
            email: request.recipientEmail,
            createdAt: request.createdAt,
            lastSentAt: request.lastSentAt,
            sentCount: request.sentCount,
            what: `${complementCountLabel(waiting.map((item) => ({ kind: item.type })))} réclamée${waiting.length > 1 ? "s" : ""}`,
            labels: waiting.map((item) => item.label),
          };
        });

  const receivedCount = complementRequests.reduce((n, r) => n + r.items.filter((item) => item.status === "PROVIDED").length, 0);
  const waitingCount = complementRequests.reduce((n, r) => n + r.items.filter((item) => item.status === "PENDING").length, 0);

  return (
    <FicheProvider claims={claims}>
    <FicheAutoRefresh />
    <div className="flex flex-col gap-5 pb-10">
      {/* En-tête collant (statique sur téléphone) : qui, quoi, contacter, agir */}
      <div className="-mx-4 -mt-6 flex flex-col gap-3 border-b bg-background/95 px-4 pb-4 pt-5 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:-mx-6 sm:px-6 md:sticky md:top-16 md:z-30 lg:-mx-8 lg:px-8">
        <Link href="/interface/baux" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" />
          Dossiers
        </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex h-[30px] items-center whitespace-nowrap rounded-lg px-2.5 text-[13.5px] font-semibold sm:px-3", stage.className)}>{stage.label}</span>
              {lease.paidAt ? (
                <span className="inline-flex h-[30px] items-center gap-1 whitespace-nowrap rounded-lg bg-green-100 px-2.5 text-[13.5px] sm:gap-1.5 sm:px-3 font-semibold text-green-800">
                  <Check className="size-4" strokeWidth={3} />
                  Frais payés le {formatDate(lease.paidAt).slice(0, 5)}
                  {/* Montant contrôlé côté serveur : 39,90 €, ou 59,90 € pour un bail commercial. */}
                  {lease.stripePaymentIntentId ? ` · ${formatDossierFee(lease.bailFamily)}` : ""}
                </span>
              ) : paidHistorically ? (
                <span className="inline-flex min-h-[30px] items-center gap-1 rounded-lg bg-green-100 px-2.5 py-1 text-[13.5px] sm:gap-1.5 sm:px-3 font-semibold text-green-800">
                  <Check className="size-4 shrink-0" strokeWidth={3} />
                  {paidOn ? `Frais payés le ${formatDate(paidOn)} (paiement historique confirmé)` : HISTORICAL_PAID_LABEL}
                </span>
              ) : (
                <span className="inline-flex h-[30px] items-center gap-1 whitespace-nowrap rounded-lg bg-red-100 px-2.5 text-[13.5px] sm:gap-1.5 sm:px-3 font-semibold text-red-800">
                  <CreditCard className="size-4" />
                  Frais de dossier non payés
                </span>
              )}
              {/* Sur téléphone : les deux pastilles côte à côte, le statut en dessous. */}
              <span className="basis-full text-[13px] text-muted-foreground sm:basis-auto">
                {STATUS_LABELS[lease.status as keyof typeof STATUS_LABELS] || lease.status}
                {isActiveStage(stage.key) && (
                  <>
                    {" · "}
                    <span className={cn(waitingDays > STALE_AFTER_DAYS && "font-semibold text-red-700")}>
                      {waitingDays === 0 ? "activité aujourd'hui" : `depuis ${waitingDays} jour${waitingDays > 1 ? "s" : ""}`}
                    </span>
                  </>
                )}
                {nextAction.actor !== "personne" && ` · ${WAITING_ON[nextAction.actor] || ACTOR_LABELS[nextAction.actor].toLowerCase()}`}
              </span>
            </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="break-words text-[24px] font-bold leading-tight tracking-tight">
              {property?.fullAddress || property?.label || `Bail #${lease.id.slice(-8).toUpperCase()}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {BAIL_TYPE_LABELS[lease.bailType] || lease.bailType} · {BAIL_FAMILY_LABELS[lease.bailFamily] || lease.bailFamily} · Réf. #{lease.id.slice(-8).toUpperCase()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BailMoreMenu
              bailId={lease.id}
              status={lease.status}
              tenant={tenant && tenantName ? { id: tenant.id, name: tenantName } : null}
              canChangeTenant={!!tenant && !pastVerification}
              triggerClassName="h-10 gap-1.5 px-3"
              currentNotaire={followUp.notaire ? { id: followUp.notaire.id, name: followUp.notaire.name } : null}
            />
            {canSend && (
              <SendToNotaryButton
                bailId={lease.id}
                assignedNotaireName={followUp.notaire?.name}
                disabledReason={sendDisabledReason}
                label={lease.status === BailStatus.READY_FOR_NOTARY ? "Assigner un notaire" : "Envoyer au notaire"}
                hideReason
              />
            )}
          </div>
        </div>
        {/* Les personnes du dossier : appeler, écrire, demander une pièce */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ContactCard
            role={(owner?.persons?.length || 0) > 1 ? "Propriétaires" : "Propriétaire"}
            name={ownerName || null}
            phone={ownerContact.phone}
            email={ownerContact.email}
            href={owner ? `/interface/clients/${owner.id}` : null}
            bailId={lease.id}
            target="OWNER"
            canAsk={!!owner && !pastVerification}
          />
          <ContactCard
            role="Locataire"
            name={tenantName || null}
            phone={tenantContact.phone}
            email={tenantContact.email}
            href={tenant ? `/interface/clients/${tenant.id}` : null}
            bailId={lease.id}
            target="TENANT"
            canAsk={!!tenant && !pastVerification}
          />
          <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-card px-3 py-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Notaire</span>
              {followUp.notaire ? (
                <Link href={`/interface/notaires/${followUp.notaire.id}/dossiers`} className="truncate text-[14px] font-semibold hover:underline">
                  {followUp.notaire.name}
                </Link>
              ) : (
                <span className="text-[14px] text-muted-foreground">Pas encore choisi</span>
              )}
            </div>
            {followUp.notaire && <span className="text-[12px] text-muted-foreground">depuis le {formatDate(followUp.notaire.assignedAt).slice(0, 5)}</span>}
          </div>
        </div>
        {/* Étapes */}
        <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-2" aria-label="Étapes du dossier">
          {stepItems.map((key, index) => {
            const currentIndex = stepItems.indexOf(stage.key);
            const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
            return (
              <li key={key} className="flex items-center gap-2.5">
                <span className={cn("flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold", state === "todo" && "text-muted-foreground")}>
                  <span
                    className={cn(
                      "flex size-[22px] items-center justify-center rounded-full text-xs font-bold",
                      state === "done" && "bg-green-100 text-green-800",
                      state === "current" && "bg-primary text-primary-foreground",
                      state === "todo" && "bg-muted text-muted-foreground",
                    )}
                    aria-current={state === "current" ? "step" : undefined}
                  >
                    {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  {STAGES[key].label}
                </span>
                {index < stepItems.length - 1 && (
                  <span aria-hidden className={cn("h-0.5 w-7 rounded", state === "done" ? "bg-green-300" : "bg-border")} />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* À faire avant l'envoi : la seule liste à lire pour savoir quoi faire */}
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-[18px]">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">{pastVerification ? "Dossier transmis au notaire" : "À faire avant l'envoi"}</h2>
              <span className="flex items-center gap-3">
                <span className="text-sm font-bold">
                  {overall.verified} / {overall.total}
                </span>
                {!pastVerification && <StartReviewButton />}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            {todoRows.length === 0 ? (
              <p className="flex items-center gap-2 text-[14px] font-medium text-green-800">
                <Check className="size-4" strokeWidth={3} />
                {pastVerification ? "Contrôle terminé." : "Tout est vérifié : le dossier peut partir chez le notaire."}
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {todoRows.map((row) => (
                  <li key={row.key} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-[20px] items-center justify-center rounded-full text-[12px] font-extrabold",
                        row.tone === "action" && "bg-amber-100 text-amber-800",
                        row.tone === "wait" && "bg-slate-100 text-slate-600",
                        row.tone === "todo" && "border-2 border-slate-300",
                      )}
                    >
                      {row.tone === "action" ? "!" : row.tone === "wait" ? "…" : ""}
                    </span>
                    <span className="min-w-0 text-[14px]">
                      <span className="font-semibold">{row.text}</span>
                      {row.meta ? <span className="text-muted-foreground"> · {row.meta}</span> : null}
                    </span>
                    {row.action ? <span className="flex justify-end">{row.action}</span> : <span />}
                  </li>
                ))}
              </ul>
            )}
            {canSend && sendDisabledReason && <p className="text-[12.5px] text-muted-foreground">Transmission au notaire : {sendDisabledReason.replace(/^./, (c) => c.toLowerCase())}</p>}
          </section>

          <PiecesSection
            groups={pieceGroups}
            bailId={lease.id}
            guided={
              pastVerification
                ? undefined
                : {
                    legalChecks,
                    legalPending,
                    answers,
                    relances,
                    remind:
                      remind && reminderData ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[14.5px] font-semibold">{remind.title}</span>
                          <RemindButton
                            bailId={lease.id}
                            label="Relancer"
                            title={remind.title}
                            focus="all"
                            size="sm"
                            icon={remind.icon === "tenant" ? <UserPlus className="size-4" /> : remind.icon === "rent" ? <Euro className="size-4" /> : <BellRing className="size-4" />}
                            initialPanel={reminderData}
                            rentCapLines={rentCapNotify}
                            className="h-9"
                          />
                        </div>
                      ) : undefined,
                    sendButton: canSend ? (
                      <SendToNotaryButton
                        bailId={lease.id}
                        assignedNotaireName={followUp.notaire?.name}
                        disabledReason={sendDisabledReason}
                        label={lease.status === BailStatus.READY_FOR_NOTARY ? "Assigner un notaire" : "Envoyer au notaire"}
                      />
                    ) : undefined,
                  }
            }
            diagnostics={
              property && diagnosticState ? (
                <DiagnosticsPanel
                  bailId={lease.id}
                  propertyId={property.id}
                  state={diagnosticState}
                  dpe={{
                    dpeClass: property.dpeClass ?? null,
                    gesClass: property.gesClass ?? null,
                    dpeDate: dpeDateValue(property.dpeDate),
                    commercial: isCommercial,
                  }}
                  locked={diagnosticsLocked}
                  configured={isDiagnosticAnalysisConfigured()}
                />
              ) : undefined
            }
          />

          {!paid && (
          <CheckSection
            id="bloc-paiement"
            title="Paiement"
            subtitle="Frais de dossier réglés à la fin du formulaire propriétaire"
            headerRight={<StateChip tone={paid ? "ok" : "missing"}>{paid ? "Payé" : "Non payé"}</StateChip>}
          >
            <CheckList>
              <CheckPoint
                state={paid ? "ok" : "missing"}
                label="Frais de dossier"
                note={
                  paid
                    ? null
                    : [
                        "Non payés : le dossier ne peut pas partir chez le notaire.",
                        ...openPayments.map((payment) =>
                          payment.status === "SUCCEEDED"
                            ? `Paiement Stripe ${payment.stripePaymentIntentId.slice(0, 8)}…${payment.stripePaymentIntentId.slice(-6)} confirmé${payment.stripePaidAt ? ` le ${formatDateTime(payment.stripePaidAt)} (heure de Paris)` : ""} : en attente de l'envoi du formulaire par le propriétaire (il ne repaiera pas).${payment.lastError ? ` ${payment.lastError}` : ""}`
                            : `Paiement Stripe ${payment.stripePaymentIntentId.slice(0, 8)}…${payment.stripePaymentIntentId.slice(-6)} en cours de vérification : aucune nouvelle tentative n'est proposée au client tant que son résultat n'est pas connu.`,
                        ),
                      ].join("\n")
                }
              >
                {lease.paidAt
                  ? [
                      `${formatDossierFee(lease.bailFamily)} payés le ${formatDateTime(lease.paidAt as Date)} (heure de Paris)`,
                      lease.stripePaymentIntentId ? `Paiement Stripe ${lease.stripePaymentIntentId.slice(0, 8)}…${lease.stripePaymentIntentId.slice(-6)}` : null,
                    ]
                      .filter(Boolean)
                      .join("\n")
                  : paidHistorically && historicalPayment
                    ? [
                        paidOn ? `Paiement historique confirmé — payé le ${formatDate(paidOn)}` : HISTORICAL_PAID_LABEL,
                        `Vérifié par ${historicalPayment.verifiedByName ?? "l'équipe"}${historicalPayment.verifiedAt ? ` le ${formatDate(historicalPayment.verifiedAt)}` : ""}`,
                        historicalPayment.proofReference ? `Preuve : ${historicalPayment.proofReference}` : null,
                        historicalPayment.note ? `Note : ${historicalPayment.note}` : null,
                      ]
                        .filter(Boolean)
                        .join("\n")
                    : historicalPayment?.status === "REJECTED"
                      ? `Aucun paiement enregistré pour ce dossier.\nVérifié par ${historicalPayment.verifiedByName ?? "l'équipe"}${historicalPayment.verifiedAt ? ` le ${formatDate(historicalPayment.verifiedAt)}` : ""} : aucun paiement retrouvé${historicalPayment.note ? ` (${historicalPayment.note})` : ""}.`
                      : "Aucun paiement enregistré pour ce dossier."}
              </CheckPoint>
            </CheckList>
            {!paid && historicalPayment?.status === "PENDING" && (
              <div className="px-4 pb-4 sm:px-5">
                <HistoricalPaymentReview bailId={lease.id} />
              </div>
            )}
          </CheckSection>

          )}

          <PartyCheckSection
            id="bloc-proprietaire"
            hidePieces
            number={1}
            role="PROPRIETAIRE"
            data={ownerPoints}
            bailId={lease.id}
            verifiedKeys={verifiedKeys}
            locked={ownerLocked}
            formNote={formNote(ownerIntake)}
            complement={pastVerification ? undefined : { bailId: lease.id, target: "OWNER", commercial: isCommercial }}
          />
          <PartyCheckSection
            id="bloc-locataire"
            hidePieces
            number={2}
            role="LOCATAIRE"
            data={tenantPoints}
            bailId={lease.id}
            verifiedKeys={verifiedKeys}
            locked={tenantLocked}
            formNote={formNote(tenantIntake)}
            complement={pastVerification ? undefined : { bailId: lease.id, target: "TENANT", commercial: isCommercial }}
            emptyAction={pastVerification ? undefined : <TenantCreateButton bailId={lease.id} variant="default" className="h-10" />}
            emptyHint="Ajoutez-le si le propriétaire vous l'a communiqué : il recevra son formulaire par e-mail. Sinon, relancez le propriétaire avec le bouton en haut de la fiche."
          />

          {/* Le bien */}
          <CheckSection
            id="bloc-bien"
            number={3}
            title="Le bien"
            subtitle={
              property ? (
                <>
                  {[
                    property.type && (PROPERTY_TYPE_LABELS[property.type] || property.type),
                    property.legalStatus && (LEGAL_STATUS_LABELS[property.legalStatus] || property.legalStatus).toLowerCase(),
                    surface && formatSurface(surface),
                  ]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  <Link href={`/interface/properties/${property.id}`} className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
                    Fiche du bien
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </>
              ) : (
                "Aucun bien associé"
              )
            }
            headerRight={
              // Description exigée par le formulaire, pièces dans « Pièces du dossier » : seul un manque est signalé ici.
              property ? (
                <>
                  {propertyDescMissing && <StateChip tone="missing">Information manquante</StateChip>}
                  {owner && !propertyLocked && (
                    <ComplementRequestButton bailId={lease.id} target="OWNER" label="Demander" icon={<MessageSquarePlus className="size-4" />} />
                  )}
                </>
              ) : undefined
            }
            footer={
              property &&
              !isCommercial && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Équipements du meublé</span>
                    <span className="flex items-center gap-2">
                      <StateChip tone={isMeuble ? (furniturePresent === FURNITURE.length ? "ok" : "missing") : "neutral"}>
                        {isMeuble ? `${furniturePresent} / ${FURNITURE.length} présents` : "Non concerné · bail nu"}
                      </StateChip>
                      {!propertyLocked && (
                        <PropertyFurnitureEditor
                          propertyId={property.id}
                          items={FURNITURE.map((item) => ({ key: item.key, label: item.label, present: !!property[item.key] }))}
                        />
                      )}
                    </span>
                  </div>
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-3.5 gap-y-1.5">
                    {FURNITURE.map((item) => {
                      const ok = !!property[item.key];
                      return (
                        <li
                          key={item.key}
                          className={cn("flex items-center gap-1.5 text-[13px]", isMeuble ? (ok ? "" : "text-red-700") : "text-muted-foreground")}
                        >
                          {isMeuble &&
                            (ok ? (
                              <Check className="size-3.5 shrink-0 text-green-700" strokeWidth={3} aria-label="présent" />
                            ) : (
                              <X className="size-3.5 shrink-0" aria-label="absent" />
                            ))}
                          {item.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )
            }
          >
            {property ? (
              <>
                <CheckList>
                  <CheckPoint
                    state={propertyDescMissing ? "missing" : "info"}
                    label="Adresse et description"
                    claimKeys={propertyClaimKeys}
                    note={
                      missingData?.property?.missingFields.length
                        ? `Manquant : ${missingData.property.missingFields.map((f) => (f === "fullAddress" ? "adresse" : f)).join(", ")}`
                        : null
                    }
                    actions={
                      !propertyLocked && (
                        <>
                          {propertyDescMissing && owner && (
                            <AskFieldsButton
                              bailId={lease.id}
                              target="OWNER"
                              scope="property"
                              targetId={property.id}
                              fields={missingData?.property?.missingFields ?? []}
                              commercial={isCommercial}
                            />
                          )}
                          <PropertyDetailsEditor
                            propertyId={property.id}
                            missing={propertyDescMissing}
                            commercial={isCommercial}
                            values={{
                              label: property.label,
                              fullAddress: property.fullAddress,
                              type: property.type,
                              surfaceM2: surface,
                              legalStatus: property.legalStatus,
                              syndicName: property.syndicName,
                              syndicEmail: property.syndicEmail,
                              syndicPhone: property.syndicPhone,
                              subdivisionOver10Years: property.subdivisionOver10Years,
                              complexType: complexTypeValue(property.inShoppingCenter, property.complexType),
                              outbuildings: property.outbuildings,
                            }}
                          />
                        </>
                      )
                    }
                  >
                    {[
                      [property.fullAddress, property.label && `« ${property.label} »`].filter(Boolean).join(" · "),
                      [
                        property.type && (PROPERTY_TYPE_LABELS[property.type] || property.type),
                        surface && formatSurface(surface),
                        property.legalStatus && (LEGAL_STATUS_LABELS[property.legalStatus] || property.legalStatus),
                        property.status === "LOUER" ? "loué" : "non loué",
                      ]
                        .filter(Boolean)
                        .join(" · "),
                      property.legalStatus === "CO_PROPRIETE" && property.syndicName
                        ? `Syndic : ${[property.syndicName, property.syndicEmail, property.syndicPhone].filter(Boolean).join(" · ")}`
                        : null,
                      property.legalStatus === "LOTISSEMENT" && property.subdivisionOver10Years
                        ? SUBDIVISION_AGE_LABELS[property.subdivisionOver10Years] ?? null
                        : null,
                      property.inShoppingCenter
                        ? property.complexType === "ESTATE_COMPLEX"
                          ? "Dans un ensemble immobilier (parc d'activités, association syndicale…)"
                          : "Dans un centre commercial"
                        : null,
                      property.outbuildings ? `Dépendances : ${property.outbuildings}` : null,
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  </CheckPoint>
                </CheckList>
              </>
            ) : (
              <p className="px-5 py-4 text-sm text-muted-foreground">Aucun bien associé à ce dossier.</p>
            )}
          </CheckSection>

          {/* Le bail */}
          <CheckSection
            id="bloc-bail"
            number={4}
            title="Le bail"
            subtitle="Conditions saisies par le propriétaire"
            headerRight={
              <>
                {(bailAndRules.missing > 0 || bailAndRules.pendingKeys.length > 0) && (
                  <StateChip tone={summaryChip(bailAndRules).tone}>{summaryChip(bailAndRules).label}</StateChip>
                )}
                {!bailLocked && <ValidateAllButton bailId={lease.id} pointKeys={bailAndRules.pendingKeys} />}
                {owner && !bailLocked && (
                  <ComplementRequestButton bailId={lease.id} target="OWNER" label="Demander" icon={<MessageSquarePlus className="size-4" />} />
                )}
              </>
            }
          >
            <CheckList>
              {bailPoints.map((point) => {
                const missing = point.missing.length > 0;
                const verified = !missing && isVerified(point.key, bailLocked);
                return (
                  <CheckPoint
                    key={point.key}
                    tags={point.label === "Loyer et charges" ? rentTags : point.label === "Dépôt de garantie" ? depositTags : undefined}
                    claimKeys={bailClaimKeys(point.fields.map((f) => f.field))}
                    state={missing ? "missing" : "info"}
                    label={point.label}
                    note={missing ? `Manquant : ${point.missing.map((f) => (BAIL_FIELD_LABELS[f] || f).toLowerCase()).join(", ")}` : null}
                    actions={
                      !bailLocked && (
                        <>
                          {missing && owner && (
                            <AskFieldsButton bailId={lease.id} target="OWNER" scope="bail" targetId={lease.id} fields={point.missing} commercial={isCommercial} />
                          )}
                          <BailTermsEditor bailId={lease.id} title={point.label} fields={point.fields} />
                        </>
                      )
                    }
                  >
                    {point.text.filter(Boolean).join("\n")}
                  </CheckPoint>
                );
              })}
              {legalChecks}
            </CheckList>
          </CheckSection>

          {isCommercial && (
            <CheckSection
              id="bloc-commercial"
              title="Conditions commerciales"
              subtitle="Réponses du propriétaire, transmises au notaire. Le crayon corrige une ligne sur place."
            >
              <CommercialTermsInline
                bailId={lease.id}
                values={commercialTermsToForm((lease as any).commercialTerms)}
                derogatory={lease.bailType === "COMMERCIAL_DEROGATOIRE"}
                asksMarriage={(() => {
                  const person = owner?.type === "PERSONNE_PHYSIQUE" ? (owner.persons?.find((p: any) => p.isPrimary) ?? owner.persons?.[0]) : null;
                  return !!person && asksBoughtDuringMarriage(person.familyStatus, person.matrimonialRegime);
                })()}
                annualRent={lease.rentAmount ? lease.rentAmount * 12 : null}
                locked={bailLocked}
              />
            </CheckSection>
          )}



          {complementRequests.length > 0 && (
            <details id="demandes" open={receivedCount > 0} className="group scroll-mt-64 overflow-hidden rounded-xl border bg-card">
              <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-[15px] font-semibold">
                Demandes de pièces
                <span className="text-[13px] font-medium text-muted-foreground">
                  {[receivedCount ? `${receivedCount} reçue${receivedCount > 1 ? "s" : ""} à contrôler` : null, waitingCount ? `${waitingCount} en attente` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </summary>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <ComplementRequestsPanel requests={complementRequests} locked={pastVerification} canArchive />
              </div>
            </details>
          )}

          {archivedDocuments.length > 0 && (
            <details className="group overflow-hidden rounded-xl border bg-card">
              <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-[15px] font-semibold">
                <span className="flex items-center gap-2">
                  <Trash2 className="size-4 text-muted-foreground" />
                  Corbeille
                </span>
                <span className="text-[13px] font-medium text-muted-foreground">
                  {archivedDocuments.length} pièce{archivedDocuments.length > 1 ? "s" : ""} remplacée{archivedDocuments.length > 1 ? "s" : ""} · rien n&apos;est effacé
                </span>
              </summary>
          <ArchivedDocuments
            bare
            documents={archivedDocuments.map((doc) => ({
              id: doc.id,
              kind: doc.kind,
              label: doc.label,
              fileKey: doc.fileKey,
              mimeType: doc.mimeType,
              archivedAt: (doc.archivedAt as Date).toISOString(),
              archivedByName: doc.archivedByName,
              replacedByLabel: doc.replacedBy?.label ?? null,
            }))}
          />

            </details>
          )}

          <details className="group overflow-hidden rounded-xl border bg-card">
            <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-[15px] font-semibold">
              Historique et détails techniques
              <span className="text-[13px] font-medium text-muted-foreground group-open:hidden">Paiement, journal, référence</span>
              <span className="hidden text-[13px] font-medium text-muted-foreground group-open:inline">Masquer</span>
            </summary>
            <div className="flex flex-col gap-5 px-5 pb-5">
              <dl className="grid grid-cols-1 gap-x-3.5 gap-y-1.5 text-[13.5px] sm:grid-cols-[170px_minmax(0,1fr)]">
                <KV label="Référence">
                  <span className="font-mono">#{lease.id.slice(-8).toUpperCase()}</span>
                </KV>
                <KV label="Identifiant complet">
                  <span className="break-all font-mono text-xs">{lease.id}</span>
                </KV>
                <KV label="Créé le">
                  <LocalDateTime value={lease.createdAt} />
                  {lease.createdBy ? ` par ${lease.createdBy.name || lease.createdBy.email}` : " · via le formulaire propriétaire"}
                </KV>
                <KV label="Modifié le">
                  <LocalDateTime value={lease.updatedAt} />
                  {lease.updatedBy ? ` par ${lease.updatedBy.name || lease.updatedBy.email}` : ""}
                </KV>
                <KV label="Adresse normalisée">
                  {property
                    ? [property.housenumber, property.street, property.postalCode, property.city, property.district, property.department, property.region]
                        .filter(Boolean)
                        .join(" · ") || "—"
                    : "—"}
                  {property?.inseeCode ? ` · INSEE ${property.inseeCode}` : ""}
                  {property?.latitude && property?.longitude ? ` · ${Number(property.latitude)}, ${Number(property.longitude)}` : ""}
                </KV>
                <KV label="Statut du bien">{property ? (property.status === "LOUER" ? "Loué" : "Non loué") : "—"}</KV>
              </dl>
              {paid && (
          <CheckSection
            id="bloc-paiement"
            title="Paiement"
            subtitle="Frais de dossier réglés à la fin du formulaire propriétaire"
            headerRight={<StateChip tone={paid ? "ok" : "missing"}>{paid ? "Payé" : "Non payé"}</StateChip>}
          >
            <CheckList>
              <CheckPoint
                state={paid ? "ok" : "missing"}
                label="Frais de dossier"
                note={
                  paid
                    ? null
                    : [
                        "Non payés : le dossier ne peut pas partir chez le notaire.",
                        ...openPayments.map((payment) =>
                          payment.status === "SUCCEEDED"
                            ? `Paiement Stripe ${payment.stripePaymentIntentId.slice(0, 8)}…${payment.stripePaymentIntentId.slice(-6)} confirmé${payment.stripePaidAt ? ` le ${formatDateTime(payment.stripePaidAt)} (heure de Paris)` : ""} : en attente de l'envoi du formulaire par le propriétaire (il ne repaiera pas).${payment.lastError ? ` ${payment.lastError}` : ""}`
                            : `Paiement Stripe ${payment.stripePaymentIntentId.slice(0, 8)}…${payment.stripePaymentIntentId.slice(-6)} en cours de vérification : aucune nouvelle tentative n'est proposée au client tant que son résultat n'est pas connu.`,
                        ),
                      ].join("\n")
                }
              >
                {lease.paidAt
                  ? [
                      `${formatDossierFee(lease.bailFamily)} payés le ${formatDateTime(lease.paidAt as Date)} (heure de Paris)`,
                      lease.stripePaymentIntentId ? `Paiement Stripe ${lease.stripePaymentIntentId.slice(0, 8)}…${lease.stripePaymentIntentId.slice(-6)}` : null,
                    ]
                      .filter(Boolean)
                      .join("\n")
                  : paidHistorically && historicalPayment
                    ? [
                        paidOn ? `Paiement historique confirmé — payé le ${formatDate(paidOn)}` : HISTORICAL_PAID_LABEL,
                        `Vérifié par ${historicalPayment.verifiedByName ?? "l'équipe"}${historicalPayment.verifiedAt ? ` le ${formatDate(historicalPayment.verifiedAt)}` : ""}`,
                        historicalPayment.proofReference ? `Preuve : ${historicalPayment.proofReference}` : null,
                        historicalPayment.note ? `Note : ${historicalPayment.note}` : null,
                      ]
                        .filter(Boolean)
                        .join("\n")
                    : historicalPayment?.status === "REJECTED"
                      ? `Aucun paiement enregistré pour ce dossier.\nVérifié par ${historicalPayment.verifiedByName ?? "l'équipe"}${historicalPayment.verifiedAt ? ` le ${formatDate(historicalPayment.verifiedAt)}` : ""} : aucun paiement retrouvé${historicalPayment.note ? ` (${historicalPayment.note})` : ""}.`
                      : "Aucun paiement enregistré pour ce dossier."}
              </CheckPoint>
            </CheckList>
            {!paid && historicalPayment?.status === "PENDING" && (
              <div className="px-4 pb-4 sm:px-5">
                <HistoricalPaymentReview bailId={lease.id} />
              </div>
            )}
          </CheckSection>

              )}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Historique</h3>
                <BailAuditTimeline bailId={lease.id} bare />
              </div>
            </div>
          </details>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-[18px]">
            <h2 className="text-base font-semibold">Suivi</h2>
            <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
              <KV label="Notaire">
                {followUp.notaire ? (
                  <>
                    <Link href={`/interface/notaires/${followUp.notaire.id}/dossiers`} className="font-medium hover:underline">
                      {followUp.notaire.name}
                    </Link>
                    <span className="text-muted-foreground"> · depuis le {formatDate(followUp.notaire.assignedAt)}</span>
                  </>
                ) : (
                  "Non assigné"
                )}
              </KV>
              <KV label="Formulaire propriétaire">{intakeSummary(ownerIntake)}</KV>
              <KV label="Formulaire locataire">{intakeSummary(tenantIntake)}</KV>
              <KV label="Demandes du notaire">
                {followUp.pendingRequests.length === 0 ? (
                  "Aucune"
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {followUp.pendingRequests.map((r) => (
                      <li key={r.id}>
                        <strong className="font-semibold">{r.title}</strong>
                        <span className="block text-xs text-muted-foreground">
                          Pour : {r.target} · le {formatDate(r.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </KV>
            </dl>
            <p className="text-[12.5px] text-muted-foreground">
              Ses échanges avec les parties ne sont pas affichés ici.
            </p>
            {reminderData && (
              <div className="border-t pt-3">
                <ReminderSummary panel={reminderData} />
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2.5 rounded-xl border bg-card p-[18px]">
            <div>
              <h2 className="text-base font-semibold">Notes internes</h2>
              <p className="text-[12.5px] text-muted-foreground">Visibles par l&apos;équipe uniquement.</p>
            </div>
            <InternalNotes target="BAIL" targetId={lease.id} />
          </section>
        </aside>
      </div>
    </div>
    </FicheProvider>
  );
}
