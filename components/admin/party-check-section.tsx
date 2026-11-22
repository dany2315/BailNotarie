import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, UserPlus } from "lucide-react";
import { ClientType, DocumentKind, ProfilType } from "@prisma/client";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { GroupFieldEditor, type GroupField, type InlineFieldKind } from "@/components/admin/inline-field-editor";
import { ValidateAllButton } from "@/components/admin/verify-buttons";
import { CheckList, CheckPoint, CheckSection, StateChip } from "@/components/admin/check-list";
import { FAMILY_STATUS_LABELS, MATRIMONIAL_REGIME_LABELS } from "@/lib/utils/person-labels";
import { buildChecklistRows, toChecklistDocument, type ChecklistDocument, type ChecklistRow } from "@/lib/utils/document-checklist";
import { getRequiredClientFields } from "@/lib/utils/required-fields";
import { MISSING_FIELD_LABELS } from "@/lib/utils/missing-items";
import { formatPhone } from "@/lib/utils/phone-format";
import { REGISTERED_LABELS, registryNotes } from "@/lib/utils/company-registry";
import { CompanyRegistryButton } from "@/components/admin/company-registry-button";
import { AskFieldsButton, ComplementRequestButton } from "@/components/complements/complement-composer";
import { pointKey, summarize, summaryChip, type VerificationPointState } from "@/lib/utils/verification";
import { cn } from "@/lib/utils";
import { RuleTag } from "@/components/admin/fiche/fiche-context";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { questionsForDataFields } from "@/lib/rules/complement-questions";
import { fieldComplementKey } from "@/lib/utils/complement";

const isoDay = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const frDay = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) : null;

const FIELD_META: Record<string, { label: string; kind?: InlineFieldKind; date?: boolean }> = {
  firstName: { label: "Prénom" },
  lastName: { label: "Nom" },
  birthDate: { label: "Date de naissance", kind: "date", date: true },
  birthPlace: { label: "Lieu de naissance" },
  nationality: { label: "Nationalité", kind: "nationality" },
  profession: { label: "Profession" },
  phone: { label: "Téléphone", kind: "phone" },
  fullAddress: { label: "Adresse" },
  familyStatus: { label: "Situation familiale", kind: "familyStatus" },
  matrimonialRegime: { label: "Régime matrimonial", kind: "matrimonialRegime" },
  legalName: { label: "Raison sociale" },
  name: { label: "Nom commercial" },
  registration: { label: "N° d'immatriculation" },
  legalFormLabel: { label: "Forme juridique" },
  isRegistered: { label: "Immatriculation", kind: "registered" },
  representativeName: { label: "Représentant légal" },
  representativeRole: { label: "Qualité du représentant" },
};

/** Valeur de l'éditeur : « yes » / « no » pour l'immatriculation, texte sinon. */
function editValue(values: any, field: string): string | null {
  const raw = values[field];
  if (field === "isRegistered") return raw === true ? "yes" : raw === false ? "no" : null;
  if (FIELD_META[field].date) return isoDay(raw);
  return raw ? String(raw) : null;
}

/** Champs de base exigés pour toute personne (pas seulement la principale). */
const BASE_PERSON_REQUIRED = ["firstName", "lastName", "nationality", "birthDate", "birthPlace", "familyStatus"];

const ROLE_TITLES = { PROPRIETAIRE: "Propriétaire", LOCATAIRE: "Locataire", LEAD: "Prospect" } as const;

type PartyMissing = {
  totalMissingFields: number;
  totalMissingDocuments: number;
  persons: Array<{ personId: string; missingFields: string[] }>;
  entreprise: { missingFields: string[] } | null;
};

function join(parts: Array<string | null | undefined | false>, sep = " · ") {
  return parts.filter(Boolean).join(sep);
}

interface PartyGroup {
  key: string;
  /** Type du point (identite, coordonnees, famille, societe, representant). */
  kind: string;
  label: string;
  text: string;
  missing: string[];
  editor: { entity: "person" | "entreprise"; id: string; title: string; fields: GroupField[] };
  /** Personne principale (son e-mail est celui de l'espace : il ne se demande pas). */
  primary?: boolean;
  /** Société : recherche au registre des entreprises, à côté de « Modifier ». */
  registry?: { entrepriseId: string; registration: string | null; representativeName: string | null };
}

