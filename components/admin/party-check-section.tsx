import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ClientType, CompletionStatus, DocumentKind, ProfilType } from "@prisma/client";
import { CompletionStatusSelect } from "@/components/shared/completion-status-select";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { GroupFieldEditor, type GroupField, type InlineFieldKind } from "@/components/admin/inline-field-editor";
import { ValidateBlockButton } from "@/components/admin/validate-block-button";
import { CheckList, CheckPoint, CheckSection, StateChip } from "@/components/admin/check-list";
import { FAMILY_STATUS_LABELS, MATRIMONIAL_REGIME_LABELS } from "@/lib/utils/person-labels";
import { buildChecklistRows, toChecklistDocument, type ChecklistDocument } from "@/lib/utils/document-checklist";
import { getRequiredClientFields } from "@/lib/utils/required-fields";
import { MISSING_FIELD_LABELS } from "@/lib/utils/missing-items";

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
  phone: { label: "Téléphone" },
  fullAddress: { label: "Adresse" },
  familyStatus: { label: "Situation familiale", kind: "familyStatus" },
  matrimonialRegime: { label: "Régime matrimonial", kind: "matrimonialRegime" },
  legalName: { label: "Raison sociale" },
  name: { label: "Nom commercial" },
  registration: { label: "N° d'immatriculation" },
};

/** Champs de base exigés pour toute personne (pas seulement la principale). */
const BASE_PERSON_REQUIRED = ["firstName", "lastName", "nationality", "birthDate", "birthPlace"];

type PartyMissing = {
  totalMissingFields: number;
  totalMissingDocuments: number;
  persons: Array<{ personId: string; missingFields: string[] }>;
  entreprise: { missingFields: string[] } | null;
};

const ROLE_TITLES = { PROPRIETAIRE: "Propriétaire", LOCATAIRE: "Locataire", LEAD: "Prospect" } as const;

function join(parts: Array<string | null | undefined | false>, sep = " · ") {
  return parts.filter(Boolean).join(sep);
}

/**
 * Bloc « Propriétaire » ou « Locataire » de la fiche dossier : une liste de
 * points de contrôle (identité, coordonnées, situation familiale, pièces).
 */
