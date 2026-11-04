/**
 * Frais de dossier BailNotarie, payés par carte à la fin du formulaire propriétaire (ou à la
 * création d'un bail depuis l'espace client). Le montant dépend du type de bail ; Stripe encaisse
 * en centimes et le serveur vérifie le montant payé avant d'enregistrer le dossier.
 */

const DOSSIER_FEE_CENTS = {
  HABITATION: 3990,
  COMMERCIAL: 5990,
} as const;

/** Montant en centimes : bail commercial, ou habitation par défaut (type pas encore choisi). */
export function dossierFeeCents(bailFamily?: string | null): number {
  return bailFamily === "COMMERCIAL" ? DOSSIER_FEE_CENTS.COMMERCIAL : DOSSIER_FEE_CENTS.HABITATION;
}

/** « 39,90 € » ou « 59,90 € ». */
export function formatDossierFee(bailFamily?: string | null): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(
    dossierFeeCents(bailFamily) / 100,
  );
}
