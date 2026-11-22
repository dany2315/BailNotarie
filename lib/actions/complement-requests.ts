"use server";

import { actionErrorMessage } from "@/lib/utils/action-error";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  BailFamille,
  ComplementItemKind,
  ComplementItemStatus,
  ComplementOrigin,
  ComplementReason,
  ComplementRequestStatus,
  DocumentKind,
  NotificationType,
  Prisma,
  ProfilType,
  ReminderTarget,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientFromUser, requireAuth, requireRole } from "@/lib/auth-helpers";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailComplement from "@/emails/mail-complement";
import MailNotaireComplementAnswered from "@/emails/mail-notaire-complement-answered";
import { getActorName, getClientDisplayName, getClientGreetingName } from "@/lib/actions/bail-audit-log";
import { deleteDocumentFromDB } from "@/lib/document-storage";
import { queueDiagnosticReading } from "@/lib/diagnostics/run";
import { isValidUploadKey } from "@/lib/upload-access";
import { createUserForClient } from "@/lib/utils/user-creation";
import { createNotificationForAllUsers, createNotificationForUser } from "@/lib/utils/notifications";
import {
  updateClientCompletionStatus,
  updatePropertyCompletionStatus,
} from "@/lib/utils/completion-status";
import { assessRentCap, requiresOccupancyDeclaration } from "@/lib/rent-cap";
import { relocationProofKinds } from "@/lib/utils/rent-relocation";
import { documentKindLabels } from "@/lib/utils/document-labels";
import {
  leaseDocumentRequirements,
  partyDocumentRequirements,
  propertyDocumentRequirements,
  type DocumentRequirement,
} from "@/lib/rules/dossier-rules";
import {
  COMPLEMENT_MESSAGE_MAX,
  COMPLEMENT_NOTE_MAX,
  complementEmailContent,
  complementItemKey,
  complementKey,
  complementRequestPath,
  fieldComplementKey,
  type ComplementItemKindValue,
  type ComplementReasonValue,
} from "@/lib/utils/complement";
import {
  FIELD_QUESTION_IDS,
  availableQuestions,
  describeChanges,
  missingQuestions,
  pickQuestionValues,
  questionErrors,
  questionLabel,
  questionPersonName,
  questionScope,
  sameQuestion,
  questionSummary,
  type FieldChange,
  type FieldQuestionId,
  type QuestionContext,
  type QuestionRef,
} from "@/lib/rules/complement-questions";
import {
  afterAnswerWritten,
  checkAnswer,
  loadDossierState,
  mergeAnswer,
  personIndexOf,
  writeAnswer,
  type DossierState,
} from "@/lib/complements/dossier-answers";
import { readAgreementSnapshot, settleTenantAgreement } from "@/lib/bail/tenant-agreement";

type Fail = { success: false; error: string };

const BASE_URL = () => process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
const FROM = "BailNotarie – Équipe <contact@bailnotarie.fr>";
const ACTIVE_STATUSES: ComplementRequestStatus[] = [ComplementRequestStatus.OPEN, ComplementRequestStatus.SUBMITTED];

/* -------------------------------------------------------------------------- */
/*                               Lecture du dossier                           */
/* -------------------------------------------------------------------------- */

const docSelect = { id: true, kind: true, label: true, fileKey: true, mimeType: true, size: true, createdAt: true, complementItemId: true };

const partyInclude = {
  persons: {
    orderBy: { isPrimary: "desc" as const },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      familyStatus: true,
      matrimonialRegime: true,
      isPrimary: true,
      documents: { select: docSelect },
    },
  },
  entreprise: { select: { id: true, legalName: true, name: true, email: true, isRegistered: true, documents: { select: docSelect } } },
  documents: { where: { personId: null, entrepriseId: null, propertyId: null, bailId: null }, select: docSelect },
};

async function loadBail(bailId: string, db: Prisma.TransactionClient = prisma) {
  return db.bail.findUnique({
    where: { id: bailId },
    include: {
      property: { include: { documents: { select: docSelect } } },
      parties: { include: partyInclude },
      documents: { select: docSelect },
      commercialTerms: { select: { previouslyLet: true } },
    },
  });
}
type LoadedBail = NonNullable<Awaited<ReturnType<typeof loadBail>>>;

/**
 * Qui peut demander pour ce dossier : un administrateur (demande de l'équipe) ou le notaire
 * assigné au dossier (sa propre demande, qu'il suit depuis son espace).
 */
async function requireRequester(bailId: string) {
  const user = await requireAuth();
  if (user.role === Role.ADMINISTRATEUR) return { user, origin: ComplementOrigin.TEAM, assignmentId: null as string | null };
  if (user.role === Role.NOTAIRE) {
    const assignment = await prisma.dossierNotaireAssignment.findFirst({ where: { bailId, notaireId: user.id }, select: { id: true } });
    if (assignment) return { user, origin: ComplementOrigin.NOTAIRE, assignmentId: assignment.id };
  }
  throw new Error("Non autorisé");
}

/** Suivi d'une demande : l'équipe pour toutes, le notaire seulement pour les siennes. */
async function requireRequestAccess(request: { bailId: string; origin: ComplementOrigin }) {
  const access = await requireRequester(request.bailId);
  if (access.origin === ComplementOrigin.NOTAIRE && request.origin !== ComplementOrigin.NOTAIRE) throw new Error("Non autorisé");
  return access;
}

async function allowed<T>(check: () => Promise<T>): Promise<T | null> {
  try {
    return await check();
  } catch {
    return null;
  }
}

function partyOf(bail: LoadedBail, target: ReminderTarget) {
  return bail.parties.find((p) => p.profilType === (target === ReminderTarget.OWNER ? ProfilType.PROPRIETAIRE : ProfilType.LOCATAIRE)) ?? null;
}

function partyEmail(party: NonNullable<ReturnType<typeof partyOf>>) {
  return (party.entreprise?.email || party.persons[0]?.email || "").trim() || null;
}

function addressOf(bail: LoadedBail) {
  return bail.property?.fullAddress || bail.property?.label || "votre logement";
}

/* -------------------------------------------------------------------------- */
/*                          Fenêtre « Demander des pièces »                   */
/* -------------------------------------------------------------------------- */

export interface ComposerDocument {
  id: string;
  label: string | null;
  fileKey: string;
  mimeType: string | null;
  createdAt: string;
}

export interface ComposerRow {
  key: string;
  kind: string;
  label: string;
  group: "party" | "property" | "bail";
  level: "blocking" | "expected" | "optional" | "extra";
  target: { personId?: string; entrepriseId?: string; clientId?: string; propertyId?: string; bailId?: string };
  documents: ComposerDocument[];
  /** Déjà dans une demande en cours (en attente du client ou à vérifier). */
  pending: boolean;
}

/** Information qu'on peut demander (une question du formulaire). */
export interface ComposerFieldRow {
  key: string;
  question: FieldQuestionId;
  label: string;
  group: "party" | "property" | "bail";
  target: { personId?: string; entrepriseId?: string; propertyId?: string; bailId?: string };
  /** Données manquantes de cette question (vide : tout est renseigné). */
  missing: string[];
  /** Valeurs actuelles, en clair. */
  current: string;
  pending: boolean;
}

export interface ComposerData {
  bailId: string;
  target: ReminderTarget;
  name: string;
  /** Nom après « Bonjour » dans l'e-mail (société ou personne principale). */
  greetingName: string | null;
  email: string | null;
  address: string;
  rows: ComposerRow[];
  fields: ComposerFieldRow[];
  /** Formulaire pas encore envoyé : on le relance, on ne demande rien d'autre. */
  formPending: boolean;
  /** Demande déjà ouverte pour cette personne : les nouvelles pièces s'y ajoutent. */
  openRequest: {
    id: string;
    status: ComplementRequestStatus;
    message: string | null;
    /** Lignes déjà attendues : l'e-mail repart avec elles et les nouvelles. */
    pendingItems: Array<{ label: string; reason: ComplementReasonValue; note: string | null; kind: ComplementItemKindValue }>;
  } | null;
}

/** Rattachement d'une question : la personne, la société, le bien ou le bail. */
function questionTarget(state: DossierState, ref: QuestionRef): ComposerFieldRow["target"] | null {
  switch (questionScope(ref.id)) {
    case "person": {
      const personId = state.personIds[ref.personIndex ?? 0];
      return personId ? { personId } : null;
    }
    case "entreprise":
      return state.party.entreprise ? { entrepriseId: state.party.entreprise.id } : null;
    case "property":
      return state.bail.property ? { propertyId: state.bail.property.id } : null;
    case "bail":
      return { bailId: state.bail.id };
  }
}

function questionGroup(id: FieldQuestionId): ComposerFieldRow["group"] {
  const scope = questionScope(id);
  return scope === "person" || scope === "entreprise" ? "party" : scope === "property" ? "property" : "bail";
}

function labelFor(state: DossierState, ref: QuestionRef) {
  const person = ref.personIndex !== null ? state.values.persons?.[ref.personIndex] : null;
  return questionLabel(ref.id, { personName: person ? questionPersonName(person) : null, commercial: state.ctx.bailFamily === "COMMERCIAL" });
}

/** Informations que l'équipe peut demander : les manquantes d'abord, puis les autres (à corriger ou confirmer). */
function composerFields(state: DossierState): ComposerFieldRow[] {
  const missing = missingQuestions(state.values, state.ctx);
  const rows: ComposerFieldRow[] = [];
  for (const ref of availableQuestions(state.values, state.ctx)) {
    const target = questionTarget(state, ref);
    if (!target) continue;
    rows.push({
      key: fieldComplementKey(ref.id, target),
      question: ref.id,
      label: labelFor(state, ref),
      group: questionGroup(ref.id),
      target,
      missing: missing.find((m) => sameQuestion(m, ref))?.messages ?? [],
      current: questionSummary(ref, state.values, state.ctx),
      pending: false,
    });
  }
  return rows;
}

