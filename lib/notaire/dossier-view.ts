// Pas de "use server" : fonctions de lecture appelées par la page du notaire et la route du zip,
// après le contrôle d'accès de loadNotaireDossier.

import { ClientType, ProfilType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { assessRentRules } from "@/lib/rent-rules";
import { loadDiagnosticState } from "@/lib/diagnostics/state";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { documentFileExtension } from "@/lib/utils/document-filename";
import { commercialTermsSummary, PREMISES_TYPE_LABELS } from "@/lib/utils/commercial-terms";
import { FAMILY_STATUS_LABELS, MATRIMONIAL_REGIME_LABELS } from "@/lib/utils/person-labels";
import { PERIOD_LABELS, ROOMS_LABELS } from "@/lib/utils/rent-cap";
import { registryNotes } from "@/lib/utils/company-registry";
import { FURNITURE_KEYS, isFurnishedBail } from "@/lib/rules/dossier-rules";
import { formatPhone } from "@/lib/utils/phone-format";

/* -------------------------------------------------------------------------- */
/*                                   Modèle                                   */
/* -------------------------------------------------------------------------- */

export interface FactRow {
  label: string;
  value: string;
}

/** Bloc de données : un titre et des lignes « libellé : valeur », chacune copiable. */
export interface FactSection {
  key: string;
  title: string;
  /** Sous-titre court (« Personne principale », « Société »). */
  hint?: string;
  rows: FactRow[];
}

export interface DossierDocument {
  id: string;
  /** Type de pièce en base (ID_IDENTITY…). */
  kindCode: string;
  /** Nature de la pièce (« Pièce d'identité »). */
  kind: string;
  /** À qui elle se rapporte, s'il faut le préciser (« Julie Bernard »). */
  who: string | null;
  fileName: string;
  fileKey: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  /** Nom du fichier dans le zip. */
  zipName: string;
}

export interface DocumentGroup {
  key: string;
  title: string;
  /** Dossier dans le zip (« 1 - Propriétaire - Julie Bernard »). */
  folder: string;
  documents: DossierDocument[];
}

export interface DossierParty {
  id: string;
  role: "OWNER" | "TENANT";
  name: string;
  kind: "Particulier" | "Particuliers" | "Société";
  /** Formulaire envoyé : on peut lui demander des pièces ou des informations. */
  askable: boolean;
  sections: FactSection[];
}

export interface NotaireDossierView {
  assignmentId: string;
  bailId: string | null;
  status: string;
  address: string;
  /** « Bail meublé 1 an · Habitation ». */
  bailLabel: string | null;
  commercial: boolean;
  assignedAt: string;
  notes: string | null;
  bail: FactSection[];
  property: FactSection[];
  parties: DossierParty[];
  documents: DocumentGroup[];
  documentCount: number;
  diagnostics: any | null;
  /** Parties du bail pour la discussion. */
  chatParties: Array<{ id: string; profilType: string; persons: Array<{ firstName: string | null; lastName: string | null }>; entreprise: { legalName: string; name: string } | null }>;
  legacyRequests: Array<{ id: string; title: string; content: string; status: string; createdAt: string }>;
  /** Toute la fiche en texte, à coller dans le logiciel de l'étude. */
  text: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Formats                                   */
/* -------------------------------------------------------------------------- */

const day = (value: Date | string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) : null;
const euros = (value: number | null | undefined) =>
  value === null || value === undefined ? null : `${Number(value).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
const fullName = (p: { firstName?: string | null; lastName?: string | null } | null | undefined) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

const BAIL_TYPES: Record<string, string> = {
  BAIL_NU_3_ANS: "Location vide, 3 ans",
  BAIL_NU_6_ANS: "Location vide, 6 ans",
  BAIL_MEUBLE_1_ANS: "Location meublée, 1 an",
  BAIL_MEUBLE_9_MOIS: "Location meublée étudiant, 9 mois",
  COMMERCIAL_3_6_9: "Bail commercial 3-6-9",
  COMMERCIAL_DEROGATOIRE: "Bail commercial dérogatoire",
};
const LEGAL_STATUS: Record<string, string> = { PLEIN_PROPRIETE: "Monopropriété", CO_PROPRIETE: "Copropriété", LOTISSEMENT: "Lotissement" };
const PROPERTY_TYPES: Record<string, string> = { APPARTEMENT: "Appartement", MAISON: "Maison", ...PREMISES_TYPE_LABELS };

function rows(entries: Array<[string, string | number | null | undefined | false]>): FactRow[] {
  return entries
    .filter(([, value]) => value !== null && value !== undefined && value !== false && String(value).trim() !== "")
    .map(([label, value]) => ({ label, value: String(value).trim() }));
}

/* -------------------------------------------------------------------------- */
/*                                Chargement                                  */
/* -------------------------------------------------------------------------- */

const docSelect = { id: true, kind: true, label: true, fileKey: true, mimeType: true, size: true, createdAt: true };

async function loadAssignment(assignmentId: string) {
  return prisma.dossierNotaireAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      property: { include: { documents: { select: docSelect } } },
      bail: {
        include: {
          property: { include: { documents: { select: docSelect } } },
          documents: { select: docSelect },
          commercialTerms: true,
          parties: {
            include: {
              persons: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], include: { documents: { select: docSelect } } },
              entreprise: { include: { documents: { select: docSelect } } },
              documents: { where: { personId: null, entrepriseId: null, propertyId: null, bailId: null }, select: docSelect },
              intakeLinks: { select: { bailId: true, status: true } },
            },
          },
        },
      },
      requests: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, content: true, status: true, createdAt: true, documents: { select: docSelect } },
      },
    },
  });
}
type Assignment = NonNullable<Awaited<ReturnType<typeof loadAssignment>>>;

/** Dossier du notaire connecté (ou d'un administrateur), null s'il n'y a pas accès. */
export async function loadNotaireDossier(assignmentId: string): Promise<NotaireDossierView | null> {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR)) return null;
  const assignment = await loadAssignment(assignmentId);
  if (!assignment) return null;
  if (user.role === Role.NOTAIRE && assignment.notaireId !== user.id) return null;
  return buildView(assignment);
}

async function buildView(a: Assignment): Promise<NotaireDossierView> {
  const bail = a.bail;
  const property = bail?.property ?? a.property;
  const commercial = bail?.bailFamily === "COMMERCIAL";
  const parties = bail?.parties ?? [];
  const owners = parties.filter((p) => p.profilType === ProfilType.PROPRIETAIRE);
  const tenants = parties.filter((p) => p.profilType === ProfilType.LOCATAIRE);

  // Parties
  const partyViews: DossierParty[] = [];
  for (const [role, list] of [
    ["OWNER", owners],
    ["TENANT", tenants],
  ] as const) {
    for (const party of list) partyViews.push(partyView(party, role, bail?.id ?? null, commercial));
  }

  // Bail
  const bailSections: FactSection[] = [];
  if (bail) {
    const terms = rows([
      ["Type de bail", BAIL_TYPES[bail.bailType] ?? bail.bailType],
      ["Usage", commercial ? "Commercial" : "Habitation"],
      ["Prise d'effet", day(bail.effectiveDate)],
      ["Fin du bail", day(bail.endDate)],
      [commercial ? "Loyer mensuel hors taxes et hors charges" : "Loyer mensuel hors charges", euros(bail.rentAmount)],
      [commercial ? "Provision mensuelle pour charges" : "Charges mensuelles", euros(bail.monthlyCharges)],
      ["Dépôt de garantie", euros(bail.securityDeposit)],
      ["Jour de paiement", bail.paymentDay ? `Le ${bail.paymentDay} de chaque mois` : null],
      ["Confirmé par le locataire", bail.tenantConfirmedTermsAt ? `Loyer, charges et date d'entrée confirmés le ${day(bail.tenantConfirmedTermsAt)}` : null],
    ]);
    bailSections.push({ key: "bail", title: "Conditions du bail", rows: terms });

    if (!commercial && property) {
      const rules = await assessRentRules({ property: property as any, bail: bail as any }).catch(() => null);
      if (rules) {
        const perM2 = (value: number) => `${value.toFixed(2).replace(".", ",")} €/m²`;
        const surface = rules.cap.surface;
        const mentions = rows([
          [
            `Loyer de référence${rules.cap.territory?.label ? ` (${[rules.cap.territory.label, rules.cap.zone?.label].filter(Boolean).join(", ")})` : ""}`,
            rules.cap.reference && surface ? `${perM2(rules.cap.reference.ref)}, soit ${euros(Math.round(rules.cap.reference.ref * surface * 100) / 100)}` : null,
          ],
          [
            "Loyer de référence majoré",
            rules.cap.reference && surface ? `${perM2(rules.cap.reference.max)}, soit ${euros(Math.round(rules.cap.reference.max * surface * 100) / 100)}` : null,
          ],
          ["Loyer de base", bail.rentSupplementReason && rules.supplement.base != null ? euros(rules.supplement.base) : null],
          [
            "Complément de loyer",
            bail.rentSupplementReason && rules.supplement.amount != null ? `${euros(rules.supplement.amount)} : ${bail.rentSupplementReason}` : null,
          ],
          ["Zone tendue", rules.relocation.notConcerned === null ? "Oui" : null],
          [
            "Relocation",
            rules.relocation.notConcerned !== null
              ? null
              : rules.relocation.situation === "first"
                ? "Première mise en location"
                : rules.relocation.situation === "vacant"
                  ? "Logement vide depuis 18 mois ou plus"
                  : rules.relocation.situation === "relet"
                    ? "Logement reloué"
                    : null,
          ],
          [
            "Dernier loyer du locataire précédent",
            rules.relocation.situation === "relet" && bail.previousRentAmount != null
              ? `${euros(bail.previousRentAmount)}${bail.previousTenantLeftAt ? ` (départ le ${day(bail.previousTenantLeftAt)})` : ""}`
              : null,
          ],
        ]);
        if (mentions.length > 0) bailSections.push({ key: "loyer", title: "Mentions du loyer", rows: mentions });
      }
    }
    if (commercial) {
      const summary = commercialTermsSummary(bail.commercialTerms, { bailType: bail.bailType, rentAmount: bail.rentAmount });
      if (summary.length > 0) bailSections.push({ key: "commercial", title: "Conditions commerciales", rows: rows(summary) });
    }
  }

  // Bien
  const propertySections: FactSection[] = [];
  if (property) {
    const p: any = property;
    const furnished = !commercial && isFurnishedBail(bail?.bailType);
    const missingFurniture = FURNITURE_KEYS.filter((key) => p[key] !== true);
    propertySections.push({
      key: "bien",
      title: "Le bien",
      rows: rows([
        ["Adresse", p.fullAddress],
        ["Type", PROPERTY_TYPES[p.type] ?? p.type],
        ["Surface", p.surfaceM2 != null ? `${String(p.surfaceM2).replace(".", ",")} m²` : null],
        ["Pièces principales", !commercial && p.mainRooms ? ROOMS_LABELS[p.mainRooms] ?? String(p.mainRooms) : null],
        ["Époque de construction", !commercial && p.constructionPeriod ? PERIOD_LABELS[p.constructionPeriod] ?? p.constructionPeriod : null],
        ["Classe énergétique (DPE)", p.dpeClass ? `Classe ${p.dpeClass}` : null],
        ["Régime juridique", p.legalStatus ? LEGAL_STATUS[p.legalStatus] ?? p.legalStatus : null],
        ["Syndic", p.legalStatus === "CO_PROPRIETE" ? [p.syndicName, p.syndicEmail, formatPhone(p.syndicPhone)].filter(Boolean).join(" · ") : null],
        [
          "Lotissement de plus de 10 ans",
          p.legalStatus === "LOTISSEMENT" && p.subdivisionOver10Years ? ({ YES: "Oui", NO: "Non", UNKNOWN: "Ne sait pas" } as Record<string, string>)[p.subdivisionOver10Years] : null,
        ],
        [
          "Emplacement du local",
          commercial ? (p.inShoppingCenter ? (p.complexType === "ESTATE_COMPLEX" ? "Dans un ensemble immobilier" : "Dans un centre commercial") : p.inShoppingCenter === false ? "Immeuble ou rue" : null) : null,
        ],
        ["Dépendances", p.outbuildings],
        ["Mobilier", furnished ? (missingFurniture.length === 0 ? `Complet (${FURNITURE_KEYS.length} équipements obligatoires)` : `${FURNITURE_KEYS.length - missingFurniture.length} sur ${FURNITURE_KEYS.length} équipements`) : null],
      ]),
    });
  }

  // Pièces
  const documents = documentGroups(a, partyViews);

  // Diagnostics
  let diagnostics: any = null;
  if (property?.id) {
    const state = await loadDiagnosticState(property.id, commercial).catch(() => null);
    if (state && state.items.length > 0) {
      diagnostics = JSON.parse(
        JSON.stringify({
          readAt: state.lastRead?.at ?? null,
          counts: state.counts,
          documents: state.documents,
          items: state.items.map((item) => ({ id: item.id, label: item.label, status: item.status, text: item.text, finding: item.finding, origin: item.origin, decision: item.decision })),
        }),
      );
    }
  }

  const ownerName = partyViews.find((p) => p.role === "OWNER")?.name;
  const tenantName = partyViews.find((p) => p.role === "TENANT")?.name;
  const view: NotaireDossierView = {
    assignmentId: a.id,
    bailId: bail?.id ?? null,
    status: bail?.status ?? "READY_FOR_NOTARY",
    address: property?.fullAddress || "Dossier",
    bailLabel: bail ? `${BAIL_TYPES[bail.bailType] ?? bail.bailType} · ${commercial ? "Commercial" : "Habitation"}` : null,
    commercial,
    assignedAt: a.assignedAt.toISOString(),
    notes: a.notes,
    bail: bailSections,
    property: propertySections,
    parties: partyViews,
    documents,
    documentCount: documents.reduce((n, g) => n + g.documents.length, 0),
    diagnostics,
    chatParties: parties.map((party) => ({
      id: party.id,
      profilType: party.profilType,
      persons: party.persons.map((p) => ({ firstName: p.firstName, lastName: p.lastName })),
      entreprise: party.entreprise ? { legalName: party.entreprise.legalName, name: party.entreprise.name } : null,
    })),
    legacyRequests: a.requests.map((r) => ({ id: r.id, title: r.title, content: r.content, status: r.status, createdAt: r.createdAt.toISOString() })),
    text: "",
  };
  view.text = dossierText(view, ownerName, tenantName);
  return view;
}

