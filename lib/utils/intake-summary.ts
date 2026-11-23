import { formatDate } from "@/lib/utils/formatters";

/** Suivi d'un formulaire envoyé (dates en ISO ou Date). */
export interface IntakeTrackingLike {
  status: string;
  formEmailSentAt: string | Date | null;
  formEmailCount: number;
  lastFormEmailSentAt: string | Date | null;
  firstOpenedAt: string | Date | null;
  submittedAt: string | Date | null;
}

/** « Envoyé le 05/10 · relancé 1 fois, dernière le 06/10 · rempli le 08/10 ». */
export function intakeSummary(link: IntakeTrackingLike | undefined | null): string {
  if (!link) return "Aucun formulaire";
  const parts: string[] = [];
  const firstSent = link.formEmailSentAt || link.lastFormEmailSentAt;
  // Les envois antérieurs au suivi n'ont pas été enregistrés : ne rien affirmer.
  if (firstSent) parts.push(`envoyé le ${formatDate(firstSent)}`);
  else if (!link.submittedAt) parts.push("envoi non enregistré");
  if (link.formEmailCount > 1 && link.lastFormEmailSentAt) {
    parts.push(`relancé ${link.formEmailCount - 1} fois, dernière le ${formatDate(link.lastFormEmailSentAt)}`);
  }
  if (link.submittedAt) parts.push(`rempli le ${formatDate(link.submittedAt)}`);
  else parts.push(link.firstOpenedAt ? `ouvert le ${formatDate(link.firstOpenedAt)}` : "jamais ouvert");
  if (link.status === "REVOKED") parts.push("lien révoqué");
  if (link.status === "EXPIRED") parts.push("lien expiré");
  const text = parts.join(" · ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