/** Le formulaire de cette personne est-il encore en cours ? (On le relance, on ne demande rien d'autre.) */
async function formStillPending(bailId: string, clientId: string) {
  const link = await prisma.intakeLink.findFirst({ where: { bailId, clientId, status: "PENDING" }, select: { id: true } });
  return !!link;
}

function targetIds(rule: DocumentRequirement, bail: LoadedBail, party: NonNullable<ReturnType<typeof partyOf>>): ComposerRow["target"] | null {
  switch (rule.target) {
    case "person": {
      const person = party.persons[rule.personIndex ?? 0];
      return person ? { personId: person.id } : null;
    }
    case "entreprise":
      return party.entreprise ? { entrepriseId: party.entreprise.id } : null;
    case "client":
      return { clientId: party.id };
    case "property":
      return bail.property ? { propertyId: bail.property.id } : null;
    case "bail":
      return { bailId: bail.id };
  }
}

function docsAt(bail: LoadedBail, party: NonNullable<ReturnType<typeof partyOf>>, target: ComposerRow["target"]) {
  if (target.personId) return party.persons.find((p) => p.id === target.personId)?.documents ?? [];
  if (target.entrepriseId) return party.entreprise?.documents ?? [];
  if (target.clientId) return party.documents;
  if (target.propertyId) return bail.property?.documents ?? [];
  return bail.documents;
}

const toComposerDoc = (doc: { id: string; label: string | null; fileKey: string; mimeType: string | null; createdAt: Date }): ComposerDocument => ({
  id: doc.id,
  label: doc.label,
  fileKey: doc.fileKey,
  mimeType: doc.mimeType,
  createdAt: doc.createdAt.toISOString(),
});

/** Pièces que l'équipe peut demander à cette personne : celles attendues par les règles du dossier, et celles déjà reçues. */
async function composerRows(bail: LoadedBail, target: ReminderTarget): Promise<ComposerRow[]> {
  const party = partyOf(bail, target);
  if (!party) return [];
  const rules: Array<DocumentRequirement & { group: ComposerRow["group"] }> = partyDocumentRequirements({
    clientType: party.type,
    persons: party.persons,
    entreprise: party.entreprise,
  }).map((rule) => ({ ...rule, group: "party" as const }));

  if (target === ReminderTarget.OWNER && bail.property) {
    rules.push(...propertyDocumentRequirements(bail.property).map((rule) => ({ ...rule, group: "property" as const })));
    const commercial = bail.bailFamily === BailFamille.COMMERCIAL;
    const occupancyDeclarationRequired = !commercial && requiresOccupancyDeclaration(await assessRentCap({ property: bail.property, bail }));
    const leaseRules = leaseDocumentRequirements({
      bailFamily: bail.bailFamily,
      property: bail.property,
      previouslyLet: bail.commercialTerms?.previouslyLet ?? null,
      isCompany: party.type === "PERSONNE_MORALE",
      occupancyDeclarationRequired,
      rentProofKinds: commercial ? [] : relocationProofKinds(bail as any, bail.property.dpeClass),
    }).filter((rule) => rule.kind !== "OTHER");
    rules.push(...leaseRules.map((rule) => ({ ...rule, group: rule.target === "bail" ? ("bail" as const) : ("property" as const) })));
  }

  const rows: ComposerRow[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    const ids = targetIds(rule, bail, party);
    if (!ids) continue;
    const key = complementKey(rule.kind, ids);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      key,
      kind: rule.kind,
      label: rule.label,
      group: rule.group,
      level: rule.level,
      target: ids,
      documents: docsAt(bail, party, ids).filter((doc) => doc.kind === rule.kind).map(toComposerDoc),
      pending: false,
    });
  }

  // Pièces déjà reçues sans règle (autre document, ancienne pièce…) : on peut aussi les redemander.
  const extraSources: Array<{ group: ComposerRow["group"]; target: ComposerRow["target"]; docs: LoadedBail["documents"] }> = [
    ...party.persons.map((person) => ({ group: "party" as const, target: { personId: person.id }, docs: person.documents })),
    ...(party.entreprise ? [{ group: "party" as const, target: { entrepriseId: party.entreprise.id }, docs: party.entreprise.documents }] : []),
    { group: "party" as const, target: { clientId: party.id }, docs: party.documents },
    ...(target === ReminderTarget.OWNER && bail.property
      ? [
          { group: "property" as const, target: { propertyId: bail.property.id }, docs: bail.property.documents },
          { group: "bail" as const, target: { bailId: bail.id }, docs: bail.documents },
        ]
      : []),
  ];
  for (const source of extraSources) {
    for (const kind of new Set(source.docs.map((doc) => doc.kind))) {
      const key = complementKey(kind, source.target);
      if (seen.has(key)) continue;
      seen.add(key);
      const person = source.target.personId ? party.persons.find((p) => p.id === source.target.personId) : null;
      const name = person ? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() : "";
      rows.push({
        key,
        kind,
        label: `${documentKindLabels[kind] || kind}${name ? ` de ${name}` : ""}`,
        group: source.group,
        level: "extra",
        target: source.target,
        documents: source.docs.filter((doc) => doc.kind === kind).map(toComposerDoc),
        pending: false,
      });
    }
  }
  return rows;
}

export async function getComplementComposer(data: unknown): Promise<{ success: true; data: ComposerData } | Fail> {
  const parsed = z.object({ bailId: z.string().min(1), target: z.nativeEnum(ReminderTarget) }).safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const { bailId, target } = parsed.data;
  const access = await allowed(() => requireRequester(bailId));
  if (!access) return { success: false, error: "Accès refusé" };

  const bail = await loadBail(bailId);
  if (!bail) return { success: false, error: "Dossier introuvable" };
  const party = partyOf(bail, target);
  if (!party) return { success: false, error: target === ReminderTarget.OWNER ? "Pas de propriétaire dans ce dossier" : "Pas de locataire dans ce dossier" };

  const [rows, state, formPending, openRequest] = await Promise.all([
    composerRows(bail, target),
    loadDossierState(bailId, target),
    formStillPending(bailId, party.id),
    prisma.complementRequest.findFirst({
      where: { bailId, clientId: party.id, origin: access.origin, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, message: true, items: {
          where: { status: ComplementItemStatus.PENDING },
          orderBy: { position: "asc" },
          select: {
            kind: true,
            documentKind: true,
            fieldKey: true,
            label: true,
            reason: true,
            note: true,
            personId: true,
            entrepriseId: true,
            clientId: true,
            propertyId: true,
            bailId: true,
          },
        },
      },
    }),
  ]);
  const fields = state ? composerFields(state) : [];
  const pendingKeys = new Set((openRequest?.items ?? []).map((item) => complementItemKey(item)));
  for (const row of rows) row.pending = pendingKeys.has(row.key);
  for (const row of fields) row.pending = pendingKeys.has(row.key);

  return {
    success: true,
    data: {
      bailId,
      target,
      name: getClientGreetingName(party) || getClientDisplayName(party) || (target === ReminderTarget.OWNER ? "Propriétaire" : "Locataire"),
      greetingName: getClientGreetingName(party),
      email: partyEmail(party),
      address: addressOf(bail),
      rows,
      fields,
      formPending,
      openRequest: openRequest
        ? {
            id: openRequest.id,
            status: openRequest.status,
            message: openRequest.message,
            pendingItems: openRequest.items.map((item) => ({
              label: item.label,
              reason: item.reason as ComplementReasonValue,
              note: item.note,
              kind: item.kind as ComplementItemKindValue,
            })),
          }
        : null,
    },
  };
}

/** Informations manquantes par personne (bouton « Demander… » de la fiche), selon les règles du formulaire. */
export async function getMissingFieldCounts(bailId: string): Promise<Record<"OWNER" | "TENANT", number>> {
  await requireRole([Role.ADMINISTRATEUR, Role.OPERATEUR, Role.REVIEWER]);
  const counts = { OWNER: 0, TENANT: 0 };
  for (const target of ["OWNER", "TENANT"] as const) {
    const state = await loadDossierState(bailId, target).catch(() => null);
    if (state) counts[target] = missingQuestions(state.values, state.ctx).length;
  }
  return counts;
}

/* -------------------------------------------------------------------------- */
/*                                Envoi par l'équipe                          */
/* -------------------------------------------------------------------------- */

const targetSchema = z
  .object({
    personId: z.string().min(1).optional(),
    entrepriseId: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
    propertyId: z.string().min(1).optional(),
    bailId: z.string().min(1).optional(),
  })
  .refine((t) => Object.values(t).filter(Boolean).length === 1, { message: "Une seule cible attendue" });

const itemSchema = z.object({
  kind: z.nativeEnum(DocumentKind),
  label: z.string().trim().min(2).max(200),
  reason: z.nativeEnum(ComplementReason),
  note: z.string().trim().max(COMPLEMENT_NOTE_MAX).optional(),
  target: targetSchema,
  replacesDocumentIds: z.array(z.string().min(1)).max(20).default([]),
});

const fieldItemSchema = z.object({
  question: z.enum(FIELD_QUESTION_IDS),
  reason: z.enum(["MISSING", "WRONG_VALUE", "TO_CONFIRM"]),
  note: z.string().trim().max(COMPLEMENT_NOTE_MAX).optional(),
  target: targetSchema,
});

const sendSchema = z
  .object({
    bailId: z.string().min(1),
    target: z.nativeEnum(ReminderTarget),
    message: z.string().trim().max(COMPLEMENT_MESSAGE_MAX).optional(),
    items: z.array(itemSchema).max(40).default([]),
    fields: z.array(fieldItemSchema).max(40).default([]),
  })
  .refine((data) => data.items.length + data.fields.length > 0, { message: "Choisissez au moins une pièce ou une information" });