function partyView(party: Assignment["bail"] extends infer B ? (B extends { parties: Array<infer P> } ? P : never) : never, role: "OWNER" | "TENANT", bailId: string | null, commercial: boolean): DossierParty {
  const company = party.type === ClientType.PERSONNE_MORALE && party.entreprise;
  const sections: FactSection[] = [];
  if (company) {
    const e: any = party.entreprise;
    sections.push({
      key: `${party.id}-societe`,
      title: e.legalName || e.name || "Société",
      hint: "Société",
      rows: rows([
        ["Raison sociale", e.legalName],
        ["Nom commercial", e.name && e.name !== e.legalName ? e.name : null],
        ["Forme juridique", e.legalFormLabel],
        ["Numéro d'immatriculation", e.registration],
        ["Immatriculation", e.isRegistered === false ? "Société en cours de création" : null],
        ["Siège social", e.fullAddress],
        ["Représentant légal", [e.representativeName, e.representativeRole].filter(Boolean).join(", ")],
        ["E-mail", e.email],
        ["Téléphone", formatPhone(e.phone)],
        ["Registre", registryNotes(e)[0] ?? null],
      ]),
    });
  } else {
    party.persons.forEach((person: any, index: number) => {
      sections.push({
        key: person.id,
        title: fullName(person) || "Personne",
        hint: party.persons.length > 1 ? (index === 0 ? "Personne principale" : "Co-signataire") : undefined,
        rows: rows([
          ["Prénom", person.firstName],
          ["Nom", person.lastName],
          ["Date de naissance", day(person.birthDate)],
          ["Lieu de naissance", person.birthPlace],
          ["Nationalité", person.nationality],
          ["Profession", person.profession],
          ["Situation familiale", person.familyStatus ? FAMILY_STATUS_LABELS[person.familyStatus] ?? person.familyStatus : null],
          ["Régime matrimonial", person.matrimonialRegime ? MATRIMONIAL_REGIME_LABELS[person.matrimonialRegime] ?? person.matrimonialRegime : null],
          ["Adresse", person.fullAddress],
          ["E-mail", person.email],
          ["Téléphone", formatPhone(person.phone)],
        ]),
      });
    });
  }
  const name = company
    ? party.entreprise!.legalName || party.entreprise!.name || "Société"
    : party.persons.map((p: any) => fullName(p)).filter(Boolean).join(" et ") || (role === "OWNER" ? "Propriétaire" : "Locataire");
  const formPending = party.intakeLinks.some((link: any) => link.bailId === bailId && link.status === "PENDING");
  return {
    id: party.id,
    role,
    name,
    kind: company ? "Société" : party.persons.length > 1 ? "Particuliers" : "Particulier",
    askable: !!bailId && !formPending,
    sections,
  };
}

