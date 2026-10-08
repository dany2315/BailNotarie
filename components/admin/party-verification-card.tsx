import { ClientType, DocumentKind, ProfilType } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { InlineFieldEditor, type InlineFieldKind } from "@/components/admin/inline-field-editor";
import { FAMILY_STATUS_LABELS, MATRIMONIAL_REGIME_LABELS } from "@/lib/utils/person-labels";
import { buildChecklistRows, toChecklistDocument, type ChecklistDocument } from "@/lib/utils/document-checklist";
import { getRequiredClientFields } from "@/lib/utils/required-fields";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/utils/phone-format";

/**
 * Fiche client (maquette « Client ») : carte « Identité » avec un onglet par
 * personne et la grille des champs, puis carte « Pièces ».
 */

const isoDay = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const frDay = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) : null;

interface FieldDef {
  field: string;
  label: string;
  kind?: InlineFieldKind;
  /** Non modifiable en direct (e-mail : sert à la connexion du client). */
  readOnly?: boolean;
  format?: (value: any) => string | null;
}

const PERSON_FIELDS: FieldDef[] = [
  { field: "firstName", label: "Prénom" },
  { field: "lastName", label: "Nom" },
  { field: "birthDate", label: "Date de naissance", kind: "date", format: frDay },
  { field: "birthPlace", label: "Lieu de naissance" },
  { field: "nationality", label: "Nationalité", kind: "nationality" },
  { field: "profession", label: "Profession" },
  { field: "familyStatus", label: "Situation familiale", kind: "familyStatus", format: (v) => (v ? FAMILY_STATUS_LABELS[v] || v : null) },
  { field: "matrimonialRegime", label: "Régime matrimonial", kind: "matrimonialRegime", format: (v) => (v ? MATRIMONIAL_REGIME_LABELS[v] || v : null) },
  { field: "email", label: "E-mail", readOnly: true },
  { field: "phone", label: "Téléphone", kind: "phone", format: formatPhone },
  { field: "fullAddress", label: "Adresse" },
];

const ENTREPRISE_FIELDS: FieldDef[] = [
  { field: "legalName", label: "Raison sociale" },
  { field: "name", label: "Nom commercial" },
  { field: "registration", label: "Numéro d'immatriculation" },
  { field: "email", label: "E-mail", readOnly: true },
  { field: "phone", label: "Téléphone", kind: "phone", format: formatPhone },
  { field: "fullAddress", label: "Adresse du siège" },
];

/** Champs de base exigés pour toute personne (pas seulement la principale). */
const BASE_PERSON_REQUIRED = ["firstName", "lastName", "nationality", "birthDate", "birthPlace"];

function FieldGrid({
  entity,
  id,
  values,
  defs,
  required,
  missing,
}: {
  entity: "person" | "entreprise";
  id: string;
  values: Record<string, any>;
  defs: FieldDef[];
  required: Set<string>;
  missing: Set<string>;
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {defs.map((def) => {
        const raw = values[def.field];
        const display = def.format ? def.format(raw) : raw ? String(raw) : null;
        const isMissing = missing.has(def.field) || (required.has(def.field) && !display);
        const editValue = def.kind === "date" ? isoDay(raw) : raw ? String(raw) : null;
        return (
          <div key={def.field} className="group flex items-start justify-between gap-3 border-t py-3 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-[12.5px] text-muted-foreground">
                {def.label}
                {required.has(def.field) && (
                  <span className="text-red-700" aria-label="obligatoire">
                    {" "}
                    *
                  </span>
                )}
              </dt>
              <dd
                className={cn(
                  "break-words text-[14.5px]",
                  isMissing ? "font-semibold text-red-700" : display ? "font-medium" : "text-muted-foreground",
                )}
              >
                {display || (isMissing ? (def.field === "matrimonialRegime" ? "Manquant (obligatoire si marié)" : "Manquant") : "Non renseigné")}
              </dd>
            </div>
            {!def.readOnly && (
              <InlineFieldEditor entity={entity} id={id} field={def.field} label={def.label} kind={def.kind} value={editValue} />
            )}
          </div>
        );
      })}
    </dl>
  );
}

type PartyMissing = {
  totalMissingFields: number;
  totalMissingDocuments: number;
  persons: Array<{ personId: string; missingFields: string[] }>;
  entreprise: { missingFields: string[] } | null;
};

function requirements(party: any) {
  const persons: any[] = party.persons || [];
  const primary = persons.find((p) => p.isPrimary) || persons[0];
  return {
    persons,
    primary,
    ...getRequiredClientFields(party.type, party.profilType as ProfilType, primary?.familyStatus, primary?.matrimonialRegime),
  };
}