/** Question demandée : elle existe pour cette personne, et sa cible appartient bien au dossier. */
function resolveField(state: DossierState, field: z.infer<typeof fieldItemSchema>): { ref: QuestionRef; label: string; previousValue: Record<string, unknown> } | string {
  const t = field.target;
  const scope = questionScope(field.question);
  let personIndex: number | null = null;
  if (scope === "person") {
    personIndex = personIndexOf(state, t.personId);
    if (personIndex === null) return "Cette personne n'est plus dans le dossier";
  } else if (scope === "entreprise" ? t.entrepriseId !== state.party.entreprise?.id : scope === "property" ? t.propertyId !== state.bail.property?.id : t.bailId !== state.bail.id) {
    return "Cette information ne concerne pas ce dossier";
  }
  const ref: QuestionRef = { id: field.question, personIndex };
  if (!availableQuestions(state.values, state.ctx).some((a) => sameQuestion(a, ref))) return "Cette information ne se demande pas pour ce dossier";
  return { ref, label: labelFor(state, ref), previousValue: pickQuestionValues(ref, state.values, state.ctx) };
}

/** La cible et les pièces à remplacer appartiennent bien à cette personne, à ce bien ou à ce bail. */
function checkItemTargets(bail: LoadedBail, party: NonNullable<ReturnType<typeof partyOf>>, target: ReminderTarget, items: z.infer<typeof itemSchema>[]) {
  for (const item of items) {
    const t = item.target;
    const ok =
      (t.personId && party.persons.some((p) => p.id === t.personId)) ||
      (t.entrepriseId && party.entreprise?.id === t.entrepriseId) ||
      (t.clientId && party.id === t.clientId) ||
      (target === ReminderTarget.OWNER && t.propertyId && bail.property?.id === t.propertyId) ||
      (t.bailId && bail.id === t.bailId);
    if (!ok) return `« ${item.label} » ne concerne pas ${target === ReminderTarget.OWNER ? "le propriétaire" : "le locataire"}`;
    const docs = docsAt(bail, party, t);
    if (item.replacesDocumentIds.some((id) => !docs.some((doc) => doc.id === id && doc.kind === item.kind))) {
      return `La pièce à remplacer ne correspond pas à « ${item.label} »`;
    }
  }
  return null;
}

/** E-mail de la demande, avec seulement les pièces encore attendues. */
async function sendRequestEmail(requestId: string, reminder: boolean): Promise<string | null> {
  const request = await prisma.complementRequest.findUnique({
    where: { id: requestId },
    include: {
      items: { where: { status: ComplementItemStatus.PENDING }, orderBy: { position: "asc" } },
      client: { include: { persons: { orderBy: { isPrimary: "desc" }, take: 1 }, entreprise: true } },
      bail: { select: { property: { select: { fullAddress: true, label: true } } } },
    },
  });
  if (!request) return "Demande introuvable";
  if (request.items.length === 0) return "Plus rien n'est attendu";
  const props = {
    name: getClientGreetingName(request.client) || "",
    address: request.bail.property?.fullAddress || request.bail.property?.label || "votre logement",
    // Relance ou pièce redemandée : texte de relance, toujours juste (le premier message peut ne plus l'être).
    message: reminder ? null : request.message,
    items: request.items.map((item) => ({
      label: item.label,
      reason: item.reason as ComplementReasonValue,
      note: item.note,
      kind: item.kind as ComplementItemKindValue,
    })),
    reminder,
    actionUrl: `${BASE_URL()}${complementRequestPath(request.id)}`,
  };
  try {
    const result = await resendSendEmail({
      from: FROM,
      to: request.recipientEmail,
      subject: complementEmailContent(props).subject,
      react: MailComplement(props),
    });
    if (result.error) throw new Error(result.error.message);
    return null;
  } catch (error) {
    console.error("[complement-requests] envoi", error);
    return `Envoi impossible à ${request.recipientEmail}`;
  }
}

function revalidateBail(bailId: string) {
  revalidatePath(`/interface/baux/${bailId}`);
  revalidatePath("/notaire/dossiers", "layout");
  revalidatePath("/client/proprietaire");
  revalidatePath("/client/locataire");
}

/**
 * Envoie la demande (ou ajoute les pièces à celle déjà ouverte pour cette personne), puis l'e-mail.
 * Si l'e-mail ne part pas, rien n'est enregistré.
 */
