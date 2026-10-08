import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ClientType, DocumentKind, ProfilType } from "@prisma/client";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { GroupFieldEditor, type GroupField, type InlineFieldKind } from "@/components/admin/inline-field-editor";
import { ValidateAllButton, VerifyToggle } from "@/components/admin/verify-buttons";
import { CheckList, CheckPoint, CheckSection, StateChip } from "@/components/admin/check-list";
import { FAMILY_STATUS_LABELS, MATRIMONIAL_REGIME_LABELS } from "@/lib/utils/person-labels";
import { buildChecklistRows, toChecklistDocument, type ChecklistDocument, type ChecklistRow } from "@/lib/utils/document-checklist";
import { getRequiredClientFields } from "@/lib/utils/required-fields";
import { MISSING_FIELD_LABELS } from "@/lib/utils/missing-items";
import { formatPhone } from "@/lib/utils/phone-format";
import { pointKey, summarize, summaryChip, type VerificationPointState } from "@/lib/utils/verification";

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
};

/** Champs de base exigés pour toute personne (pas seulement la principale). */
const BASE_PERSON_REQUIRED = ["firstName", "lastName", "nationality", "birthDate", "birthPlace"];

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
  label: string;
  text: string;
  missing: string[];
  editor: { entity: "person" | "entreprise"; id: string; title: string; fields: GroupField[] };
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
  );
  const missingByPerson = new Map<string, Set<string>>();
  for (const p of missing?.persons || []) missingByPerson.set(p.personId, new Set(p.missingFields));
  const missingCompany = new Set(missing?.entreprise?.missingFields || []);

  const fieldsOf = (values: any, fields: string[], isMissing: (f: string) => boolean): GroupField[] =>
    fields.map((field) => ({
      field,
      label: FIELD_META[field].label,
      kind: FIELD_META[field].kind,
      value: FIELD_META[field].date ? isoDay(values[field]) : values[field] ? String(values[field]) : null,
      missing: isMissing(field),
    }));

  const name = isCompany
    ? party.entreprise?.legalName || party.entreprise?.name || "Société"
    : persons.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean).join(" et ") || "Sans nom";

  const groups: PartyGroup[] = [];

  if (isCompany && party.entreprise) {
    const ent = party.entreprise;
    const isMissing = (f: string) => missingCompany.has(f) || (requiredFields.includes(f) && !ent[f]);
    const defs = [
      {
        key: "societe",
        label: "Société",
        fields: ["legalName", "name", "registration"],
        keyFields: ["legalName", "name", "registration"],
        lines: [join([ent.legalName, ent.name && ent.name !== ent.legalName && `« ${ent.name} »`]), ent.registration && `Immatriculation : ${ent.registration}`],
        extra: [] as string[],
      },
      {
        key: "coordonnees",
        label: "Coordonnées",
        fields: ["phone", "fullAddress"],
        keyFields: ["email", "phone", "fullAddress"],
        lines: [join([ent.email, formatPhone(ent.phone)]), ent.fullAddress],
        extra: isMissing("email") ? ["email"] : [],
      },
    ];
    for (const d of defs) {
      groups.push({
        key: pointKey(`client:${party.id}:ent:${d.key}`, d.keyFields.map((f) => ent[f] ?? null)),
        label: d.label,
        text: d.lines.filter(Boolean).join("\n"),
        missing: [...d.fields.filter(isMissing), ...d.extra],
        editor: { entity: "entreprise", id: ent.id, title: `${d.label} · ${name}`, fields: fieldsOf(ent, d.fields, isMissing) },
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
          label: d.label,
          text: d.lines.filter(Boolean).join("\n"),
          missing: [...d.fields.filter(isMissing), ...d.extra],
          editor: { entity: "person", id: person.id, title: d.label.replace(" (principale)", ""), fields: fieldsOf(person, d.fields, isMissing) },
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
        })
      : []),
    ...(!isCompany
      ? persons.flatMap((person) =>
          buildChecklistRows(personKinds, ((person.documents || []) as any[]).map(toChecklistDocument), {
            keyPrefix: `person-${person.id}`,
            labels: {
              [DocumentKind.ID_IDENTITY]: persons.length > 1 ? `Pièce d'identité · ${person.firstName || "personne"}` : "Pièce d'identité",
            },
          }),
        )
      : []),
    ...buildChecklistRows(clientKinds, clientDocuments.map(toChecklistDocument) as ChecklistDocument[], {
      keyPrefix: `client-${party.id}`,
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
    points: [...groups.map((g) => ({ key: g.key, missing: g.missing.length > 0 })), ...docPoints(docRows, docKeys)],
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
}: {
  id: string;
  role: keyof typeof ROLE_TITLES;
  data: PartyPoints;
  bailId: string;
  verifiedKeys: Set<string>;
  /** Bloc déjà validé (dossier envoyé, ou client « Complété ») : tout est vérifié. */
  locked: boolean;
  formNote?: string | null;
  emptyAction?: ReactNode;
}) {
  const roleTitle = ROLE_TITLES[role];
  const party = data.party;

  if (!party) {
    return (
      <CheckSection
        id={id}
        title={roleTitle}
        subtitle={`Aucun ${roleTitle.toLowerCase()} pour ce dossier.`}
        headerRight={
          <>
            <StateChip tone="missing">1 manquant</StateChip>
            {emptyAction}
          </>
        }
      >
        <CheckList>
          <CheckPoint state="missing" label={`${roleTitle} à ajouter`} note={`Manquant : ${roleTitle.toLowerCase()}`} />
        </CheckList>
      </CheckSection>
    );
  }

  const summary = summarize(withVerified(data.points, verifiedKeys, locked));
  const chip = summaryChip(summary);
  const isVerified = (key: string) => locked || verifiedKeys.has(key);
  const persons: any[] = party.persons || [];

  return (
    <CheckSection
      id={id}
      title={`${roleTitle}${persons.length > 1 ? "s" : ""} · ${data.name}`}
      subtitle={
        <>
          {join([data.kindLabel, formNote])}{" "}
          <Link href={`/interface/clients/${party.id}`} className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
            Fiche client
            <ArrowUpRight className="size-3.5" />
          </Link>
        </>
      }
      headerRight={
        <>
          <StateChip tone={chip.tone}>{chip.label}</StateChip>
          {!locked && <ValidateAllButton bailId={bailId} pointKeys={summary.pendingKeys} />}
        </>
      }
    >
      <CheckList>
        {data.groups.map((g) => {
          const missing = g.missing.length > 0;
          const verified = !missing && isVerified(g.key);
          return (
            <CheckPoint
              key={g.key}
              state={missing ? "missing" : verified ? "ok" : "todo"}
              label={g.label}
              note={missing ? `Manquant : ${g.missing.map((f) => MISSING_FIELD_LABELS[f] || f).join(", ")}` : null}
              actions={
                <>
                  <GroupFieldEditor entity={g.editor.entity} id={g.editor.id} title={g.editor.title} fields={g.editor.fields} />
                  {!missing && <VerifyToggle bailId={bailId} pointKey={g.key} verified={verified} locked={locked} />}
                </>
              }
            >
              {g.text || <span className="text-muted-foreground">Non renseigné</span>}
            </CheckPoint>
          );
        })}
      </CheckList>
      {data.docRows.length > 0 && (
        <div className="border-t">
          <DocumentChecklist
            rows={data.docRows}
            inset
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