/** Carte « Identité » (ou « Société ») de la fiche client. */
export function ClientIdentityCard({ party, missing }: { party: any; missing: PartyMissing | null }) {
  const isCompany = party.type === ClientType.PERSONNE_MORALE;
  const { persons, primary, requiredFields } = requirements(party);
  const missingByPerson = new Map<string, Set<string>>();
  for (const p of missing?.persons || []) missingByPerson.set(p.personId, new Set(p.missingFields));

  const personGrid = (person: any) => (
    <FieldGrid
      entity="person"
      id={person.id}
      values={person}
      defs={PERSON_FIELDS.filter((def) => def.field !== "matrimonialRegime" || person.familyStatus === "MARIE" || person.matrimonialRegime)}
      required={new Set(person.id === primary?.id ? requiredFields : BASE_PERSON_REQUIRED)}
      missing={missingByPerson.get(person.id) || new Set()}
    />
  );
  const personLabel = (person: any) =>
    `${[person.firstName, person.lastName].filter(Boolean).join(" ") || "Personne sans nom"}${person.id === primary?.id && persons.length > 1 ? " · principale" : ""}`;

  if (isCompany) {
    return (
      <section className="rounded-xl border bg-card px-5 pb-2 pt-1.5">
        <h2 className="pb-2 pt-3 text-[17px] font-semibold">Société</h2>
        {party.entreprise ? (
          <FieldGrid
            entity="entreprise"
            id={party.entreprise.id}
            values={party.entreprise}
            defs={ENTREPRISE_FIELDS}
            required={new Set(requiredFields)}
            missing={new Set(missing?.entreprise?.missingFields || [])}
          />
        ) : (
          <p className="pb-3 text-sm text-muted-foreground">Société non renseignée.</p>
        )}
      </section>
    );
  }

  if (persons.length <= 1) {
    return (
      <section className="rounded-xl border bg-card px-5 pb-2 pt-1.5">
        <h2 className="pb-2 pt-3 text-[17px] font-semibold">Identité</h2>
        {primary ? personGrid(primary) : <p className="pb-3 text-sm text-muted-foreground">Aucune personne renseignée.</p>}
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card px-5 pb-2 pt-1.5">
      <Tabs defaultValue={primary?.id}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 pt-3">
          <h2 className="text-[17px] font-semibold">Identité</h2>
          <TabsList className="h-auto max-w-full flex-wrap justify-start rounded-xl p-1">
            {persons.map((person) => {
              const missingHere = (missingByPerson.get(person.id)?.size || 0) > 0;
              return (
                <TabsTrigger key={person.id} value={person.id} className="min-h-9 gap-1.5 rounded-lg px-3">
                  {personLabel(person)}
                  {missingHere && <span className="size-2 rounded-full bg-red-600" aria-label="éléments manquants" />}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        {persons.map((person) => (
          <TabsContent key={person.id} value={person.id} className="mt-0">
            {personGrid(person)}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

/** Carte « Pièces » de la fiche client : une ligne par pièce attendue, avec Voir et Télécharger. */
export function ClientDocumentsCard({ party, clientDocuments }: { party: any; clientDocuments: any[] }) {
  const isCompany = party.type === ClientType.PERSONNE_MORALE;
  const { persons, requiredDocuments } = requirements(party);
  const kinds = requiredDocuments as string[];
  const personKinds: string[] = kinds.filter((k) => k === DocumentKind.ID_IDENTITY);
  const companyKinds: string[] = kinds.filter((k) => k === DocumentKind.KBIS || k === DocumentKind.STATUTES);
  const clientKinds = kinds.filter((k) => !personKinds.includes(k) && !companyKinds.includes(k));

  const rows = [
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
  const missingCount = rows.filter((r) => r.required && r.documents.length === 0).length;
  const summary =
    rows.length === 0
      ? "Aucune pièce attendue"
      : `${rows.length} pièce${rows.length > 1 ? "s" : ""} · ${
          missingCount === 0 ? "toutes présentes" : `${missingCount} manquante${missingCount > 1 ? "s" : ""}`
        }`;

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 pb-2 pt-4">
        <h2 className="text-[17px] font-semibold">Pièces</h2>
        <span className={cn("text-[13px]", missingCount > 0 ? "font-semibold text-red-700" : "text-muted-foreground")}>{summary}</span>
      </div>
      {rows.length > 0 && <DocumentChecklist rows={rows} inset />}
    </section>
  );
}