export async function sendComplementRequest(data: unknown): Promise<{ success: true; data: { requestId: string; email: string } } | Fail> {
  const parsed = sendSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, target, message, items, fields } = parsed.data;
  const access = await allowed(() => requireRequester(bailId));
  if (!access) return { success: false, error: "Accès refusé" };
  const { user, origin } = access;

  const bail = await loadBail(bailId);
  if (!bail) return { success: false, error: "Dossier introuvable" };
  const party = partyOf(bail, target);
  if (!party) return { success: false, error: "Personne absente du dossier" };
  const email = partyEmail(party);
  if (!email) return { success: false, error: `${getClientDisplayName(party) || "Cette personne"} n'a pas d'adresse e-mail` };
  // Formulaire pas encore envoyé : il demande déjà tout ce qui est obligatoire, on le relance plutôt.
  if (await formStillPending(bailId, party.id)) {
    return { success: false, error: "Son formulaire n'est pas encore envoyé : relancez-le plutôt (il demande déjà tout ce qui manque)." };
  }
  const invalid = checkItemTargets(bail, party, target, items);
  if (invalid) return { success: false, error: invalid };

  // Informations : la question existe pour ce dossier ; libellé et valeurs actuelles calculés ici.
  const state = fields.length > 0 ? await loadDossierState(bailId, target) : null;
  if (fields.length > 0 && !state) return { success: false, error: "Dossier introuvable" };
  const resolvedFields: Array<{ field: z.infer<typeof fieldItemSchema>; ref: QuestionRef; label: string; previousValue: Record<string, unknown> }> = [];
  for (const field of fields) {
    const resolved = resolveField(state!, field);
    if (typeof resolved === "string") return { success: false, error: resolved };
    resolvedFields.push({ field, ...resolved });
  }

  // Compte de l'espace client (connexion par code reçu par e-mail) : créé s'il n'existe pas encore.
  try {
    await createUserForClient(party.id);
  } catch (error) {
    console.error("[complement-requests] compte client", error);
  }

  const existing = await prisma.complementRequest.findFirst({
    where: { bailId, clientId: party.id, origin, status: { in: ACTIVE_STATUSES } },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  // Une ligne déjà attendue n'est pas ajoutée deux fois.
  const pendingKeys = new Set(
    (existing?.items ?? []).filter((item) => item.status === ComplementItemStatus.PENDING).map((item) => complementItemKey(item)),
  );
  const fresh = items.filter((item) => !pendingKeys.has(complementKey(item.kind, item.target)));
  const freshFields = resolvedFields.filter(({ field }) => !pendingKeys.has(fieldComplementKey(field.question, field.target)));
  if (existing && fresh.length === 0 && freshFields.length === 0) return { success: false, error: "Tout cela est déjà demandé" };

  const startAt = existing?.items.length ?? 0;
  const itemData = [
    ...fresh.map((item) => ({
      kind: ComplementItemKind.DOCUMENT,
      documentKind: item.kind,
      label: item.label,
      reason: item.reason,
      note: item.note || null,
      replacesDocumentIds: item.replacesDocumentIds,
      ...item.target,
    })),
    ...freshFields.map(({ field, label, previousValue }) => ({
      kind: ComplementItemKind.FIELD,
      fieldKey: field.question,
      label,
      reason: field.reason as ComplementReason,
      note: field.note || null,
      previousValue: previousValue as Prisma.InputJsonValue,
      ...field.target,
    })),
  ].map((item, index) => ({ ...item, position: startAt + index }));

  let requestId: string;
  let createdItemIds: string[] = [];
  const previous = existing ? { status: existing.status, message: existing.message, sentCount: existing.sentCount, lastSentAt: existing.lastSentAt, submittedAt: existing.submittedAt } : null;
  if (existing) {
    const created = await prisma.$transaction(itemData.map((item) => prisma.complementRequestItem.create({ data: { ...item, requestId: existing.id }, select: { id: true } })));
    createdItemIds = created.map((item) => item.id);
    await prisma.complementRequest.update({
      where: { id: existing.id },
      data: {
        status: ComplementRequestStatus.OPEN,
        // Nouveau message relu dans l'aperçu (le précédent ne parlait pas de ces pièces).
        message: message || null,
        recipientEmail: email,
        submittedAt: null,
        sentCount: { increment: 1 },
        lastSentAt: new Date(),
      },
    });
    requestId = existing.id;
  } else {
    const created = await prisma.complementRequest.create({
      data: {
        bailId,
        clientId: party.id,
        target,
        origin,
        message: message || null,
        recipientEmail: email,
        createdById: user.id,
        createdByName: getActorName(user),
        items: { create: itemData },
      },
      select: { id: true },
    });
    requestId = created.id;
  }

  const sendError = await sendRequestEmail(requestId, false);
  if (sendError) {
    // Rien d'envoyé : on remet la demande dans l'état d'avant.
    if (existing && previous) {
      await prisma.complementRequestItem.deleteMany({ where: { id: { in: createdItemIds } } });
      await prisma.complementRequest.update({ where: { id: existing.id }, data: previous });
    } else {
      await prisma.complementRequest.delete({ where: { id: requestId } });
    }
    return { success: false, error: sendError };
  }

  // Demande du notaire : l'équipe est prévenue (elle suit aussi le dossier).
  if (origin === ComplementOrigin.NOTAIRE) {
    await createNotificationForAllUsers(NotificationType.COMPLEMENT_REQUESTED_BY_NOTAIRE, "BAIL", bailId, user.id, {
      notaireName: getActorName(user),
      clientName: getClientDisplayName(party),
      propertyLabel: bail.property?.label || bail.property?.fullAddress || null,
      count: items.length + fields.length,
    }).catch((error) => console.error("[complement-requests] notification notaire", error));
  }
  revalidateBail(bailId);
  return { success: true, data: { requestId, email } };
}

async function loadRequestForStaff(requestId: string) {
  return prisma.complementRequest.findUnique({ where: { id: requestId }, include: { items: { include: { documents: { select: { id: true } } } } } });
}

/** Relance : le même e-mail, avec seulement les pièces encore attendues. */
export async function remindComplementRequest(data: unknown): Promise<{ success: true } | Fail> {
  const parsed = z.object({ requestId: z.string().min(1) }).safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const request = await loadRequestForStaff(parsed.data.requestId);
  const access = request ? await allowed(() => requireRequestAccess(request)) : null;
  if (request && !access) return { success: false, error: "Accès refusé" };
  if (!request || request.status !== ComplementRequestStatus.OPEN) return { success: false, error: "Cette demande n'attend plus le client" };
  const sendError = await sendRequestEmail(request.id, true);
  if (sendError) return { success: false, error: sendError };
  await prisma.complementRequest.update({ where: { id: request.id }, data: { sentCount: { increment: 1 }, lastSentAt: new Date() } });
  if (access?.origin === ComplementOrigin.NOTAIRE) await traceNotaireReminder(access.user, [request]);
  revalidateBail(request.bailId);
  return { success: true };
}

/**
 * Relance du notaire : tracée à son nom (une ligne par relance, même pour plusieurs demandes), pour qu'il ne
 * voie que les siennes. Elle n'entre pas dans le calcul des relances de l'équipe, qui la voit dans l'historique.
 */
async function traceNotaireReminder(
  user: Parameters<typeof getActorName>[0] & { id: string },
  requests: Array<{ bailId: string; clientId: string; target: ReminderTarget; recipientEmail: string; items: Array<{ status: ComplementItemStatus; label: string }> }>,
) {
  const first = requests[0];
  if (!first) return;
  await prisma.bailReminder
    .create({
      data: {
        bailId: first.bailId,
        clientId: first.clientId,
        target: first.target,
        reason: "MISSING_ITEMS",
        channel: "EMAIL",
        recipientEmail: first.recipientEmail,
        items: requests.flatMap((r) => r.items.filter((item) => item.status === ComplementItemStatus.PENDING).map((item) => item.label)),
        note: "Relance du notaire",
        createdById: user.id,
        createdByName: getActorName(user),
      },
    })
    .catch((error) => console.error("[complement-requests] trace de la relance du notaire", error));
  revalidatePath("/notaire");
}

/** Le notaire relance le propriétaire ou le locataire : toutes ses demandes encore sans réponse, en un rappel. */
export async function remindNotaireTarget(data: unknown): Promise<{ success: true; data: { emails: string[] } } | Fail> {
  const parsed = z.object({ bailId: z.string().min(1), target: z.enum(["OWNER", "TENANT"]) }).safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const access = await allowed(() => requireRequester(parsed.data.bailId));
  if (!access || access.origin !== ComplementOrigin.NOTAIRE) return { success: false, error: "Accès refusé" };
  const requests = await prisma.complementRequest.findMany({
    where: { bailId: parsed.data.bailId, target: parsed.data.target, origin: ComplementOrigin.NOTAIRE, status: ComplementRequestStatus.OPEN },
    include: { items: { select: { status: true, label: true } } },
  });
  if (requests.length === 0) return { success: false, error: "Rien n'est en attente de cette personne" };
  const sent: typeof requests = [];
  let lastError: string | null = null;
  for (const request of requests) {
    const sendError = await sendRequestEmail(request.id, true);
    if (sendError) {
      lastError = sendError;
      continue;
    }
    await prisma.complementRequest.update({ where: { id: request.id }, data: { sentCount: { increment: 1 }, lastSentAt: new Date() } });
    sent.push(request);
  }
  if (sent.length === 0) return { success: false, error: lastError ?? "Le rappel n'a pas pu être envoyé" };
  await traceNotaireReminder(access.user, sent);
  revalidateBail(parsed.data.bailId);
  return { success: true, data: { emails: [...new Set(sent.map((r) => r.recipientEmail))] } };
}

export interface NotaireReminderSummary {
  count: number;
  lastAt: string | null;
}

/** Relances faites par le notaire connecté dans ce dossier, par personne (jamais celles de l'équipe). */
export async function getNotaireReminders(bailId: string): Promise<Record<"OWNER" | "TENANT", NotaireReminderSummary>> {
  const empty = { OWNER: { count: 0, lastAt: null }, TENANT: { count: 0, lastAt: null } };
  const access = await allowed(() => requireRequester(bailId));
  if (!access || access.origin !== ComplementOrigin.NOTAIRE) return empty;
  const rows = await prisma.bailReminder.findMany({
    where: { bailId, createdById: access.user.id, reason: "MISSING_ITEMS", channel: "EMAIL" },
    orderBy: { createdAt: "desc" },
    select: { target: true, createdAt: true },
  });
  const out: Record<"OWNER" | "TENANT", NotaireReminderSummary> = { OWNER: { count: 0, lastAt: null }, TENANT: { count: 0, lastAt: null } };
  for (const row of rows) {
    const entry = out[row.target as "OWNER" | "TENANT"];
    entry.count += 1;
    entry.lastAt ??= row.createdAt.toISOString();
  }
  return out;
}

/**
 * Annule la demande : les pièces déjà reçues restent dans le dossier. Les informations proposées par le
 * client et pas encore acceptées ne sont jamais appliquées : les valeurs du dossier restent telles quelles
 * (rien n'est « restauré » par-dessus une modification faite entre-temps).
 */
export async function cancelComplementRequest(data: unknown): Promise<{ success: true } | Fail> {
  const parsed = z.object({ requestId: z.string().min(1) }).safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const request = await loadRequestForStaff(parsed.data.requestId);
  if (request && !(await allowed(() => requireRequestAccess(request)))) return { success: false, error: "Accès refusé" };
  if (!request || !ACTIVE_STATUSES.includes(request.status)) return { success: false, error: "Cette demande est déjà terminée" };
  await prisma.complementRequest.update({ where: { id: request.id }, data: { status: ComplementRequestStatus.CANCELLED, closedAt: new Date() } });
  revalidateBail(request.bailId);
  return { success: true };
}

/** Recalcule l'état du client et du bien après un ajout ou une suppression de pièce. */
async function recalculate(targets: Array<{ personId?: string | null; entrepriseId?: string | null; clientId?: string | null; propertyId?: string | null }>) {
  const clientIds = new Set<string>();
  const propertyIds = new Set<string>();
  for (const t of targets) {
    if (t.propertyId) propertyIds.add(t.propertyId);
    if (t.clientId) clientIds.add(t.clientId);
    if (t.personId) {
      const person = await prisma.person.findUnique({ where: { id: t.personId }, select: { clientId: true } });
      if (person) clientIds.add(person.clientId);
    }
    if (t.entrepriseId) {
      const entreprise = await prisma.entreprise.findUnique({ where: { id: t.entrepriseId }, select: { clientId: true } });
      if (entreprise) clientIds.add(entreprise.clientId);
    }
  }
  for (const id of clientIds) await updateClientCompletionStatus(id).catch((error) => console.error("[complement-requests] client", error));
  for (const id of propertyIds) await updatePropertyCompletionStatus(id).catch((error) => console.error("[complement-requests] bien", error));
}

type ReviewActor = { id: string; name: string };
type ItemTarget = { personId: string | null; entrepriseId: string | null; clientId: string | null; propertyId: string | null; bailId: string | null };

/**
 * Même contenu, quel que soit l'ordre des champs : la base range les champs d'une valeur JSON dans son propre
 * ordre, différent de celui du formulaire. Sans ce tri, une information à plusieurs champs (nom et prénom,
 * loyer commercial…) passait pour « modifiée depuis la réponse » alors que rien n'avait changé.
 */
const sortedKeys = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(sortedKeys)
    : value && typeof value === "object"
      ? Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, sortedKeys((value as Record<string, unknown>)[key])]))
      : value;
const sameJson = (a: unknown, b: unknown) => JSON.stringify(sortedKeys(a ?? null)) === JSON.stringify(sortedKeys(b ?? null));

/**
 * Anciennes pièces que l'équipe peut retirer en acceptant la nouvelle : les pièces actives du même type au
 * même endroit du dossier, et celles que la demande visait (illisible, expirée…). Jamais les fichiers que
 * le client vient d'envoyer pour cette ligne.
 */
async function replaceableDocuments(item: ItemTarget & { id: string; documentKind: DocumentKind | null; replacesDocumentIds: string[] }, db: Prisma.TransactionClient = prisma) {
  if (!item.documentKind) return [];
  return db.document.findMany({
    where: {
      archivedAt: null,
      AND: [
        // Pas les fichiers envoyés pour cette ligne (une pièce sans demande d'origine reste éligible).
        { OR: [{ complementItemId: null }, { complementItemId: { not: item.id } }] },
        {
          OR: [
            { kind: item.documentKind, personId: item.personId, entrepriseId: item.entrepriseId, clientId: item.clientId, propertyId: item.propertyId, bailId: item.bailId },
            { id: { in: item.replacesDocumentIds } },
          ],
        },
      ],
    },
    select: { ...docSelect, personId: true, entrepriseId: true, clientId: true, propertyId: true, bailId: true },
    orderBy: { createdAt: "asc" },
  });
}

export type AcceptOutcome =
  | { ok: true }
  | { ok: false; error: string; conflict?: FieldChange[] };

