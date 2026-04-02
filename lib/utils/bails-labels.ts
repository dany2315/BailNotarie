const bailTypeLabels: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nue 3 ans",
  BAIL_NU_6_ANS: "Bail nue 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

export function getBailTypeLabel(bailType: string): string {
  return bailTypeLabels[bailType] || bailType;
}

const bailStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_VALIDATION: "En attente de validation",
  READY_FOR_NOTARY: "À contacter",
  CLIENT_CONTACTED: "En traitement",
  SIGNED: "Signé",
  TERMINATED: "Terminé",
  DESISTE: "Désisté",
  CLASSE_SANS_SUITE: "Classé sans suite",
};

export function getBailStatusLabel(status: string): string {
  return bailStatusLabels[status] || status;
}

/** Catégories de filtrage pour les onglets notaire */
export type DossierFilterTab = "en_cours" | "signes" | "classes";

export const DOSSIER_FILTER_TABS: { value: DossierFilterTab; label: string }[] = [
  { value: "en_cours", label: "En cours" },
  { value: "signes", label: "Signés" },
  { value: "classes", label: "Classés" },
];

/** Statuts correspondant à chaque onglet */
export const DOSSIER_TAB_STATUSES: Record<DossierFilterTab, string[]> = {
  en_cours: ["READY_FOR_NOTARY", "CLIENT_CONTACTED"],
  signes: ["SIGNED"],
  classes: ["TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"],
};

/** Sous-catégories pour l'onglet "En cours" */
export type DossierSubFilter = "all" | "a_contacter" | "en_traitement";

export const DOSSIER_SUB_FILTERS: { value: DossierSubFilter; label: string; status: string | null }[] = [
  { value: "all", label: "Tous", status: null },
  { value: "a_contacter", label: "À contacter", status: "READY_FOR_NOTARY" },
  { value: "en_traitement", label: "En traitement", status: "CLIENT_CONTACTED" },
];