/** Pièces rangées par personne, puis le bien et le bail ; les noms de fichiers du zip sont uniques. */
function documentGroups(a: Assignment, parties: DossierParty[]): DocumentGroup[] {
  const bail = a.bail;
  const property = bail?.property ?? a.property;
  const seen = new Set<string>();
  const groups: DocumentGroup[] = [];
  let index = 0;
  const add = (key: string, title: string, docs: Array<{ doc: any; who: string | null }>) => {
    const fresh = docs.filter(({ doc }) => !seen.has(doc.id));
    if (fresh.length === 0) return;
    fresh.forEach(({ doc }) => seen.add(doc.id));
    index += 1;
    const used = new Map<string, number>();
    const safe = (text: string) => text.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
    groups.push({
      key,
      title,
      folder: safe(`${index} - ${title}`),
      documents: fresh
        .sort((x, y) => (documentKindLabels[x.doc.kind] ?? x.doc.kind).localeCompare(documentKindLabels[y.doc.kind] ?? y.doc.kind, "fr"))
        .map(({ doc, who }) => {
          const kind = documentKindLabels[doc.kind] ?? doc.kind;
          const ext = documentFileExtension({ fileKey: doc.fileKey, label: doc.label, mimeType: doc.mimeType });
          const base = safe([kind, who].filter(Boolean).join(" - "));
          const count = (used.get(base) ?? 0) + 1;
          used.set(base, count);
          return {
            id: doc.id,
            kindCode: doc.kind,
            kind,
            who,
            fileName: doc.label || kind,
            fileKey: doc.fileKey,
            mimeType: doc.mimeType,
            size: doc.size,
            createdAt: doc.createdAt.toISOString(),
            zipName: `${base}${count > 1 ? ` (${count})` : ""}${ext ? `.${ext}` : ""}`,
          };
        }),
    });
  };

  // Propriétaire(s) d'abord, puis locataire(s).
  const ordered = [...(bail?.parties ?? [])].sort((x, y) => Number(x.profilType !== ProfilType.PROPRIETAIRE) - Number(y.profilType !== ProfilType.PROPRIETAIRE));
  for (const party of ordered) {
    const view = parties.find((p) => p.id === party.id);
    const role = party.profilType === ProfilType.PROPRIETAIRE ? "Propriétaire" : "Locataire";
    const many = party.persons.length > 1;
    add(party.id, `${role} - ${view?.name ?? ""}`.replace(/ - $/, ""), [
      ...party.persons.flatMap((person) => person.documents.map((doc) => ({ doc, who: many ? fullName(person) : null }))),
      ...(party.entreprise?.documents ?? []).map((doc) => ({ doc, who: null })),
      ...party.documents.map((doc) => ({ doc, who: null })),
    ]);
  }
  if (property) add("bien", "Le bien", (property.documents ?? []).map((doc: any) => ({ doc, who: null })));
  if (bail) add("bail", "Le bail", bail.documents.map((doc) => ({ doc, who: null })));
  add(
    "autres",
    "Autres pièces",
    a.requests.flatMap((request) => request.documents.map((doc) => ({ doc, who: null }))),
  );
  return groups;
}