/**
 * Accepte une ligne reçue.
 *
 * Pièce : les anciennes pièces choisies par l'équipe (ou par le notaire, sur sa propre demande) sont archivées
 * (retirées des pièces actives, fichier et ligne conservés, reliées à la nouvelle). Sans choix, les anciennes
 * pièces restent actives.
 *
 * Information : la réponse du client, restée une proposition jusque-là, est recontrôlée puis écrite dans le
 * dossier avec le journal avant/après. Si le dossier a changé depuis la réponse, rien n'est écrit tant que
 * l'équipe n'a pas vu la différence et confirmé.
 */
async function acceptItem(
  itemId: string,
  request: { bailId: string; target: ReminderTarget },
  actor: ReviewActor,
  options: { archiveDocumentIds?: string[]; confirmConflict?: boolean } = {},
): Promise<AcceptOutcome> {
  const item = await prisma.complementRequestItem.findUnique({ where: { id: itemId }, include: { documents: { select: { id: true }, orderBy: { createdAt: "asc" } } } });
  if (!item || item.status !== ComplementItemStatus.PROVIDED) return { ok: false, error: "Le client n'a pas encore répondu pour cette ligne" };
  const reviewed = { status: ComplementItemStatus.ACCEPTED, reviewedAt: new Date() };

  if (item.kind === ComplementItemKind.DOCUMENT) {
    const wanted = Array.from(new Set(options.archiveDocumentIds ?? []));
    const newDocumentId = item.documents[0]?.id ?? null;
    if (wanted.length > 0 && !newDocumentId) return { ok: false, error: "Aucune nouvelle pièce ne remplace les anciennes" };
    await prisma.$transaction(async (tx) => {
      if (wanted.length > 0) {
        // Seules des pièces de ce dossier, au même endroit, peuvent être retirées (jamais celles d'un autre client).
        const allowed = await replaceableDocuments(item, tx);
        const chosen = allowed.filter((doc) => wanted.includes(doc.id));
        if (chosen.length !== wanted.length) throw new Error("Une des pièces choisies ne peut pas être retirée depuis cette demande");
        for (const doc of chosen) {
          await tx.document.update({
            where: { id: doc.id },
            data: {
              archivedAt: new Date(),
              archivedById: actor.id,
              archivedByName: actor.name,
              archivedBailId: request.bailId,
              archivedFrom: { personId: doc.personId, entrepriseId: doc.entrepriseId, clientId: doc.clientId, propertyId: doc.propertyId, bailId: doc.bailId },
              replacedById: newDocumentId,
              // Détachée de sa fiche : elle sort des pièces actives et de la complétude. Le fichier reste.
              personId: null,
              entrepriseId: null,
              clientId: null,
              propertyId: null,
              bailId: null,
            },
          });
        }
      }
      await tx.complementRequestItem.update({ where: { id: item.id }, data: reviewed });
    });
    await recalculate([item]);
    return { ok: true };
  }

  // Information déjà appliquée à la réponse (lignes d'avant ce fonctionnement) : rien à écrire.
  if (!item.proposedAnswer || !item.fieldKey) {
    await prisma.complementRequestItem.update({ where: { id: item.id }, data: reviewed });
    return { ok: true };
  }

  const state = await loadDossierState(request.bailId, request.target);
  if (!state) return { ok: false, error: "Dossier introuvable" };
  const personIndex = personIndexOf(state, item.personId);
  if (item.personId && personIndex === null) return { ok: false, error: "Cette personne n'est plus dans le dossier" };
  const ref: QuestionRef = { id: item.fieldKey as FieldQuestionId, personIndex };
  const current = pickQuestionValues(ref, state.values, state.ctx);

  // Le dossier a changé depuis la réponse du client : l'équipe voit la différence avant de décider.
  if (!sameJson(current, item.baseValue) && !options.confirmConflict) {
    return {
      ok: false,
      error: "Cette information a été modifiée dans le dossier depuis la réponse du client. Vérifiez la différence avant d'accepter.",
      conflict: describeChanges(item.baseValue as Record<string, unknown> | null, current),
    };
  }

  const checked = await checkAnswer(state, ref, item.proposedAnswer as Record<string, unknown>);
  if (!checked.ok) return { ok: false, error: `La réponse ne peut plus être appliquée : ${checked.error}` };
  const after = pickQuestionValues(ref, checked.merged, state.ctx);

  await prisma.$transaction(async (tx) => {
    const agreement = await readAgreementSnapshot(tx, request.bailId);
    await writeAnswer(tx, state, ref, checked.merged);
    // Une condition confirmée par le locataire change : son accord est archivé et redemandé.
    await settleTenantAgreement(tx, request.bailId, agreement, { id: actor.id, name: actor.name });
    await tx.complementRequestItem.update({
      where: { id: item.id },
      data: {
        ...reviewed,
        appliedBefore: current as Prisma.InputJsonValue,
        appliedAfter: after as Prisma.InputJsonValue,
        appliedAt: new Date(),
        appliedById: actor.id,
        appliedByName: actor.name,
      },
    });
  });
  await afterAnswerWritten(state, ref);
  return { ok: true };
}

/** Ferme la demande quand toutes ses pièces sont acceptées. */
async function closeIfDone(requestId: string) {
  const left = await prisma.complementRequestItem.count({ where: { requestId, status: { not: ComplementItemStatus.ACCEPTED } } });
  if (left === 0) {
    await prisma.complementRequest.update({ where: { id: requestId }, data: { status: ComplementRequestStatus.ACCEPTED, closedAt: new Date() } });
  }
}

const reviewSchema = z.discriminatedUnion("decision", [
  z.object({
    itemId: z.string().min(1),
    decision: z.literal("accept"),
    // Pièce : anciennes pièces que l'équipe choisit de retirer (archivées). Vide = elles restent actives.
    archiveDocumentIds: z.array(z.string().min(1)).max(50).optional(),
    // Information : l'équipe a vu que le dossier a changé depuis la réponse et applique quand même.
    confirmConflict: z.boolean().optional(),
  }),
  z.object({
    itemId: z.string().min(1),
    decision: z.literal("redo"),
    reason: z.nativeEnum(ComplementReason),
    note: z.string().trim().max(COMPLEMENT_NOTE_MAX).optional(),
  }),
]);

/**
 * Pièce reçue : l'accepter, ou la redemander (avec un motif). Une pièce redemandée repart chez le client
 * par e-mail ; le fichier refusé sera remplacé par le prochain.
 */
export async function reviewComplementItem(data: unknown): Promise<{ success: true } | (Fail & { conflict?: FieldChange[] })> {
  const parsed = reviewSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const item = await prisma.complementRequestItem.findUnique({
    where: { id: parsed.data.itemId },
    include: { request: true, documents: { select: { id: true } } },
  });
  const access = item ? await allowed(() => requireRequestAccess(item.request)) : null;
  if (item && !access) return { success: false, error: "Accès refusé" };
  if (!item || !ACTIVE_STATUSES.includes(item.request.status)) return { success: false, error: "Cette demande est déjà terminée" };
  if (item.status !== ComplementItemStatus.PROVIDED) return { success: false, error: "Le client n'a pas encore répondu pour cette ligne" };
  if (parsed.data.decision === "redo") {
    const fieldReason = parsed.data.reason === "WRONG_VALUE" || parsed.data.reason === "TO_CONFIRM";
    if ((item.kind === ComplementItemKind.FIELD) !== fieldReason) return { success: false, error: "Motif invalide" };
  }

  if (parsed.data.decision === "accept") {
    // Retirer d'anciennes pièces : l'équipe sur toutes les demandes, le notaire assigné sur les siennes
    // (requireRequestAccess ne lui ouvre que celles-là). Une fois le dossier chez lui, il ne dépend pas de l'équipe.
    try {
      const outcome = await acceptItem(item.id, item.request, { id: access!.user.id, name: getActorName(access!.user) }, parsed.data);
      if (!outcome.ok) return { success: false, error: outcome.error, conflict: outcome.conflict };
    } catch (error: any) {
      return { success: false, error: error?.message || "Acceptation impossible" };
    }
    await closeIfDone(item.requestId);
    revalidateBail(item.request.bailId);
    return { success: true };
  }

  const { reason, note } = parsed.data;
  const providedIds = item.documents.map((doc) => doc.id);
  const before = { status: item.status, reason: item.reason, note: item.note, replacesDocumentIds: item.replacesDocumentIds, providedAt: item.providedAt };
  const requestBefore = { status: item.request.status, submittedAt: item.request.submittedAt, message: item.request.message };
  await prisma.$transaction([
    // Le fichier refusé reste dans le dossier jusqu'à ce que le nouveau soit accepté.
    prisma.document.updateMany({ where: { id: { in: providedIds } }, data: { complementItemId: null } }),
    prisma.complementRequestItem.update({
      where: { id: item.id },
      data: {
        status: ComplementItemStatus.PENDING,
        reason,
        note: note || null,
        replacesDocumentIds: Array.from(new Set([...item.replacesDocumentIds, ...providedIds])),
        providedAt: null,
      },
    }),
    // Le message du premier envoi ne correspond plus : la page du client ne l'affiche plus.
    prisma.complementRequest.update({ where: { id: item.requestId }, data: { status: ComplementRequestStatus.OPEN, submittedAt: null, message: null } }),
  ]);
  const sendError = await sendRequestEmail(item.requestId, true);
  if (sendError) {
    await prisma.$transaction([
      prisma.document.updateMany({ where: { id: { in: providedIds } }, data: { complementItemId: item.id } }),
      prisma.complementRequestItem.update({ where: { id: item.id }, data: before }),
      prisma.complementRequest.update({ where: { id: item.requestId }, data: requestBefore }),
    ]);
    return { success: false, error: sendError };
  }
  await prisma.complementRequest.update({ where: { id: item.requestId }, data: { sentCount: { increment: 1 }, lastSentAt: new Date() } });
  revalidateBail(item.request.bailId);
  return { success: true };
}