export interface PartyPoints {
  party: any | null;
  name: string;
  kindLabel: string;
  groups: PartyGroup[];
  docRows: ChecklistRow[];
  /** Clé de point par ligne de pièce. */
  docKeys: Record<string, string>;
  /** Tous les points du bloc (pour les compteurs), sans l'état « validé ». */
  points: Array<{ key: string; missing: boolean }>;
}

/** Valeur d'un élément, telle qu'on la lit (dates en jj/mm/aaaa). */
function fieldDisplay(f: GroupField): string {
  if (!f.value) return "";
  if (f.kind === "date") return frDay(f.value) || f.value;
  if (f.kind === "registered") return f.value === "yes" ? REGISTERED_LABELS.yes : REGISTERED_LABELS.no;
  if (f.kind === "familyStatus") return FAMILY_STATUS_LABELS[f.value] || f.value;
  if (f.kind === "matrimonialRegime") return MATRIMONIAL_REGIME_LABELS[f.value] || f.value;
  return f.value;
}

/**
 * Pièce qui prouve un point : pièce d'identité → identité de la personne ; Kbis → société et représentant ;
 * contrat de mariage ou convention de PACS → situation familiale de la personne principale.
 * Seulement si la pièce est déposée (sinon le point se vérifie à la main, comme avant).
 */
export function proofRowFor(data: Pick<PartyPoints, "docRows">, group: PartyGroup): ChecklistRow | undefined {
  const present = (row: ChecklistRow | undefined) => (row && row.documents.length > 0 ? row : undefined);
  if (group.kind === "identite") {
    return present(data.docRows.find((r) => r.kind === DocumentKind.ID_IDENTITY && r.upload?.personId === group.editor.id));
  }
  if (group.kind === "societe" || group.kind === "representant") {
    return present(data.docRows.find((r) => r.kind === DocumentKind.KBIS && r.upload?.entrepriseId === group.editor.id));
  }
  if (group.kind === "famille" && group.primary) {
    return present(data.docRows.find((r) => r.kind === DocumentKind.CONTRAT_DE_MARIAGE || r.kind === DocumentKind.CONTRAT_DE_PACS));
  }
  return undefined;
}

/**
 * Fiche dossier : les pièces d'une partie pour la section « Pièces du dossier », chacune avec les
 * éléments qu'elle prouve (pièce d'identité → identité de la personne, Kbis → la société), modifiables.
 */
export function partyPieceRows(data: PartyPoints, locked: boolean, verifiedKeys: Set<string> = new Set()): ChecklistRow[] {
  const party = data.party;
  if (!party) return data.docRows;
  return data.docRows.map((row) => {
    // Données prouvées par cette pièce : validées avec elle (« La pièce est bonne »).
    const linked = data.groups
      .filter((g) => g.missing.length === 0 && proofRowFor(data, g)?.key === row.key)
      .map((g) => ({ key: g.key, label: g.label, verified: locked || verifiedKeys.has(g.key) }));
    row = linked.length > 0 ? { ...row, linkedPoints: linked } : row;
    const holder = row.upload?.personId
      ? data.groups.find((g) => g.kind === "identite" && g.editor.id === row.upload!.personId)
      : row.upload?.entrepriseId
        ? data.groups.find((g) => g.kind === "societe" && g.editor.id === row.upload!.entrepriseId)
        : undefined;
    if (!holder) return row;
    return {
      ...row,
      compareSpec: {
        entity: holder.editor.entity,
        id: holder.editor.id,
        title: holder.editor.title,
        fields: holder.editor.fields.map((f) => ({ ...f, display: fieldDisplay(f) })),
        notes: holder.kind === "societe" && party.entreprise ? registryNotes(party.entreprise) : undefined,
        lastCheck: row.kind === DocumentKind.ID_IDENTITY ? "Lisible et en cours de validité" : row.kind === DocumentKind.KBIS ? "Lisible et récent (moins de 3 mois)" : undefined,
      },
    };
  });
}

