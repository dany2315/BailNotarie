/**
 * Clés des points de la fiche de vérification.
 *
 * Une clé = « nom du point » + « empreinte des données vérifiées ». Si les
 * données changent après validation (numéro modifié, nouvelle pièce déposée),
 * l'empreinte change : le point redevient « à valider » sans rien effacer.
 */

/** Empreinte courte et stable (FNV-1a 32 bits) d'une valeur sérialisable. */
export function fingerprint(value: unknown): string {
  const text = JSON.stringify(value ?? null);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function pointKey(base: string, values: unknown): string {
  return `${base}#${fingerprint(values)}`;
}

/** État d'un point de contrôle pour l'affichage et les compteurs. */
export interface VerificationPointState {
  key: string;
  missing: boolean;
  verified: boolean;
}

/** Ce qu'un bloc (ou la fiche entière) affiche : manquants, validés, total. */
export function summarize(points: VerificationPointState[]) {
  const missing = points.filter((p) => p.missing).length;
  const verified = points.filter((p) => !p.missing && p.verified).length;
  return {
    total: points.length,
    missing,
    verified,
    remaining: points.length - missing - verified,
    /** Points validables mais pas encore validés (pour « Tout valider »). */
    pendingKeys: points.filter((p) => !p.missing && !p.verified).map((p) => p.key),
  };
}

export type VerificationSummary = ReturnType<typeof summarize>;

/** Pastille d'un bloc : « 2 manquants », « Vérifié » ou « 3 / 7 vérifiés ». */
export function summaryChip(summary: VerificationSummary): { label: string; tone: "missing" | "ok" | "todo" } {
  if (summary.missing > 0) return { label: `${summary.missing} manquant${summary.missing > 1 ? "s" : ""}`, tone: "missing" };
  if (summary.total > 0 && summary.verified === summary.total) return { label: "Vérifié", tone: "ok" };
  return { label: `${summary.verified} / ${summary.total} vérifiés`, tone: "todo" };
}