/**
 * Accepte toutes les lignes reçues de la demande. Aucune ancienne pièce n'est retirée ici (elles se
 * choisissent ligne par ligne). Une information dont le dossier a changé depuis la réponse n'est pas
 * appliquée en lot : elle reste à traiter seule, différence sous les yeux.
 */
export async function acceptComplementRequest(data: unknown): Promise<{ success: true } | Fail> {
  const parsed = z.object({ requestId: z.string().min(1) }).safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const request = await loadRequestForStaff(parsed.data.requestId);
  const access = request ? await allowed(() => requireRequestAccess(request)) : null;
  if (request && !access) return { success: false, error: "Accès refusé" };
  if (!request || !ACTIVE_STATUSES.includes(request.status)) return { success: false, error: "Cette demande est déjà terminée" };
  const provided = request.items.filter((item) => item.status === ComplementItemStatus.PROVIDED);
  if (provided.length === 0) return { success: false, error: "Aucune pièce à accepter" };
  const actor = { id: access!.user.id, name: getActorName(access!.user) };
  const left: string[] = [];
  for (const item of provided) {
    try {
      const outcome = await acceptItem(item.id, request, actor);
      if (!outcome.ok) left.push(`${item.label} : ${outcome.error}`);
    } catch (error: any) {
      left.push(`${item.label} : ${error?.message || "acceptation impossible"}`);
    }
  }
  await closeIfDone(request.id);
  revalidateBail(request.bailId);
  if (left.length > 0) return { success: false, error: `Lignes à traiter une par une — ${left.join(" ; ")}` };
  return { success: true };
}

/* -------------------------------------------------------------------------- */
/*                        Suivi dans la fiche du bail (équipe)                */
/* -------------------------------------------------------------------------- */

export interface StaffComplementItem {
  id: string;
  /** Même clé que la ligne de la fenêtre « Demander » (pièce ou information) : relie la demande au point de la fiche. */
  key: string;
  label: string;
  /** Pièce ou information. */
  type: ComplementItemKindValue;
  /** Type de pièce (vide pour une information). */
  kind: string;
  reason: ComplementReasonValue;
  note: string | null;
  status: ComplementItemStatus;
  replaces: number;
  documents: ComposerDocument[];
  /** Information : ce que le client a changé (avant → après). */
  changes: FieldChange[];
  /** Pièce ajoutée d'elle-même après une réponse du client (ex. contrat de mariage). */
  automatic: boolean;
  /** Information reçue, pas encore écrite dans le dossier : elle le sera à l'acceptation. */
  proposal: boolean;
  /** Pièce reçue : anciennes pièces que l'équipe peut choisir de retirer en l'acceptant. */
  replaceable: Array<ComposerDocument & { suggested: boolean }>;
}

export interface StaffComplementRequest {
  id: string;
  target: ReminderTarget;
  /** L'équipe ou le notaire. */
  origin: ComplementOrigin;
  status: ComplementRequestStatus;
  recipientName: string;
  recipientEmail: string;
  message: string | null;
  sentCount: number;
  createdAt: string;
  lastSentAt: string;
  submittedAt: string | null;
  createdByName: string;
  items: StaffComplementItem[];
}

/** Demandes en cours d'un dossier (en attente du client ou à vérifier). */
export async function getBailComplementRequests(bailId: string): Promise<StaffComplementRequest[]> {
  await requireRole([Role.ADMINISTRATEUR, Role.OPERATEUR, Role.REVIEWER]);
  return loadStaffRequests({ bailId, status: { in: ACTIVE_STATUSES } });
}

/** Pièces que le notaire connecté a lui-même archivées dans ce dossier : il peut toujours les rouvrir. */
export async function getNotaireArchivedDocuments(bailId: string) {
  const access = await allowed(() => requireRequester(bailId));
  if (!access || access.origin !== ComplementOrigin.NOTAIRE) return [];
  const documents = await prisma.document.findMany({
    where: { archivedBailId: bailId, archivedById: access.user.id, archivedAt: { not: null } },
    orderBy: { archivedAt: "desc" },
    select: { id: true, kind: true, label: true, fileKey: true, mimeType: true, archivedAt: true, archivedByName: true, replacedBy: { select: { label: true } } },
  });
  return documents.map((doc) => ({
    id: doc.id,
    kind: doc.kind as string,
    label: doc.label,
    fileKey: doc.fileKey,
    mimeType: doc.mimeType,
    archivedAt: (doc.archivedAt as Date).toISOString(),
    archivedByName: doc.archivedByName,
    replacedByLabel: doc.replacedBy?.label ?? null,
  }));
}

/** Demandes du notaire connecté pour ce dossier : en cours, puis terminées (les plus récentes d'abord). */
export async function getNotaireComplementRequests(bailId: string): Promise<StaffComplementRequest[]> {
  const access = await allowed(() => requireRequester(bailId));
  if (!access || access.origin !== ComplementOrigin.NOTAIRE) return [];
  const requests = await loadStaffRequests({ bailId, origin: ComplementOrigin.NOTAIRE, status: { not: ComplementRequestStatus.CANCELLED } });
  const rank = (status: ComplementRequestStatus) => (status === ComplementRequestStatus.SUBMITTED ? 0 : status === ComplementRequestStatus.OPEN ? 1 : 2);
  return requests.sort((a, b) => rank(a.status) - rank(b.status) || b.lastSentAt.localeCompare(a.lastSentAt));
}

async function loadStaffRequests(where: Prisma.ComplementRequestWhereInput): Promise<StaffComplementRequest[]> {
  const requests = await prisma.complementRequest.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      client: { include: { persons: { orderBy: { isPrimary: "desc" }, take: 1 }, entreprise: true } },
      items: { orderBy: { position: "asc" }, include: { documents: { select: docSelect, orderBy: { createdAt: "asc" } } } },
    },
  });
  const replaceable = new Map<string, StaffComplementItem["replaceable"]>();
  for (const request of requests) {
    for (const item of request.items) {
      if (item.kind !== ComplementItemKind.DOCUMENT || item.status !== ComplementItemStatus.PROVIDED) continue;
      const docs = await replaceableDocuments(item);
      replaceable.set(item.id, docs.map((doc) => ({ ...toComposerDoc(doc), suggested: item.replacesDocumentIds.includes(doc.id) })));
    }
  }
  return requests.map((request) => ({
    id: request.id,
    target: request.target,
    origin: request.origin,
    status: request.status,
    recipientName: getClientDisplayName(request.client) || "",
    recipientEmail: request.recipientEmail,
    message: request.message,
    sentCount: request.sentCount,
    createdAt: request.createdAt.toISOString(),
    lastSentAt: request.lastSentAt.toISOString(),
    submittedAt: request.submittedAt?.toISOString() ?? null,
    createdByName: request.createdByName,
    items: request.items.map((item) => ({
      id: item.id,
      key: complementItemKey(item),
      label: item.label,
      type: item.kind as ComplementItemKindValue,
      kind: item.documentKind ?? "",
      reason: item.reason as ComplementReasonValue,
      note: item.note,
      status: item.status,
      replaces: item.replacesDocumentIds.length,
      documents: item.documents.map(toComposerDoc),
      changes:
        item.kind === ComplementItemKind.FIELD && item.providedValue
          ? describeChanges(item.previousValue as Record<string, unknown> | null, item.providedValue as Record<string, unknown>)
          : [],
      automatic: !!item.fieldKey?.startsWith("auto:"),
      proposal: item.kind === ComplementItemKind.FIELD && item.status === ComplementItemStatus.PROVIDED && !!item.proposedAnswer,
      replaceable: replaceable.get(item.id) ?? [],
    })),
  }));
}

/* -------------------------------------------------------------------------- */
/*                               Espace client                                */
/* -------------------------------------------------------------------------- */

export interface ClientComplementItem {
  id: string;
  label: string;
  /** Pièce ou information. */
  type: ComplementItemKindValue;
  /** Type de pièce (vide pour une information). */
  kind: string;
  reason: ComplementReasonValue;
  note: string | null;
  status: ComplementItemStatus;
  target: { personId?: string; entrepriseId?: string; clientId?: string; propertyId?: string; bailId?: string };
  documents: Array<{ id: string; label: string | null; size: number | null; createdAt: string }>;
  /** Information : la question et la personne visée (rang dans le dossier). */
  question: QuestionRef | null;
  /** Pièce ajoutée d'elle-même après une réponse (ex. contrat de mariage). */
  automatic: boolean;
}

export interface ClientComplementRequest {
  id: string;
  bailId: string;
  target: ReminderTarget;
  /** Demande de l'équipe ou du notaire. */
  origin: ComplementOrigin;
  status: ComplementRequestStatus;
  message: string | null;
  address: string;
  propertyLabel: string | null;
  lastSentAt: string;
  submittedAt: string | null;
  items: ClientComplementItem[];
  /** Informations demandées : le dossier sous la forme du formulaire, pour répondre avec les mêmes règles. */
  form: { values: any; ctx: QuestionContext } | null;
}

/** Client connecté (propriétaire ou locataire). */
async function currentClient() {
  const user = await requireAuth();
  if (user.role !== Role.UTILISATEUR) throw new Error("Accès réservé aux clients");
  const client = await getClientFromUser(user.id);
  if (!client) throw new Error("Client introuvable");
  return { user, client };
}

const clientRequestInclude = {
  bail: { select: { id: true, property: { select: { fullAddress: true, label: true } } } },
  items: {
    orderBy: { position: "asc" as const },
    include: { documents: { select: { id: true, label: true, size: true, createdAt: true }, orderBy: { createdAt: "asc" as const } } },
  },
};