/** Clé de point des pièces : la ligne + les fichiers présents (un nouveau dépôt redemande la validation). */
export function docRowKeys(rows: ChecklistRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.key, pointKey(`doc:${row.key}`, row.documents.map((d) => d.id).sort())]));
}

/** Points des pièces : présentes (à valider) ou obligatoires manquantes. Les facultatives absentes ne comptent pas. */
export function docPoints(rows: ChecklistRow[], keys: Record<string, string>) {
  return rows
    .filter((row) => row.documents.length > 0 || row.required)
    .map((row) => ({ key: keys[row.key], missing: row.documents.length === 0 }));
}

/** Ajoute l'état « validé » aux points d'un bloc. */
export function withVerified(
  points: Array<{ key: string; missing: boolean }>,
  verifiedKeys: Set<string>,
  locked: boolean,
): VerificationPointState[] {
  return points.map((p) => ({ ...p, verified: !p.missing && (locked || verifiedKeys.has(p.key)) }));
}

/**
 * Points de contrôle d'une partie (propriétaire ou locataire) : identité,
 * coordonnées, situation familiale par personne (ou société), puis pièces.
 * Sert au bloc et aux compteurs de la page.
 */
export function buildPartyPoints(
  party: any | null,
  missing: PartyMissing | null,
  clientDocuments: any[],
  role: keyof typeof ROLE_TITLES,
  /** Bail commercial : la société désigne son représentant légal, et peut être en cours de création. */
  options: { commercial?: boolean } = {},
): PartyPoints {
  if (!party) {
    return { party: null, name: "", kindLabel: "", groups: [], docRows: [], docKeys: {}, points: [{ key: `${role}:absent`, missing: true }] };
  }

  const isCompany = party.type === ClientType.PERSONNE_MORALE;
  const persons: any[] = party.persons || [];
  const primary = persons.find((p) => p.isPrimary) || persons[0];
  const { requiredFields, requiredDocuments } = getRequiredClientFields(
    party.type,
    party.profilType as ProfilType,
    primary?.familyStatus,
    primary?.matrimonialRegime,
    party.entreprise,
  );
  const missingByPerson = new Map<string, Set<string>>();
  for (const p of missing?.persons || []) missingByPerson.set(p.personId, new Set(p.missingFields));
  const missingCompany = new Set(missing?.entreprise?.missingFields || []);

  const fieldsOf = (values: any, fields: string[], isMissing: (f: string) => boolean): GroupField[] =>
    fields.map((field) => ({
      field,
      label: FIELD_META[field].label,
      kind: FIELD_META[field].kind,
      value: editValue(values, field),
      missing: isMissing(field),
    }));

  const name = isCompany
    ? party.entreprise?.legalName || party.entreprise?.name || "Société"
    : persons.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean).join(" et ") || "Sans nom";

  const groups: PartyGroup[] = [];

  if (isCompany && party.entreprise) {
    const ent = party.entreprise;
    const commercial = !!options.commercial;
    const isMissing = (f: string) =>
      missingCompany.has(f) || (requiredFields.includes(f) && !ent[f]) || (commercial && f === "representativeName" && !ent[f]);
    const unregistered = ent.isRegistered === false;
    const showRegistered = commercial || ent.isRegistered != null;
    const showRepresentative = commercial || !!ent.representativeName;
    const defs = [
      {
        key: "societe",
        label: "Société",
        fields: ["legalName", "name", "legalFormLabel", "registration", ...(showRegistered ? ["isRegistered"] : [])],
        keyFields: ["legalName", "name", "legalFormLabel", "registration", "isRegistered"],
        lines: [
          join([ent.legalName, ent.name && ent.name !== ent.legalName && `« ${ent.name} »`]),
          join([ent.legalFormLabel, ent.registration && `Immatriculation : ${ent.registration}`]),
          unregistered ? `${REGISTERED_LABELS.no} : Kbis à fournir plus tard` : null,
          ...registryNotes(ent),
        ],
        extra: [] as string[],
        registry: true,
      },
      ...(showRepresentative
        ? [
            {
              key: "representant",
              label: "Représentant légal",
              fields: ["representativeName", "representativeRole"],
              keyFields: ["representativeName", "representativeRole"],
              lines: [join([ent.representativeName, ent.representativeRole], ", ")],
              extra: [] as string[],
              registry: false,
            },
          ]
        : []),
      {
        key: "coordonnees",
        label: "Coordonnées",
        fields: ["phone", "fullAddress"],
        keyFields: ["email", "phone", "fullAddress"],
        lines: [join([ent.email, formatPhone(ent.phone)]), ent.fullAddress],
        extra: isMissing("email") ? ["email"] : [],
        registry: false,
      },
    ];
    for (const d of defs) {
      groups.push({
        key: pointKey(`client:${party.id}:ent:${d.key}`, d.keyFields.map((f) => ent[f] ?? null)),
        kind: d.key,
        label: d.label,
        text: d.lines.filter(Boolean).join("\n"),
        missing: [...d.fields.filter(isMissing), ...d.extra],
        editor: { entity: "entreprise", id: ent.id, title: `${d.label} · ${name}`, fields: fieldsOf(ent, d.fields, isMissing) },
        registry: d.registry
          ? { entrepriseId: ent.id, registration: ent.registration ?? null, representativeName: ent.representativeName ?? null }
          : undefined,
      });
    }
  }

  if (!isCompany) {
    const many = persons.length > 1;
    for (const person of persons) {
      const required = person.id === primary?.id ? requiredFields : BASE_PERSON_REQUIRED;
      const missingSet = missingByPerson.get(person.id) || new Set<string>();
      const isMissing = (f: string) => missingSet.has(f) || (required.includes(f) && !person[f]);
      const suffix = many ? ` · ${person.firstName || "personne"}` : "";
      const primaryMark = many && person.id === primary?.id ? " (principale)" : "";
      const born = person.birthDate || person.birthPlace;
      const familyFields = ["familyStatus", ...(person.familyStatus === "MARIE" || person.matrimonialRegime ? ["matrimonialRegime"] : [])];
      const defs = [
        {
          key: "identite",
          label: `Identité${suffix}${primaryMark}`,
          fields: ["firstName", "lastName", "birthDate", "birthPlace", "nationality", "profession"],
          keyFields: ["firstName", "lastName", "birthDate", "birthPlace", "nationality", "profession"],
          lines: [
            join([
              [person.firstName, person.lastName].filter(Boolean).join(" "),
              born && join([person.birthDate && `né(e) le ${frDay(person.birthDate)}`, person.birthPlace && `à ${person.birthPlace}`], " "),
            ]),
            join([person.nationality && `Nationalité : ${person.nationality}`, person.profession]),
          ],
          extra: [] as string[],
        },
        {
          key: "coordonnees",
          label: `Coordonnées${suffix}`,
          fields: ["phone", "fullAddress"],
          keyFields: ["email", "phone", "fullAddress"],
          lines: [join([person.email, formatPhone(person.phone)]), person.fullAddress],
          extra: isMissing("email") ? ["email"] : [],
        },
        {
          key: "famille",
          label: `Situation familiale${suffix}`,
          fields: familyFields,
          keyFields: ["familyStatus", "matrimonialRegime"],
          lines: [
            join([
              person.familyStatus && (FAMILY_STATUS_LABELS[person.familyStatus] || person.familyStatus),
              person.matrimonialRegime
                ? MATRIMONIAL_REGIME_LABELS[person.matrimonialRegime] || person.matrimonialRegime
                : person.familyStatus === "MARIE" && "régime matrimonial non renseigné",
            ]),
          ],
          extra: [] as string[],
        },
      ];
      for (const d of defs) {
        groups.push({
          key: pointKey(`client:${party.id}:person:${person.id}:${d.key}`, d.keyFields.map((f) => person[f] ?? null)),
          kind: d.key,
          label: d.label,
          text: d.lines.filter(Boolean).join("\n"),
          missing: [...d.fields.filter(isMissing), ...d.extra],
          editor: { entity: "person", id: person.id, title: d.label.replace(" (principale)", ""), fields: fieldsOf(person, d.fields, isMissing) },
          primary: person.id === primary?.id,
        });
      }
    }
  }

  const kinds = requiredDocuments as string[];
  const personKinds: string[] = kinds.filter((k) => k === DocumentKind.ID_IDENTITY);
  const companyKinds: string[] = kinds.filter((k) => k === DocumentKind.KBIS || k === DocumentKind.STATUTES);
  const clientKinds = kinds.filter((k) => !personKinds.includes(k) && !companyKinds.includes(k));
  const docRows: ChecklistRow[] = [
    ...(isCompany && party.entreprise
      ? buildChecklistRows(companyKinds, ((party.entreprise.documents || []) as any[]).map(toChecklistDocument), {
          keyPrefix: `ent-${party.entreprise.id}`,
          target: { entrepriseId: party.entreprise.id },
        })
      : []),
    ...(!isCompany
      ? persons.flatMap((person) =>
          buildChecklistRows(personKinds, ((person.documents || []) as any[]).map(toChecklistDocument), {
            keyPrefix: `person-${person.id}`,
            target: { personId: person.id },
            labels: {
              [DocumentKind.ID_IDENTITY]: persons.length > 1 ? `Pièce d'identité · ${person.firstName || "personne"}` : "Pièce d'identité",
            },
          }),
        )
      : []),
    ...buildChecklistRows(clientKinds, clientDocuments.map(toChecklistDocument) as ChecklistDocument[], {
      keyPrefix: `client-${party.id}`,
      target: { clientId: party.id },
    }),
  ];
  const docKeys = docRowKeys(docRows);

  return {
    party,
    name,
    kindLabel: isCompany ? "Société" : persons.length > 1 ? `Particuliers · ${persons.length} personnes` : "Particulier",
    groups,
    docRows,
    docKeys,
    // À valider : les pièces, et les données qu'une pièce prouve (validées avec elle). Le reste (coordonnées,
    // situation familiale sans contrat…) est exigé par le formulaire : affiché, modifiable, sans validation.
    // Une donnée manquante (ancien dossier) compte toujours, et bloque l'envoi.
    points: [
      ...groups
        .filter((g) => g.missing.length > 0 || !!proofRowFor({ docRows }, g))
        .map((g) => ({ key: g.key, missing: g.missing.length > 0 })),
      ...docPoints(docRows, docKeys),
    ],
  };
}

