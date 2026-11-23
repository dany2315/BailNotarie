import { cn } from "@/lib/utils";
import { commercialTermsSummary } from "@/lib/utils/commercial-terms";

/**
 * Conditions d'un bail commercial (réponses du propriétaire), en liste libellé / valeur.
 * Utilisée sur la fiche dossier de l'équipe et dans la vue du notaire.
 */
export function CommercialTermsList({
  terms,
  bail,
  extraRows = [],
  inset = true,
  className,
}: {
  terms: unknown;
  bail?: { bailType?: string | null; rentAmount?: number | null };
  /** Lignes ajoutées en tête (représentant légal d'une société, etc.). */
  extraRows?: Array<[string, string]>;
  /** Marges horizontales, pour une liste posée directement dans une section. */
  inset?: boolean;
  className?: string;
}) {
  const rows = [...extraRows, ...commercialTermsSummary(terms, bail)];
  if (rows.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", inset && "px-5 py-4")}>
        Conditions commerciales pas encore renseignées par le propriétaire.
      </p>
    );
  }
  return (
    <dl className={cn("divide-y", className)}>
      {rows.map(([label, value]) => (
        <div key={label} className={cn("grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4", inset && "px-5")}>
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-sm whitespace-pre-line break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Représentants légaux des sociétés parties au bail, pour la liste ci-dessus. */
export function companyRepresentativeRows(parties: Array<{ label: string; entreprise?: any }>): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  for (const { label, entreprise } of parties) {
    if (!entreprise) continue;
    const representative = [entreprise.representativeName, entreprise.representativeRole].filter(Boolean).join(", ");
    if (representative) rows.push([`Représentant (${label})`, representative]);
    if (entreprise.isRegistered === false) rows.push([`Immatriculation (${label})`, "Société en cours de création : Kbis à fournir plus tard"]);
  }
  return rows;
}
