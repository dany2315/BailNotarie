import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, CreditCard, X } from "lucide-react";
import { BailStatus, CompletionStatus, DocumentKind } from "@prisma/client";
import { getLease, getBailMissingData } from "@/lib/actions/leases";
import { getDocuments } from "@/lib/actions/documents";
import { getBailFollowUp, type IntakeTracking } from "@/lib/actions/admin-bail";
import { InternalNotes } from "@/components/comments/internal-notes";
import { TenantCreateButton } from "@/components/leases/tenant-create-button";
import { BailAuditTimeline } from "@/components/leases/bail-audit-timeline";
import { BailMoreMenu } from "@/components/leases/bail-more-menu";
import { SendToNotaryButton } from "@/components/leases/send-to-notary-dialog";
import { RequestMissingButton, type MissingRequestRecipient } from "@/components/leases/request-missing-button";
import { describeMissingItems } from "@/lib/utils/missing-items";
import { intakeSummary } from "@/lib/utils/intake-summary";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { PartyCheckSection, buildPartyPoints, docPoints, docRowKeys, withVerified } from "@/components/admin/party-check-section";
import { CheckList, CheckPoint, CheckSection, StateChip } from "@/components/admin/check-list";
import { ValidateAllButton, VerifyToggle } from "@/components/admin/verify-buttons";
import { pointKey, summarize, summaryChip } from "@/lib/utils/verification";
import { prisma } from "@/lib/prisma";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { DiagnosticsLegend } from "@/components/documents/diagnostics-legend";
import { buildChecklistRows, toChecklistDocument } from "@/lib/utils/document-checklist";
import { getRequiredPropertyFields } from "@/lib/utils/required-fields";
import { formatCurrency, formatDate, formatDateTime, formatSurface } from "@/lib/utils/formatters";
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