function toClientRequest(request: any, state: DossierState | null = null): ClientComplementRequest {
  // Lignes déjà acceptées : plus rien à faire, le client ne voit que ce qui reste attendu.
  const items = request.items.filter((item: any) => item.status !== ComplementItemStatus.ACCEPTED);
  const hasFields = items.some((item: any) => item.kind === ComplementItemKind.FIELD);
  return {
    id: request.id,
    bailId: request.bail.id,
    target: request.target,
    origin: request.origin,
    status: request.status,
    message: request.message,
    address: request.bail.property?.fullAddress || request.bail.property?.label || "",
    propertyLabel: request.bail.property?.label || null,
    lastSentAt: request.lastSentAt.toISOString(),
    submittedAt: request.submittedAt?.toISOString() ?? null,
    items: items.map((item: any) => {
      const field = item.kind === ComplementItemKind.FIELD;
      return {
        id: item.id,
        label: item.label,
        type: item.kind,
        kind: item.documentKind ?? "",
        reason: item.reason,
        note: item.note,
        status: item.status,
        target: Object.fromEntries(
          (["personId", "entrepriseId", "clientId", "propertyId", "bailId"] as const).filter((key) => item[key]).map((key) => [key, item[key]]),
        ),
        documents: item.documents.map((doc: any) => ({ id: doc.id, label: doc.label, size: doc.size, createdAt: doc.createdAt.toISOString() })),
        question:
          field && state ? { id: item.fieldKey as FieldQuestionId, personIndex: item.personId ? personIndexOf(state, item.personId) : null } : null,
        automatic: !!item.fieldKey?.startsWith("auto:"),
      };
    }),
    form: hasFields && state ? { values: state.values, ctx: state.ctx } : null,
  };
}

/** Une demande du client connecté (null si elle n'est pas à lui). */
export async function getMyComplementRequest(requestId: string): Promise<ClientComplementRequest | null> {
  const { client } = await currentClient();
  const request = await prisma.complementRequest.findFirst({
    where: { id: requestId, clientId: client.id, status: { not: ComplementRequestStatus.CANCELLED } },
    include: clientRequestInclude,
  });
  if (!request) return null;
  const needsForm = request.status === ComplementRequestStatus.OPEN && request.items.some((item) => item.kind === ComplementItemKind.FIELD);
  const current = needsForm ? await loadDossierState(request.bailId, request.target) : null;
  // Le client retrouve ses réponses (propositions en attente), pas seulement les valeurs du dossier.
  const state = current ? withProposals(current, proposalsOf(request.items)) : null;
  return toClientRequest(request, state);
}

/** Demandes qui attendent le client (tableau de bord, page du bail). */
export async function getMyOpenComplementRequests(bailId?: string): Promise<ClientComplementRequest[]> {
  const { client } = await currentClient();
  const requests = await prisma.complementRequest.findMany({
    where: { clientId: client.id, status: ComplementRequestStatus.OPEN, ...(bailId ? { bailId } : {}) },
    orderBy: { lastSentAt: "desc" },
    include: clientRequestInclude,
  });
  return requests.map((request) => toClientRequest(request));
}

async function myOpenItem(itemId: string) {
  const { user, client } = await currentClient();
  const item = await prisma.complementRequestItem.findUnique({ where: { id: itemId }, include: { request: true } });
  if (!item || item.request.clientId !== client.id) throw new Error("Pièce introuvable");
  if (item.request.status !== ComplementRequestStatus.OPEN) throw new Error("Cette demande a déjà été envoyée");
  return { user, item };
}

function revalidateClient(requestId: string) {
  revalidatePath(`/client/proprietaire/demande/${requestId}`);
  revalidatePath(`/client/locataire/demande/${requestId}`);
}

const addSchema = z.object({
  itemId: z.string().min(1),
  fileKey: z.string().refine(isValidUploadKey, { message: "Fichier invalide" }),
  fileName: z.string().trim().min(1).max(300),
  mimeType: z.string().max(200).optional(),
  size: z.number().int().nonnegative().max(50 * 1024 * 1024).optional(),
});