export function PartyCheckSection({
  id,
  role,
  party,
  clientDocuments,
  missing,
  formNote,
  emptyAction,
}: {
  id: string;
  role: keyof typeof ROLE_TITLES;
  party: any | null;
  /** Pièces du client (sans personne ni société), déjà chargées. */
  clientDocuments: any[];
  missing: PartyMissing | null;
  /** « formulaire rempli le 01/10 »… */
  formNote?: string | null;
  emptyAction?: ReactNode;
}) {
  const roleTitle = ROLE_TITLES[role];

  if (!party) {
    return (
      <CheckSection id={id} title={roleTitle} subtitle={`Aucun ${roleTitle.toLowerCase()} pour ce dossier.`} headerRight={emptyAction}>
        <p className="px-5 py-4 text-sm text-muted-foreground">Le bloc se remplira dès que le {roleTitle.toLowerCase()} sera ajouté.</p>
      </CheckSection>
    );
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
  const missingCount = (missing?.totalMissingFields || 0) + (missing?.totalMissingDocuments || 0);

  const kinds = requiredDocuments as string[];
  const personKinds: string[] = kinds.filter((k) => k === DocumentKind.ID_IDENTITY);
  const companyKinds: string[] = kinds.filter((k) => k === DocumentKind.KBIS || k === DocumentKind.STATUTES);
  const clientKinds = kinds.filter((k) => !personKinds.includes(k) && !companyKinds.includes(k));

  const name = isCompany
    ? party.entreprise?.legalName || party.entreprise?.name || "Société"
    : persons.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean).join(" et ") || "Sans nom";

  /** Champs éditables d'un point, avec leur état « manquant ». */
  const groupFields = (values: any, fields: string[], isMissing: (f: string) => boolean): GroupField[] =>
    fields.map((field) => ({
      field,
      label: FIELD_META[field].label,
      kind: FIELD_META[field].kind,
      value: FIELD_META[field].date ? isoDay(values[field]) : values[field] ? String(values[field]) : null,
      missing: isMissing(field),
    }));

  const points: ReactNode[] = [];

  if (isCompany && party.entreprise) {
    const ent = party.entreprise;
    const isMissing = (f: string) => missingCompany.has(f) || (requiredFields.includes(f) && !ent[f]);
    const groups = [
      {
        key: "societe",
        label: "Société",
        fields: ["legalName", "name", "registration"],
        lines: [join([ent.legalName, ent.name && ent.name !== ent.legalName && `« ${ent.name} »`]), ent.registration && `Immatriculation : ${ent.registration}`],
      },
      {
        key: "coordonnees",
        label: "Coordonnées",
        fields: ["phone", "fullAddress"],
        extraMissing: isMissing("email") ? ["email"] : [],
        lines: [join([ent.email, ent.phone]), ent.fullAddress],
      },
    ];
    for (const g of groups) {
      const miss = [...g.fields.filter(isMissing), ...(g.extraMissing || [])];
      const text = g.lines.filter(Boolean).join("\n");
      points.push(
        <CheckPoint
          key={`ent-${g.key}`}
          state={miss.length > 0 ? "missing" : "ok"}
          label={g.label}
          note={miss.length > 0 ? `Manquant : ${miss.map((f) => MISSING_FIELD_LABELS[f] || f).join(", ")}` : null}
          actions={<GroupFieldEditor entity="entreprise" id={ent.id} title={`${g.label} · ${name}`} fields={groupFields(ent, g.fields, isMissing)} />}
        >
          {text || <span className="text-muted-foreground">Non renseigné</span>}
        </CheckPoint>,
      );
    }
  }

  if (!isCompany) {
    const many = persons.length > 1;
    for (const person of persons) {
      const required = person.id === primary?.id ? requiredFields : BASE_PERSON_REQUIRED;
      const missingSet = missingByPerson.get(person.id) || new Set<string>();
      const isMissing = (f: string) => missingSet.has(f) || (required.includes(f) && !person[f]);
      const who = person.firstName || [person.firstName, person.lastName].filter(Boolean).join(" ") || "personne";
      const suffix = many ? ` · ${who}` : "";
      const primaryMark = many && person.id === primary?.id ? " (principale)" : "";
      const born = person.birthDate || person.birthPlace;
      const groups = [
        {
          key: "identite",
          label: `Identité${suffix}${primaryMark}`,
          fields: ["firstName", "lastName", "birthDate", "birthPlace", "nationality", "profession"],
          lines: [
            join([
              [person.firstName, person.lastName].filter(Boolean).join(" "),
              born && join([person.birthDate && `né(e) le ${frDay(person.birthDate)}`, person.birthPlace && `à ${person.birthPlace}`], " "),
            ]),
            join([person.nationality && `Nationalité : ${person.nationality}`, person.profession]),
          ],
        },
        {
          key: "coordonnees",
          label: `Coordonnées${suffix}`,
          fields: ["phone", "fullAddress"],
          extraMissing: isMissing("email") ? ["email"] : [],
          lines: [join([person.email, person.phone]), person.fullAddress],
        },
        {
          key: "famille",
          label: `Situation familiale${suffix}`,
          fields: ["familyStatus", ...(person.familyStatus === "MARIE" || person.matrimonialRegime ? ["matrimonialRegime"] : [])],
          lines: [
            join([
              person.familyStatus && (FAMILY_STATUS_LABELS[person.familyStatus] || person.familyStatus),
              person.matrimonialRegime
                ? MATRIMONIAL_REGIME_LABELS[person.matrimonialRegime] || person.matrimonialRegime
                : person.familyStatus === "MARIE" && "régime matrimonial non renseigné",
            ]),
          ],
        },
      ];
      for (const g of groups) {
        const miss = [...g.fields.filter(isMissing), ...(g.extraMissing || [])];
        const text = g.lines.filter(Boolean).join("\n");
        points.push(
          <CheckPoint
            key={`${person.id}-${g.key}`}
            state={miss.length > 0 ? "missing" : "ok"}
            label={g.label}
            note={miss.length > 0 ? `Manquant : ${miss.map((f) => MISSING_FIELD_LABELS[f] || f).join(", ")}` : null}
            actions={
              <GroupFieldEditor
                entity="person"
                id={person.id}
                title={g.label.replace(" (principale)", "")}
                fields={groupFields(person, g.fields, isMissing)}
              />
            }
          >
            {text || <span className="text-muted-foreground">Non renseigné</span>}
          </CheckPoint>,
        );
      }
    }
  }

  // Toutes les pièces du bloc, à la suite des données (comme dans la maquette).
  const docRows = [
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

  const completed = party.completionStatus === CompletionStatus.COMPLETED;
  const kindLabel = isCompany ? "Société" : persons.length > 1 ? `Particuliers · ${persons.length} personnes` : "Particulier";

  return (
    <CheckSection
      id={id}
      title={`${roleTitle}${persons.length > 1 ? "s" : ""} · ${name}`}
      subtitle={
        <>
          {join([kindLabel, formNote])}{" "}
          <Link href={`/interface/clients/${party.id}`} className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
            Fiche client
            <ArrowUpRight className="size-3.5" />
          </Link>
        </>
      }
      headerRight={
        <>
          {missingCount > 0 && (
            <StateChip tone="missing">
              {missingCount} manquant{missingCount > 1 ? "s" : ""}
            </StateChip>
          )}
          <CompletionStatusSelect
            type="client"
            id={party.id}
            currentStatus={party.completionStatus}
            viewLabel={false}
            showValueLabel
            className="h-8"
          />
          {!completed && (
            <ValidateBlockButton
              type="client"
              id={party.id}
              disabledReason={missingCount > 0 ? "Complétez d'abord les éléments manquants." : null}
            />
          )}
        </>
      }
    >
      <CheckList>{points}</CheckList>
      {docRows.length > 0 && (
        <div className="border-t">
          <DocumentChecklist rows={docRows} inset />
        </div>
      )}
    </CheckSection>
  );
}
