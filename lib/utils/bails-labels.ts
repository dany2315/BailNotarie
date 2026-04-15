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

/** Couleurs centralisées pour les statuts de bail notaire */
export const BAIL_STATUS_COLORS: Record<string, {
  badge: string;
  text: string;
  label: string;
}> = {
  READY_FOR_NOTARY: {
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    text: "text-orange-600",
    label: "À contacter",
  },
  CLIENT_CONTACTED: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    text: "text-blue-600",
    label: "En traitement",
  },
  SIGNED: {
    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800",
    text: "text-green-600",
    label: "Signé",
  },
  DESISTE: {
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800",
    text: "text-red-600",
    label: "Désisté",
  },
  CLASSE_SANS_SUITE: {
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400 border-gray-200 dark:border-gray-800",
    text: "text-gray-600",
    label: "Classé sans suite",
  },
  TERMINATED: {
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400 border-gray-200 dark:border-gray-800",
    text: "text-gray-600",
    label: "Terminé",
  },
};

export function getBailStatusColor(status: string) {
  return BAIL_STATUS_COLORS[status] || { badge: "", text: "", label: getBailStatusLabel(status) };
}