export const dynamic = "force-dynamic";

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};
const BAIL_FAMILY_LABELS: Record<string, string> = { HABITATION: "Habitation", COMMERCIAL: "Commercial" };
const PROPERTY_TYPE_LABELS: Record<string, string> = { APPARTEMENT: "Appartement", MAISON: "Maison" };
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

  const tenant = lease.parties?.find((p: any) => p.profilType === "LOCATAIRE") || null;
  const owner = lease.parties?.find((p: any) => p.profilType === "PROPRIETAIRE") || lease.property?.owner || null;

  const [tenantClientDocs, ownerClientDocs, propertyDocuments, bailDocuments, missingData, followUp, verificationChecks] = await Promise.all([
    tenant ? getDocuments({ clientId: tenant.id }) : Promise.resolve([]),
    owner ? getDocuments({ clientId: owner.id }) : Promise.resolve([]),
    lease.property ? getDocuments({ propertyId: lease.property.id }) : Promise.resolve([]),
    getDocuments({ bailId: lease.id }),
    getBailMissingData(lease.id),
    getBailFollowUp(lease.id),
    prisma.bailVerificationCheck.findMany({ where: { bailId: lease.id }, select: { pointKey: true } }),
  ]);
  const verifiedKeys = new Set(verificationChecks.map((c) => c.pointKey));

  // Pièces du client hors personnes et société (déjà affichées dans leur bloc).
  const commonDocs = (docs: any[]) => docs.filter((doc: any) => !doc.personId && !doc.entrepriseId);

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
  const maxDeposit = isMeuble ? lease.rentAmount * 2 : lease.rentAmount;
  const depositOk = lease.securityDeposit <= maxDeposit;
  const docsMissing =
    (missingData?.owner?.totalMissingDocuments || 0) +
    (missingData?.tenant?.totalMissingDocuments || 0) +
    (missingData?.property?.missingDocuments.length || 0);
  const surface = property?.surfaceM2 ? Number(property.surfaceM2) : null;

  const ownerIntake = followUp.intakes.find((i) => i.target === "OWNER");
  const tenantIntake = followUp.intakes.find((i) => i.target === "TENANT");

  // « Demander les pièces manquantes » : ce qui manque, par destinataire.
  const partyEmail = (party: any): string =>
    party?.type === "PERSONNE_MORALE"
      ? party.entreprise?.email || ""
      : (party?.persons?.find((p: any) => p.isPrimary) || party?.persons?.[0])?.email || "";
  const ownerExtraItems = [
    ...(missingData?.bail.missingFields || [])
      .filter((f) => !["tenant", "owner", "property"].includes(f))
      .map((f) => BAIL_FIELD_LABELS[f] || f),
    ...(missingData?.property?.missingFields || []).map((f) => (f === "fullAddress" ? "Adresse du bien" : f)),
    ...(missingData?.property?.missingDocuments || []).map((k) => documentKindLabels[k] || k),
  ];
  const missingRecipients: MissingRequestRecipient[] = [
    owner && {
      role: "Propriétaire",
      name: ownerName,
      email: partyEmail(owner),
      items: [...describeMissingItems(missingData?.owner || null), ...ownerExtraItems],
    },
    tenant && {
      role: "Locataire",
      name: tenantName,
      email: partyEmail(tenant),
      items: describeMissingItems(missingData?.tenant || null),
    },
  ].filter(Boolean) as MissingRequestRecipient[];

  // ---- Fiche de vérification : un point par donnée, comme la maquette ----
  // Une fois le dossier envoyé au notaire (ou un bloc déjà « Complété »), ses
  // points sont considérés comme vérifiés et verrouillés.
  const pastVerification = stage.key === "notaire" || stage.key === "signe" || stage.key === "clos";
  const bailLocked = pastVerification;
  const ownerLocked = pastVerification || owner?.completionStatus === CompletionStatus.COMPLETED;
  const tenantLocked = pastVerification || tenant?.completionStatus === CompletionStatus.COMPLETED;
  const propertyLocked = pastVerification || property?.completionStatus === CompletionStatus.COMPLETED;

  // Le bail
  const bailMissing = new Set(missingData?.bail.missingFields || []);
  const months = lease.rentAmount > 0 ? Math.round((lease.securityDeposit / lease.rentAmount) * 10) / 10 : null;
  const bailPoints = [
    {
      key: pointKey("bail:type", [lease.bailType, lease.bailFamily, lease.effectiveDate, lease.endDate]),
      label: "Type et durée",
      missing: ["effectiveDate"].filter((f) => bailMissing.has(f)),
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
      text: [
        lease.rentAmount > 0
          ? `${formatCurrency(lease.rentAmount)} de loyer + ${formatCurrency(lease.monthlyCharges)} de charges par mois`
          : null,
        lease.paymentDay ? `Payable le ${lease.paymentDay} de chaque mois` : null,
      ],
    },
    {
      key: pointKey("bail:depot", [lease.securityDeposit, lease.rentAmount, lease.bailType]),
      label: "Dépôt de garantie",
      missing: [...["securityDeposit"].filter((f) => bailMissing.has(f)), ...(depositOk ? [] : ["depositLimit"])],
      text: [
        `${formatCurrency(lease.securityDeposit)}${months !== null ? ` · ${String(months).replace(".", ",")} mois de loyer hors charges` : ""}`,
        depositOk
          ? `Limite de ${isMeuble ? "2 mois (meublé)" : "1 mois (bail nu)"} respectée`
          : `Au-dessus de la limite de ${isMeuble ? "2 mois" : "1 mois"}`,
      ],
    },
  ];
  const bailExtraMissing = ["tenant", "owner", "property"].filter((f) => bailMissing.has(f));
  const bailStates = withVerified(
    [
      ...bailPoints.map((p) => ({ key: p.key, missing: p.missing.length > 0 })),
      ...bailExtraMissing.map((f) => ({ key: `bail:${f}:absent`, missing: true })),
    ],
    verifiedKeys,
    bailLocked,
  );
  const bailMissingCount = missingData?.bail.missingFields.length || 0;

  // Propriétaire et locataire
  const ownerPoints = buildPartyPoints(owner, missingData?.owner || null, commonDocs(ownerClientDocs), "PROPRIETAIRE");
  const tenantPoints = buildPartyPoints(tenant, missingData?.tenant || null, commonDocs(tenantClientDocs), "LOCATAIRE");
  const ownerStates = withVerified(ownerPoints.points, verifiedKeys, ownerLocked);
  const tenantStates = withVerified(tenantPoints.points, verifiedKeys, tenantLocked);

  // Le bien
  const furniturePresent = property ? FURNITURE.filter((item) => !!property[item.key]).length : 0;
  const propertyDocRows = property
    ? buildChecklistRows(getRequiredPropertyFields(property.legalStatus).requiredDocuments, (propertyDocuments as any[]).map(toChecklistDocument), {
        keyPrefix: `property-${property.id}`,
        labels: { [DocumentKind.INSURANCE]: "Assurance du propriétaire", [DocumentKind.RIB]: "RIB du propriétaire" },
        extras: { [DocumentKind.DIAGNOSTICS]: <DiagnosticsLegend key="diagnostics-legend" /> },
      })
    : [];
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
  const propertyStates = withVerified(
    [{ key: propertyDescKey, missing: propertyDescMissing }, ...docPoints(propertyDocRows, propertyDocKeys)],
    verifiedKeys,
    propertyLocked,
  );

  // Contrôles réglementaires (manuels)
  const diagnosticsIds = (propertyDocuments as any[]).filter((d) => d.kind === DocumentKind.DIAGNOSTICS).map((d) => d.id).sort();
  const rulesPoints = [
    { key: pointKey("rules:plafond", [lease.rentAmount, surface, property?.inseeCode || null]), label: "Plafond de loyer" },
    { key: pointKey("rules:dpe", diagnosticsIds), label: "Classe DPE" },
  ];
  const rulesStates = withVerified(rulesPoints.map((p) => ({ key: p.key, missing: false })), verifiedKeys, bailLocked);

  const isVerified = (key: string, locked: boolean) => locked || verifiedKeys.has(key);
  const sections = [
    { id: "bloc-bail", title: "Le bail", summary: summarize(bailStates) },
    { id: "bloc-proprietaire", title: (owner?.persons?.length || 0) > 1 ? "Propriétaires" : "Propriétaire", summary: summarize(ownerStates) },
    { id: "bloc-locataire", title: "Locataire", summary: summarize(tenantStates) },
    { id: "bloc-bien", title: "Le bien", summary: summarize(propertyStates) },
    { id: "bloc-controles", title: "Contrôles réglementaires", summary: summarize(rulesStates) },
  ];
  const overall = summarize([...bailStates, ...ownerStates, ...tenantStates, ...propertyStates, ...rulesStates]);
  const totalMissing = Math.max(missingData?.totalMissing ?? 0, overall.missing);

  const sendDisabledReason = !tenant
    ? "Ajoutez d'abord le locataire."
    : totalMissing > 0
      ? `${totalMissing} élément${totalMissing > 1 ? "s" : ""} manquant${totalMissing > 1 ? "s" : ""}.`
      : overall.remaining > 0
        ? `Encore ${overall.remaining} point${overall.remaining > 1 ? "s" : ""} à valider.`
        : null;

  const stepItems = STAGE_ORDER.filter((key) => key !== "clos" || stage.key === "clos");
  const progress = overall.total > 0 ? Math.round((overall.verified / overall.total) * 100) : 0;
  const ctaHelp = pastVerification
    ? "Dossier validé et transmis au notaire."
    : !tenant
      ? "Bouton bloqué : ajoutez d'abord le locataire."
      : totalMissing > 0
        ? `Bouton bloqué : ${totalMissing} élément${totalMissing > 1 ? "s" : ""} manquant${totalMissing > 1 ? "s" : ""}. Demandez-${totalMissing > 1 ? "les" : "le"} au client ou saisissez-${totalMissing > 1 ? "les" : "le"} si vous ${totalMissing > 1 ? "les" : "l'"}avez obtenu${totalMissing > 1 ? "s" : ""} par téléphone.`
        : overall.remaining > 0
          ? `Encore ${overall.remaining} point${overall.remaining > 1 ? "s" : ""} à valider avant l'envoi au notaire.`
          : "Tout est vérifié : le dossier peut partir chez le notaire.";

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* En-tête collant (statique sur téléphone) */}
      <div className="-mx-4 -mt-6 flex flex-col gap-3 border-b bg-background/95 px-4 pb-4 pt-5 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:-mx-6 sm:px-6 md:sticky md:top-16 md:z-30 lg:-mx-8 lg:px-8">
        <Link href="/interface/baux" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" />
          Dossiers
        </Link>
        <div className="flex flex-col gap-3.5">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex h-[30px] items-center whitespace-nowrap rounded-lg px-2.5 text-[13.5px] font-semibold sm:px-3", stage.className)}>{stage.label}</span>
              {lease.paidAt ? (
                <span className="inline-flex h-[30px] items-center gap-1 whitespace-nowrap rounded-lg bg-green-100 px-2.5 text-[13.5px] sm:gap-1.5 sm:px-3 font-semibold text-green-800">
                  <Check className="size-4" strokeWidth={3} />
                  Frais payés le {formatDate(lease.paidAt).slice(0, 5)}
                  {/* Le paiement Stripe est toujours de 39,90 € (montant contrôlé côté serveur). */}
                  {lease.stripePaymentIntentId ? " · 39,90 €" : ""}
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
            <h1 className="break-words text-[26px] font-bold leading-tight tracking-tight">
              {property?.fullAddress || property?.label || `Bail #${lease.id.slice(-8).toUpperCase()}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {BAIL_TYPE_LABELS[lease.bailType] || lease.bailType} · {BAIL_FAMILY_LABELS[lease.bailFamily] || lease.bailFamily} ·{" "}
              {ownerName || "propriétaire non renseigné"} → {tenantName || "locataire à ajouter"}
            </p>
          </div>
          {/* Actions sous le titre, comme dans la maquette : « Demander… », « Plus », puis le bouton
              principal ; sur téléphone, le bouton principal passe en premier sur toute la largeur. */}
          <div className="flex flex-wrap items-center gap-2">
            {canSend && (
              <div className="w-full sm:order-last sm:w-auto">
                <SendToNotaryButton
                  bailId={lease.id}
                  assignedNotaireName={followUp.notaire?.name}
                  disabledReason={sendDisabledReason}
                  label={lease.status === BailStatus.READY_FOR_NOTARY ? "Assigner un notaire" : "Valider et envoyer au notaire"}
                  hideReason
                />
              </div>
            )}
            <RequestMissingButton
              recipients={missingRecipients}
              address={property?.fullAddress || property?.label || "votre logement"}
              className="h-11 min-w-0 flex-1 px-3 sm:flex-none sm:px-4"
            />
            {lease.status === BailStatus.AWAITING_TENANT && !tenant && <TenantCreateButton bailId={lease.id} />}
            <BailMoreMenu
              bailId={lease.id}
              status={lease.status}
              tenant={tenant && tenantName ? { id: tenant.id, name: tenantName } : null}
              triggerClassName="h-11 gap-1.5 px-3 sm:gap-2 sm:px-4"
            />
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
        <div className="flex min-w-0 flex-col gap-[18px]">
          {/* Le bail */}
          <CheckSection
            id="bloc-bail"
            title="Le bail"
            subtitle="Conditions saisies par le propriétaire"
            headerRight={
              <>
                <StateChip tone={summaryChip(sections[0].summary).tone}>{summaryChip(sections[0].summary).label}</StateChip>
                {bailMissingCount > 0 && (
                  <Link
                    href={`/interface/baux/${lease.id}/edit`}
                    className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
                  >
                    Compléter
                  </Link>
                )}
                {!bailLocked && <ValidateAllButton bailId={lease.id} pointKeys={sections[0].summary.pendingKeys} />}
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
                    state={missing ? "missing" : verified ? "ok" : "todo"}
                    label={point.label}
                    note={
                      point.missing.includes("depositLimit")
                        ? "Dépôt au-dessus de la limite légale"
                        : missing
                          ? `Manquant : ${point.missing.map((f) => (BAIL_FIELD_LABELS[f] || f).toLowerCase()).join(", ")}`
                          : null
                    }
                    actions={!missing && <VerifyToggle bailId={lease.id} pointKey={point.key} verified={verified} locked={bailLocked} />}
                  >
                    {point.text.filter(Boolean).join("\n")}
                  </CheckPoint>
                );
              })}
              {bailExtraMissing.map((f) => (
                <CheckPoint key={f} state="missing" label={BAIL_FIELD_LABELS[f]} note={`Manquant : ${BAIL_FIELD_LABELS[f].toLowerCase()}`} />
              ))}
            </CheckList>
          </CheckSection>

          <PartyCheckSection
            id="bloc-proprietaire"
            role="PROPRIETAIRE"
            data={ownerPoints}
            bailId={lease.id}
            verifiedKeys={verifiedKeys}
            locked={ownerLocked}
            formNote={formNote(ownerIntake)}
          />
          <PartyCheckSection
            id="bloc-locataire"
            role="LOCATAIRE"
            data={tenantPoints}
            bailId={lease.id}
            verifiedKeys={verifiedKeys}
            locked={tenantLocked}
            formNote={formNote(tenantIntake)}
            emptyAction={<TenantCreateButton bailId={lease.id} />}
          />

          {/* Le bien */}
          <CheckSection
            id="bloc-bien"
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
              property && (
                <>
                  <StateChip tone={summaryChip(sections[3].summary).tone}>{summaryChip(sections[3].summary).label}</StateChip>
                  {!propertyLocked && <ValidateAllButton bailId={lease.id} pointKeys={sections[3].summary.pendingKeys} />}
                </>
              )
            }
            footer={
              property && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Équipements du meublé</span>
                    <StateChip tone={isMeuble ? (furniturePresent === FURNITURE.length ? "ok" : "missing") : "neutral"}>
                      {isMeuble ? `${furniturePresent} / ${FURNITURE.length} présents` : "Non concerné · bail nu"}
                    </StateChip>
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
                    state={propertyDescMissing ? "missing" : isVerified(propertyDescKey, propertyLocked) ? "ok" : "todo"}
                    label="Adresse et description"
                    note={
                      missingData?.property?.missingFields.length
                        ? `Manquant : ${missingData.property.missingFields.map((f) => (f === "fullAddress" ? "adresse" : f)).join(", ")}`
                        : null
                    }
                    actions={
                      !propertyDescMissing && (
                        <VerifyToggle
                          bailId={lease.id}
                          pointKey={propertyDescKey}
                          verified={isVerified(propertyDescKey, propertyLocked)}
                          locked={propertyLocked}
                        />
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
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  </CheckPoint>
                </CheckList>
                <div className="border-t">
                  <DocumentChecklist
                    inset
                    rows={propertyDocRows}
                    verification={{
                      bailId: lease.id,
                      locked: propertyLocked,
                      points: Object.fromEntries(
                        Object.entries(propertyDocKeys).map(([rowKey, key]) => [rowKey, { pointKey: key, verified: isVerified(key, propertyLocked) }]),
                      ),
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="px-5 py-4 text-sm text-muted-foreground">Aucun bien associé à ce dossier.</p>
            )}
          </CheckSection>

          {/* Contrôles réglementaires : manuels pour l'instant */}
          <CheckSection
            id="bloc-controles"
            title="Contrôles réglementaires"
            subtitle="À vérifier par vous : pas de contrôle automatique pour l'instant"
            headerRight={
              <>
                <StateChip tone={summaryChip(sections[4].summary).tone}>{summaryChip(sections[4].summary).label}</StateChip>
                {!bailLocked && <ValidateAllButton bailId={lease.id} pointKeys={sections[4].summary.pendingKeys} />}
              </>
            }
          >
            <CheckList>
              <CheckPoint
                state={isVerified(rulesPoints[0].key, bailLocked) ? "ok" : "todo"}
                label="Plafond de loyer"
                actions={
                  <VerifyToggle
                    bailId={lease.id}
                    pointKey={rulesPoints[0].key}
                    verified={isVerified(rulesPoints[0].key, bailLocked)}
                    locked={bailLocked}
                  />
                }
              >
                {lease.rentAmount > 0
                  ? `${formatCurrency(lease.rentAmount)}${
                      surface ? ` pour ${formatSurface(surface)}, soit ${(lease.rentAmount / surface).toFixed(2).replace(".", ",")} €/m² hors charges` : ""
                    }.`
                  : "Loyer non renseigné."}
                {"\n"}Si la commune encadre les loyers, comparer au loyer de référence majoré.
              </CheckPoint>
              <CheckPoint
                state={isVerified(rulesPoints[1].key, bailLocked) ? "ok" : "todo"}
                label="Classe DPE"
                actions={
                  <VerifyToggle
                    bailId={lease.id}
                    pointKey={rulesPoints[1].key}
                    verified={isVerified(rulesPoints[1].key, bailLocked)}
                    locked={bailLocked}
                  />
                }
              >
                {"À lire dans les diagnostics.\nG : location interdite · F : interdite à partir de 2028 · F et G : loyer gelé."}
              </CheckPoint>
            </CheckList>
          </CheckSection>

          {bailDocuments.length > 0 && (
            <CheckSection id="bloc-documents" title="Documents du bail" subtitle="Pièces rattachées au bail lui-même">
              <DocumentChecklist
                inset
                rows={buildChecklistRows([], (bailDocuments as any[]).map(toChecklistDocument), {
                  keyPrefix: `bail-${lease.id}`,
                  extras: { [DocumentKind.DIAGNOSTICS]: <DiagnosticsLegend key="diagnostics-legend" /> },
                })}
              />
            </CheckSection>
          )}

          <details className="group overflow-hidden rounded-xl border bg-card">
            <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-[15px] font-semibold">
              Détails techniques et historique
              <span className="text-[13px] font-medium text-muted-foreground group-open:hidden">Référence, paiement, adresse normalisée, historique</span>
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
                  {formatDateTime(lease.createdAt)}
                  {lease.createdBy ? ` par ${lease.createdBy.name || lease.createdBy.email}` : " · via le formulaire propriétaire"}
                </KV>
                <KV label="Modifié le">
                  {formatDateTime(lease.updatedAt)}
                  {lease.updatedBy ? ` par ${lease.updatedBy.name || lease.updatedBy.email}` : ""}
                </KV>
                <KV label="Paiement">
                  {lease.paidAt ? `Payé le ${formatDate(lease.paidAt)}` : "Non payé"}
                  {lease.stripePaymentIntentId && <span className="break-all font-mono text-xs"> · Stripe {lease.stripePaymentIntentId}</span>}
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
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Historique</h3>
                <BailAuditTimeline bailId={lease.id} bare />
              </div>
            </div>
          </details>
        </div>

        {/* Colonne latérale (en premier sur téléphone) */}
        <aside className="order-first flex min-w-0 flex-col gap-4 lg:order-none">
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-[18px]">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">Vérification</h2>
              <span className="text-sm font-bold">
                {overall.verified} / {overall.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <ul className="flex flex-col">
              {sections.map((section) => {
                const chip = summaryChip(section.summary);
                return (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="flex min-h-8 items-center justify-between gap-2 text-sm hover:underline">
                      <span>{section.title}</span>
                      <span
                        className={cn(
                          "font-semibold",
                          chip.tone === "missing" ? "text-red-700" : chip.tone === "ok" ? "text-green-700" : "text-muted-foreground",
                        )}
                      >
                        {chip.label}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{ctaHelp}</p>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border bg-card p-[18px]">
            <h2 className="text-base font-semibold">Déjà contrôlé automatiquement</h2>
            {[
              {
                ok: depositOk,
                title: depositOk ? "Dépôt de garantie conforme" : "Dépôt de garantie trop élevé",
                detail: "Limite de 1 mois (nu) ou 2 mois (meublé) imposée à la saisie",
              },
              {
                ok: docsMissing === 0,
                title:
                  docsMissing === 0
                    ? "Pièces obligatoires présentes"
                    : `${docsMissing} pièce${docsMissing > 1 ? "s" : ""} obligatoire${docsMissing > 1 ? "s" : ""} manquante${docsMissing > 1 ? "s" : ""}`,
                detail: "Calcul selon la situation familiale et la copropriété",
              },
            ].map((check) => (
              <div key={check.detail} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-[22px] items-center justify-center rounded-full",
                    check.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
                  )}
                >
                  {check.ok ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="flex flex-col gap-0.5">
                  <strong className="text-sm font-semibold">{check.title}</strong>
                  <span className="text-[13px] leading-snug text-muted-foreground">{check.detail}</span>
                </span>
              </div>
            ))}
            <p className="text-[12.5px] leading-snug text-muted-foreground">
              Plafond de loyer et classe DPE ne sont pas contrôlés automatiquement : ils figurent dans « Contrôles réglementaires », à valider par vous.
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border bg-card p-[18px]">
            <h2 className="text-base font-semibold">Suivi</h2>
            <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
              <KV label="Frais de dossier">
                <StateChip tone={lease.paidAt ? "ok" : "missing"} className="h-6">
                  {lease.paidAt ? `Payés le ${formatDate(lease.paidAt)}` : "Non payés"}
                </StateChip>
              </KV>
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
              <KV label="Demandes en cours du notaire">
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
              Seules les demandes ouvertes du notaire apparaissent ici ; ses discussions avec les parties ne sont pas affichées.
            </p>
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
  );
}
