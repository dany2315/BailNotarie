import type { BailMissingDataClient } from "@/lib/actions/leases";
import { documentKindLabels } from "@/lib/utils/document-labels";

/** Libellés des champs, tels qu'ils apparaissent dans « Manquant : … ». */
export const MISSING_FIELD_LABELS: Record<string, string> = {
  firstName: "prénom",
  lastName: "nom",
  birthDate: "date de naissance",
  birthPlace: "lieu de naissance",
  nationality: "nationalité",
  profession: "profession",
  email: "e-mail",
  phone: "téléphone",
  fullAddress: "adresse",
  familyStatus: "situation familiale",
  matrimonialRegime: "régime matrimonial (obligatoire si marié)",
  legalName: "raison sociale",
  registration: "n° d'immatriculation",
};

const docLabel = (kind: string) => (documentKindLabels[kind] || kind).toLowerCase();

/**
 * Liste lisible de ce qui manque pour un client du dossier (une ligne par
 * élément), pour la demande envoyée au client.
 */
export function describeMissingItems(
  client: Pick<BailMissingDataClient, "persons" | "entreprise" | "clientDocuments" | "generalDocuments"> | null,
): string[] {
  if (!client) return [];
  const items: string[] = [];
  const many = client.persons.length > 1;
  for (const person of client.persons) {
    const who = many ? ` (${person.personName})` : "";
    for (const field of person.missingFields) items.push(`${MISSING_FIELD_LABELS[field] || field}${who}`);
    for (const kind of person.missingDocuments) items.push(`${docLabel(kind)}${who}`);
  }
  if (client.entreprise) {
    for (const field of client.entreprise.missingFields) items.push(MISSING_FIELD_LABELS[field] || field);
    for (const kind of client.entreprise.missingDocuments) items.push(docLabel(kind));
  }
  for (const kind of [...client.clientDocuments, ...client.generalDocuments]) items.push(docLabel(kind));
  // Sans doublon, première lettre en majuscule.
  return Array.from(new Set(items)).map((item) => item.charAt(0).toUpperCase() + item.slice(1));
}
