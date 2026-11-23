import { PREMISES_TYPE_LABELS } from "@/lib/utils/commercial-terms";

/** Libellés des types de bien, logements et locaux (serveur et client). */
export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APPARTEMENT: "Appartement",
  MAISON: "Maison",
  ...PREMISES_TYPE_LABELS,
};

export function getPropertyTypeLabel(type: string | null | undefined): string {
  if (!type) return "";
  return PROPERTY_TYPE_LABELS[type] ?? type;
}

/** Profil d'un client. */
export const PROFIL_TYPE_LABELS: Record<string, string> = {
  PROPRIETAIRE: "Propriétaire",
  LOCATAIRE: "Locataire",
  LEAD: "Prospect",
};