/** Fichier envoyé par le client pour une pièce demandée : il rejoint le dossier, marqué « reçu via la demande ». */
export async function addComplementDocument(data: unknown): Promise<{ success: true } | Fail> {
  const parsed = addSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  try {
    const { user, item } = await myOpenItem(parsed.data.itemId);
    if (item.kind !== ComplementItemKind.DOCUMENT || !item.documentKind) return { success: false, error: "Cette ligne attend une information, pas un fichier" };
    if (item.status === ComplementItemStatus.ACCEPTED) return { success: false, error: "Cette pièce a déjà été acceptée" };
    await prisma.$transaction([
      prisma.document.create({
        data: {
          kind: item.documentKind,
          label: parsed.data.fileName,
          fileKey: parsed.data.fileKey,
          mimeType: parsed.data.mimeType || null,
          size: parsed.data.size ?? null,
          uploadedById: user.id,
          personId: item.personId,
          entrepriseId: item.entrepriseId,
          clientId: item.clientId,
          propertyId: item.propertyId,
          bailId: item.bailId,
          complementItemId: item.id,
        },
      }),
      prisma.complementRequestItem.update({ where: { id: item.id }, data: { status: ComplementItemStatus.PROVIDED, providedAt: new Date() } }),
    ]);
    if (item.documentKind === DocumentKind.DIAGNOSTICS && item.propertyId) queueDiagnosticReading(item.propertyId);
    await recalculate([item]);
    revalidateClient(item.requestId);
    revalidateBail(item.request.bailId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Envoi impossible" };
  }
}

/**
 * Pièces attendues encore absentes de ce dossier pour cette personne (clé → ligne) : les obligatoires,
 * et celles dont le notaire a besoin (justificatifs du loyer, déclaration d'occupation).
 */
async function missingBlockingDocuments(bailId: string, target: ReminderTarget, db: Prisma.TransactionClient = prisma) {
  const bail = await loadBail(bailId, db);
  if (!bail) return new Map<string, ComposerRow>();
  const rows = await composerRows(bail, target);
  return new Map(
    rows.filter((row) => (row.level === "blocking" || row.level === "expected") && row.documents.length === 0).map((row) => [row.key, row]),
  );
}

const answerSchema = z.object({
  itemId: z.string().min(1),
  answer: z.record(z.string().max(120), z.unknown()).refine((value) => JSON.stringify(value).length < 20_000, { message: "Réponse trop longue" }),
});

/** Sert à annuler la transaction de simulation (rien de ce qu'elle a écrit n'est conservé). */
class SimulationRollback extends Error {}

type Proposal = { fieldKey: string; personId: string | null; answer: Record<string, unknown> };

/**
 * Le dossier tel qu'il serait si les réponses proposées étaient acceptées (en mémoire, rien n'est écrit).
 * Sert à montrer au client ce qu'il a répondu et à contrôler sa demande avant l'envoi à l'équipe.
 */
function withProposals(state: DossierState, proposals: Proposal[]): DossierState {
  let current = state;
  for (const proposal of proposals) {
    const personIndex = personIndexOf(current, proposal.personId);
    if (proposal.personId && personIndex === null) continue;
    const ref: QuestionRef = { id: proposal.fieldKey as FieldQuestionId, personIndex };
    current = { ...current, values: mergeAnswer(current, ref, proposal.answer) };
  }
  return current;
}

const proposalsOf = (items: Array<{ kind: ComplementItemKind; status: ComplementItemStatus; fieldKey: string | null; personId: string | null; proposedAnswer: Prisma.JsonValue | null; providedAt: Date | null }>): Proposal[] =>
  items
    .filter((item) => item.kind === ComplementItemKind.FIELD && item.status === ComplementItemStatus.PROVIDED && item.proposedAnswer && item.fieldKey)
    .sort((a, b) => (a.providedAt?.getTime() ?? 0) - (b.providedAt?.getTime() ?? 0))
    .map((item) => ({ fieldKey: item.fieldKey as string, personId: item.personId, answer: item.proposedAnswer as Record<string, unknown> }));

/**
 * Pièces qui manqueraient si les réponses proposées étaient acceptées. Les réponses sont écrites dans une
 * transaction systématiquement annulée : le dossier n'est pas modifié, mais on sait quelles pièces la
 * réponse rend obligatoires (contrat de mariage, règlement de copropriété…) pour les demander tout de suite.
 */
async function missingDocumentsIfAccepted(bailId: string, target: ReminderTarget, proposals: Proposal[]) {
  let rows = new Map<string, ComposerRow>();
  try {
    await prisma.$transaction(async (tx) => {
      for (const proposal of proposals) {
        const state = await loadDossierState(bailId, target, tx);
        if (!state) continue;
        const personIndex = personIndexOf(state, proposal.personId);
        if (proposal.personId && personIndex === null) continue;
        const ref: QuestionRef = { id: proposal.fieldKey as FieldQuestionId, personIndex };
        await writeAnswer(tx, state, ref, mergeAnswer(state, ref, proposal.answer));
      }
      rows = await missingBlockingDocuments(bailId, target, tx);
      throw new SimulationRollback();
    }, { timeout: 20000, maxWait: 10000 }); // simulation : plusieurs lectures, base parfois lente
  } catch (error) {
    if (!(error instanceof SimulationRollback)) throw error;
  }
  return rows;
}

/**
 * Réponse du client à une information demandée : contrôlée avec les règles du formulaire, puis gardée
 * comme PROPOSITION dans la ligne de la demande. Le dossier (bail, bien, personnes) n'est pas modifié :
 * la valeur n'y est écrite que lorsque l'équipe l'accepte. Si la réponse rendrait une pièce obligatoire
 * (contrat de mariage, règlement de copropriété…), elle s'ajoute à la demande ; une pièce ajoutée ainsi
 * qui n'est plus nécessaire est retirée.
 */
export async function answerComplementField(
  data: unknown,
): Promise<{ success: true; data: { addedDocuments: string[] } } | (Fail & { fieldErrors?: Record<string, string> })> {
  const parsed = answerSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  try {
    const { item } = await myOpenItem(parsed.data.itemId);
    if (item.kind !== ComplementItemKind.FIELD || !item.fieldKey || !FIELD_QUESTION_IDS.includes(item.fieldKey as FieldQuestionId)) {
      return { success: false, error: "Cette ligne attend une pièce" };
    }
    const state = await loadDossierState(item.request.bailId, item.request.target);
    if (!state) return { success: false, error: "Dossier introuvable" };
    const personIndex = personIndexOf(state, item.personId);
    if (item.personId && personIndex === null) return { success: false, error: "Cette personne n'est plus dans le dossier" };
    const ref: QuestionRef = { id: item.fieldKey as FieldQuestionId, personIndex };

    const before = await missingBlockingDocuments(item.request.bailId, item.request.target);
    // Contrôle seulement : rien n'est écrit dans le dossier.
    const result = await checkAnswer(state, ref, parsed.data.answer);
    if (!result.ok) return { success: false, error: result.error, fieldErrors: result.fieldErrors };

    await prisma.complementRequestItem.update({
      where: { id: item.id },
      data: {
        status: ComplementItemStatus.PROVIDED,
        providedAt: new Date(),
        providedValue: pickQuestionValues(ref, result.merged, state.ctx) as Prisma.InputJsonValue,
        // Valeurs du dossier au moment de la réponse : si elles changent d'ici l'acceptation, l'équipe le voit.
        baseValue: pickQuestionValues(ref, state.values, state.ctx) as Prisma.InputJsonValue,
        proposedAnswer: parsed.data.answer as Prisma.InputJsonValue,
      },
    });

    // La réponse est enregistrée. La suite (pièces que cette réponse rendrait obligatoires) est un complément :
    // si elle échoue (base lente), la réponse reste un succès et la liste sera recalculée à la réponse suivante
    // ou à l'envoi. Le client ne doit jamais lire « Non enregistré » pour une réponse enregistrée.
    let added: { label: string }[] = [];
    try {
      added = await addDocumentsRequiredByAnswers(item, ref, before);
    } catch (error) {
      console.error("[complement-requests] pièces induites par la réponse, recalcul reporté", error);
    }

    revalidateClient(item.requestId);
    revalidateBail(item.request.bailId);
    return { success: true, data: { addedDocuments: added.map((row) => row.label) } };
  } catch (error: any) {
    console.error("[complement-requests] réponse", error);
    return { success: false, error: actionErrorMessage(error) };
  }
}

/** Pièces que les réponses en attente d'une demande rendraient obligatoires : ajoutées, ou retirées si inutiles. */
async function addDocumentsRequiredByAnswers(item: any, ref: QuestionRef, before: Map<string, unknown>) {
  {
    // Pièces que cette réponse (et les autres réponses en attente de la demande) rendrait obligatoires :
    // ajoutées à la demande, déjà rattachées au bon endroit.
    const lines = await prisma.complementRequestItem.findMany({
      where: { requestId: item.requestId },
      select: { id: true, kind: true, documentKind: true, fieldKey: true, status: true, personId: true, entrepriseId: true, clientId: true, propertyId: true, bailId: true, proposedAnswer: true, providedAt: true, _count: { select: { documents: true } } },
    });
    const after = await missingDocumentsIfAccepted(item.request.bailId, item.request.target, proposalsOf(lines));
    const inRequest = new Set(lines.filter((line) => line.status !== ComplementItemStatus.ACCEPTED).map((line) => complementItemKey(line)));
    const added = Array.from(after.values()).filter((row) => !before.has(row.key) && !inRequest.has(row.key));
    if (added.length > 0) {
      const start = lines.length;
      await prisma.complementRequestItem.createMany({
        data: added.map((row, index) => ({
          requestId: item.requestId,
          position: start + index,
          kind: ComplementItemKind.DOCUMENT,
          documentKind: row.kind as DocumentKind,
          fieldKey: `auto:${ref.id}`,
          label: row.label,
          reason: ComplementReason.MISSING,
          ...row.target,
        })),
      });
    }
    // Pièce ajoutée d'elle-même, plus nécessaire après une nouvelle réponse (et sans fichier) : retirée.
    const obsolete = lines.filter(
      (line) =>
        line.kind === ComplementItemKind.DOCUMENT &&
        line.fieldKey?.startsWith("auto:") &&
        line.status === ComplementItemStatus.PENDING &&
        line._count.documents === 0 &&
        !after.has(complementItemKey(line)),
    );
    if (obsolete.length > 0) await prisma.complementRequestItem.deleteMany({ where: { id: { in: obsolete.map((line) => line.id) } } });
    return added;
  }
}

/** Retire un fichier envoyé par erreur, tant que la demande n'est pas partie chez l'équipe. */
export async function removeComplementDocument(data: unknown): Promise<{ success: true } | Fail> {
  const parsed = z.object({ documentId: z.string().min(1) }).safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  try {
    const document = await prisma.document.findUnique({ where: { id: parsed.data.documentId }, select: { id: true, complementItemId: true } });
    if (!document?.complementItemId) return { success: false, error: "Fichier introuvable" };
    const { item } = await myOpenItem(document.complementItemId);
    await deleteDocumentFromDB(document.id);
    const left = await prisma.document.count({ where: { complementItemId: item.id } });
    if (left === 0) await prisma.complementRequestItem.update({ where: { id: item.id }, data: { status: ComplementItemStatus.PENDING, providedAt: null } });
    await recalculate([item]);
    revalidateClient(item.requestId);
    revalidateBail(item.request.bailId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Suppression impossible" };
  }
}

/** Le client envoie ses pièces à l'équipe : toutes les pièces demandées doivent être là. */
export async function submitComplementRequest(data: unknown): Promise<{ success: true } | Fail> {
  const parsed = z.object({ requestId: z.string().min(1) }).safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  try {
    const { user, client } = await currentClient();
    const request = await prisma.complementRequest.findFirst({
      where: { id: parsed.data.requestId, clientId: client.id },
      include: { items: { include: { _count: { select: { documents: true } } } }, bail: { select: { property: { select: { fullAddress: true, label: true } } } } },
    });
    if (!request) return { success: false, error: "Demande introuvable" };
    if (request.status !== ComplementRequestStatus.OPEN) return { success: false, error: "Cette demande a déjà été envoyée" };
    const missing = request.items.filter(
      (item) =>
        item.status === ComplementItemStatus.PENDING ||
        (item.kind === ComplementItemKind.DOCUMENT && item.status === ComplementItemStatus.PROVIDED && item._count.documents === 0),
    );
    if (missing.length > 0) {
      return { success: false, error: `Il manque encore : ${missing.map((item) => item.label).join(", ")}.` };
    }
    // Informations : revérifiées sur le dossier tel qu'il serait avec les réponses proposées (mêmes règles
    // que le formulaire). Les réponses ne sont toujours pas écrites dans le dossier.
    const fieldItems = request.items.filter((item) => item.kind === ComplementItemKind.FIELD && item.status !== ComplementItemStatus.ACCEPTED);
    if (fieldItems.length > 0) {
      const current = await loadDossierState(request.bailId, request.target);
      if (!current) return { success: false, error: "Dossier introuvable" };
      const state = withProposals(current, proposalsOf(request.items));
      for (const item of fieldItems) {
        const ref: QuestionRef = { id: item.fieldKey as FieldQuestionId, personIndex: personIndexOf(state, item.personId) };
        const errors = questionErrors(ref, state.values, state.ctx);
        const first = Object.values(errors)[0];
        if (first) return { success: false, error: `${item.label} : ${first}` };
      }
    }
    await prisma.complementRequest.update({ where: { id: request.id }, data: { status: ComplementRequestStatus.SUBMITTED, submittedAt: new Date() } });
    if (request.origin === ComplementOrigin.NOTAIRE) {
      // Le notaire qui a fait la demande est prévenu de la réponse.
      const assignment = await prisma.dossierNotaireAssignment.findFirst({
        where: { bailId: request.bailId },
        orderBy: { assignedAt: "desc" },
        select: { id: true, notaireId: true, notaire: { select: { email: true, name: true } } },
      });
      if (assignment) {
        const clientName = getClientDisplayName(client as any) || "Votre client";
        await createNotificationForUser(NotificationType.COMPLEMENT_SUBMITTED, assignment.notaireId, "NOTAIRE_DOSSIER", assignment.id, user.id, {
          clientName,
          propertyLabel: request.bail.property?.label || request.bail.property?.fullAddress || null,
          count: request.items.length,
        }).catch((error) => console.error("[complement-requests] notification notaire", error));
        // Et un e-mail : la notification seule ne se voit qu'en ouvrant l'espace notaire (m32).
        if (assignment.notaire?.email) {
          await resendSendEmail({
            from: FROM,
            to: assignment.notaire.email,
            subject: `Réponse reçue de ${clientName} - BailNotarie`,
            react: MailNotaireComplementAnswered({
              notaireName: assignment.notaire.name,
              clientName,
              itemLabels: request.items.map((item) => item.label),
              bailAddress: request.bail.property?.fullAddress || request.bail.property?.label || null,
              dossierUrl: `${BASE_URL()}/notaire/dossiers?dossierId=${assignment.id}`,
            }),
          })
            .then((result) => {
              if (result?.error) console.error("[complement-requests] e-mail notaire", result.error);
            })
            .catch((error) => console.error("[complement-requests] e-mail notaire", error));
        }
      }
    }
    await createNotificationForAllUsers(NotificationType.COMPLEMENT_SUBMITTED, "BAIL", request.bailId, user.id, {
      clientName: getClientDisplayName(client as any),
      propertyLabel: request.bail.property?.label || request.bail.property?.fullAddress || null,
      count: request.items.length,
    }).catch((error) => console.error("[complement-requests] notification", error));
    revalidateClient(request.id);
    revalidateBail(request.bailId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Envoi impossible" };
  }
}