/** La fiche en texte : un bloc par section, « Libellé : valeur » par ligne. */
function dossierText(view: NotaireDossierView, ownerName?: string, tenantName?: string): string {
  const block = (title: string, sections: FactSection[]) =>
    sections.length === 0
      ? ""
      : `${title.toUpperCase()}\n${sections.map((s) => `${s.title}${s.hint ? ` (${s.hint})` : ""}\n${s.rows.map((r) => `${r.label} : ${r.value}`).join("\n")}`).join("\n\n")}`;
  const head = [view.address, view.bailLabel, [ownerName, tenantName].filter(Boolean).join(" → ")].filter(Boolean).join("\n");
  return [
    head,
    block("Le bail", view.bail),
    block("Le bien", view.property),
    block(view.parties.filter((p) => p.role === "OWNER").length > 1 ? "Propriétaires" : "Propriétaire", view.parties.filter((p) => p.role === "OWNER").flatMap((p) => p.sections)),
    block(view.parties.filter((p) => p.role === "TENANT").length > 1 ? "Locataires" : "Locataire", view.parties.filter((p) => p.role === "TENANT").flatMap((p) => p.sections)),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Texte d'une section seule (bouton « Copier » d'un bloc). */
export function sectionText(section: FactSection): string {
  return `${section.title}\n${section.rows.map((r) => `${r.label} : ${r.value}`).join("\n")}`;
}