/**
 * Bloc « Propriétaire » ou « Locataire » de la fiche dossier, comme la
 * maquette : un point par donnée, « Valider » / « ✓ Vérifié », « Tout valider ».
 */
export function PartyCheckSection({
  id,
  role,
  data,
  bailId,
  verifiedKeys,
  locked,
  formNote,
  emptyAction,
  emptyHint,
  requestAction,
  complement,
  number,
  hidePieces = false,
}: {
  id: string;
  /** Fiche dossier : numéro de la section ; le nom passe dans le sous-titre (il est déjà dans l'en-tête). */
  number?: number;
  /** Fiche dossier : les pièces sont dans la section « Pièces du dossier ». */
  hidePieces?: boolean;
  role: keyof typeof ROLE_TITLES;
  data: PartyPoints;
  bailId: string;
  verifiedKeys: Set<string>;
  /** Bloc déjà validé (dossier envoyé, ou client « Complété ») : tout est vérifié. */
  locked: boolean;
  formNote?: string | null;
  emptyAction?: ReactNode;
  /** Partie absente : ce que l'admin peut faire, sous « Pas encore de … ». */
  emptyHint?: string;
  /** « Demander » sur les pièces manquantes (ouvre la relance). */
  requestAction?: ReactNode;
  /** Demandes de pièces à cette personne (« Demander », « Redemander »). */
  complement?: { bailId: string; target: "OWNER" | "TENANT"; commercial?: boolean };
}) {
  const roleTitle = ROLE_TITLES[role];
  const party = data.party;

  if (!party) {
    // Partie absente : seul endroit de la fiche où on l'ajoute.
    return (
      <CheckSection
        id={id}
        number={number}
        title={roleTitle}
        subtitle={`Pas encore de ${roleTitle.toLowerCase()} pour ce dossier`}
        headerRight={<StateChip tone="missing">À ajouter</StateChip>}
      >
        <div className="flex flex-col items-start gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserPlus className="size-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[14.5px] font-semibold">Pas encore de {roleTitle.toLowerCase()}</span>
              {emptyHint && <span className="text-[13px] leading-snug text-muted-foreground">{emptyHint}</span>}
            </div>
          </div>
          {emptyAction}
        </div>
      </CheckSection>
    );
  }

  // Ce qui se vérifie dans cette section : ni les pièces, ni les données qu'une pièce prouve (vérifiées avec elle).
  const provenKeys = new Set(data.groups.filter((g) => g.missing.length === 0 && proofRowFor(data, g)).map((g) => g.key));
  const docKeySet = new Set(Object.values(data.docKeys));
  const sectionPoints = hidePieces ? data.points.filter((pt) => !docKeySet.has(pt.key) && !provenKeys.has(pt.key)) : data.points;
  const summary = summarize(withVerified(sectionPoints, verifiedKeys, locked));
  const chip = summaryChip(summary);
  const isVerified = (key: string) => locked || verifiedKeys.has(key);
  const persons: any[] = party.persons || [];

  return (
    <CheckSection
      id={id}
      number={number}
      title={number != null ? `${roleTitle}${persons.length > 1 ? "s" : ""}` : `${roleTitle}${persons.length > 1 ? "s" : ""} · ${data.name}`}
      subtitle={
        <>
          {join([number != null ? data.name : null, data.kindLabel, formNote])}{" "}
          <Link href={`/interface/clients/${party.id}`} className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
            Fiche client
            <ArrowUpRight className="size-3.5" />
          </Link>
        </>
      }
      headerRight={
        // Fiche dossier : rien à valider dans la section (les pièces et leurs données se valident ensemble) ;
        // seule une information manquante y est signalée.
        hidePieces ? (
          summary.missing > 0 ? <StateChip tone="missing">{chip.label}</StateChip> : undefined
        ) : (
          <>
            <StateChip tone={chip.tone}>{chip.label}</StateChip>
            {!locked && <ValidateAllButton bailId={bailId} pointKeys={summary.pendingKeys} />}
          </>
        )
      }
    >
      <CheckList>
        {data.groups.map((g) => {
          const missing = g.missing.length > 0;
          const verified = !missing && isVerified(g.key);
          const info = g.kind === "coordonnees";
          // Pièce qui prouve ce point : il se valide avec elle, dans « Pièces du dossier ».
          const proof = !missing && !info ? proofRowFor(data, g) : undefined;
          const proofLabel = proof ? proof.label || documentKindLabels[proof.kind] || proof.kind : "";
          const proofVerified = proof ? isVerified(data.docKeys[proof.key]) : false;
          const asked = complement
            ? questionsForDataFields(g.editor.entity, [...g.editor.fields.map((f) => f.field), ...g.missing], {
                commercial: complement.commercial,
                primaryPerson: g.primary,
              }).map((qid) => fieldComplementKey(qid, g.editor.entity === "person" ? { personId: g.editor.id } : { entrepriseId: g.editor.id }))
            : [];
          return (
            <CheckPoint
              key={g.key}
              claimKeys={asked.length > 0 ? asked : undefined}
              state={missing ? "missing" : !proof ? "info" : verified && proofVerified ? "ok" : "todo"}
              label={g.label}
              note={missing ? `Manquant : ${g.missing.map((f) => MISSING_FIELD_LABELS[f] || f).join(", ")}` : null}
              verify={undefined}
              tags={
                proof ? (
                  <a href="#bloc-pieces" className="inline-flex">
                    <RuleTag tone={verified && proofVerified ? "ok" : "neutral"}>
                      {verified && proofVerified ? `✓ Vérifiée avec : ${proofLabel.toLowerCase()}` : `À vérifier avec : ${proofLabel.toLowerCase()} →`}
                    </RuleTag>
                  </a>
                ) : undefined
              }
              actions={
                <>
                  {!missing && complement && !locked && asked.length > 0 && (
                    <ComplementRequestButton
                      bailId={complement.bailId}
                      target={complement.target}
                      preselect={{ items: asked.map((key) => ({ key, reason: "WRONG_VALUE" as const })) }}
                      label="Demander"
                      variant="ghost"
                    />
                  )}
                  {g.registry && !locked && (
                    <CompanyRegistryButton
                      entrepriseId={g.registry.entrepriseId}
                      registration={g.registry.registration}
                      representativeName={g.registry.representativeName}
                    />
                  )}
                  {missing && complement && !locked && (
                    <AskFieldsButton
                      bailId={complement.bailId}
                      target={complement.target}
                      scope={g.editor.entity}
                      targetId={g.editor.id}
                      fields={g.missing}
                      commercial={complement.commercial}
                      primaryPerson={g.primary}
                    />
                  )}
                  <GroupFieldEditor entity={g.editor.entity} id={g.editor.id} title={g.editor.title} fields={g.editor.fields} />
                </>
              }
            >
              {g.text || <span className="text-muted-foreground">Non renseigné</span>}
            </CheckPoint>
          );
        })}
      </CheckList>
      {data.docRows.length > 0 && !hidePieces && (
        <div className="border-t">
          <DocumentChecklist
            rows={data.docRows.map((row) => {
              // Fiche dossier : dans le panneau de la pièce, les données saisies à comparer.
              const holder = row.upload?.personId
                ? data.groups.find((g) => g.kind === "identite" && g.editor.id === row.upload!.personId)
                : row.upload?.entrepriseId
                  ? data.groups.find((g) => g.kind === "societe" && g.editor.id === row.upload!.entrepriseId)
                  : undefined;
              if (!holder) return row;
              // Notes du registre (société vérifiée, fermée, nom modifié…) : en pastilles sous les éléments.
              const notes = holder.kind === "societe" && party.entreprise ? registryNotes(party.entreprise) : [];
              return {
                ...row,
                compare: (
                  <div className="flex flex-col gap-2">
                    <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted-foreground">À comparer avec la pièce</p>
                    <ol className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
                      {holder.editor.fields.map((f, i) => (
                        <li key={f.field} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 px-3.5 py-2.5">
                          <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-[11.5px] font-bold text-primary-foreground">
                            {i + 1}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="text-[12px] text-muted-foreground">{f.label}</span>
                            <span className={cn("break-words text-[15.5px] font-semibold leading-snug", f.missing && "text-red-700")}>
                              {fieldDisplay(f) || "Non renseigné"}
                            </span>
                          </span>
                          {!locked ? (
                            <GroupFieldEditor entity={holder.editor.entity} id={holder.editor.id} title={`${f.label} · ${holder.editor.title}`} fields={[f]} triggerLabel="Corriger" />
                          ) : (
                            <span />
                          )}
                        </li>
                      ))}
                    </ol>
                    {notes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {notes.map((note) => (
                          <span
                            key={note}
                            className={cn(
                              "inline-flex min-h-7 items-center rounded-lg px-2.5 py-1 text-[12.5px] font-semibold leading-tight",
                              note.startsWith("Vérifiée") ? "bg-green-50 text-green-800" : note.startsWith("⚠") ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900",
                            )}
                          >
                            {note.startsWith("Vérifiée") ? `✓ ${note}` : note}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              };
            })}
            requestAction={requestAction}
            complement={complement}
            inset
            editable={!locked}
            verification={{
              bailId,
              locked,
              points: Object.fromEntries(
                Object.entries(data.docKeys).map(([rowKey, key]) => [rowKey, { pointKey: key, verified: isVerified(key) }]),
              ),
            }}
          />
        </div>
      )}
    </CheckSection>
  );
}
