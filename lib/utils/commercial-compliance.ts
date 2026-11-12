/**
 * Conformité légale d'un bail commercial, pour la fiche dossier de l'équipe.
 * Remplace le plafond de loyer et la relocation en zone tendue, propres au logement.
 * Fonctions pures : la page fournit le bail, ses conditions et les parties.
 */
import {
  CHARGE_ITEMS,
  OWNER_ONLY_CHARGES,
  asksBoughtDuringMarriage,
  spouseMustSign,
} from "./commercial-terms";
import { isRegistryVerifiedActive, registryRepresentativeStatus } from "./company-registry";

/** Ton d'une ligne de l'affichage : conforme, à vérifier, ou neutre. */
export type RuleTone = "ok" | "warn" | "neutral";

/** Ligne « libellé : valeur(s) » d'une règle, affichée en tableau compact. */
export interface RuleFact {
  label: string;
  /** Une valeur par ligne (liste de travaux, par exemple). */
  values: string[];
  tone?: RuleTone;
}

/** Répartition des charges : un groupe par payeur, chaque poste en pastille. */
export interface RuleSplitGroup {
  label: string;
  tone: "tenant" | "owner" | "missing";
  items: Array<{ label: string; /** Imposé par la loi (article R145-35). */ fixed?: boolean }>;
}

export type RuleView = { kind: "facts"; facts: RuleFact[] } | { kind: "split"; groups: RuleSplitGroup[] };

export interface CommercialRule {
  /** Identifiant stable de la règle (la clé de validation y ajoute les données contrôlées). */
  id: string;
  label: string;
  /** Contrôlée par le logiciel : pas de validation à la main. */
  auto: boolean;
  /** Donnée absente ou contraire à la loi : bloque l'envoi au notaire. */
  missing: boolean;
  /** Ce qui manque ou ce qui ne va pas (en rouge). */
  note: string | null;
  /** Ce que l'équipe lit, en tableau compact. */
  view: RuleView | null;
  /** Points d'attention (en orange), sans bloquer. */
  warnings: string[];
  /** Texte de loi, affiché en petit. */
  legal: string;
  /** Données dont dépend la validation : la changer redemande une vérification. */
  values: unknown[];
  /** Se corrige dans « Conditions commerciales ». */
  editsTerms: boolean;
}

const euros = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value);

const day = (date: Date) => date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });

const toDate = (value: unknown) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Fin d'un bail de n mois commençant à start : la veille du même jour, n mois plus tard. */
function endAfterMonths(start: Date, months: number): Date {
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  end.setDate(end.getDate() - 1);
  return end;
}

/** « du 01/12/2026 au 30/11/2035 », ou null sans date de prise d'effet. */
function period(start: Date | null, months: number | null, endDate: Date | null): string | null {
  if (!start) return null;
  const end = endDate ?? (months != null ? endAfterMonths(start, months) : null);
  return end ? `du ${day(start)} au ${day(end)}` : `à partir du ${day(start)}`;
}

function worksLines(value: unknown): string[] {
  const lines = Array.isArray(value) ? value : [];
  return lines.map((line: any) =>
    [line?.label || "Travaux", line?.year ? String(line.year) : null, line?.amount != null && line.amount !== "" ? euros(Number(line.amount)) : null]
      .filter(Boolean)
      .join(" · "),
  );
}

type Party = { type?: string | null; entreprise?: any; persons?: any[] } | null | undefined;

function partyCompany(party: Party) {
  return party?.type === "PERSONNE_MORALE" ? party.entreprise ?? null : null;
}

const SHORT_OWNER_ONLY: Record<string, string> = {
  majorRepairs: "Grosses réparations",
  managementFees: "Honoraires de gestion",
};

const INDEX_SHORT: Record<string, { value: string; use: string }> = {
  ILC: { value: "ILC · indice des loyers commerciaux", use: "adapté à un commerce ou un artisan" },
  ILAT: { value: "ILAT · indice des activités tertiaires", use: "adapté à des bureaux ou une profession libérale" },
  NONE: { value: "Pas de révision", use: "loyer fixe, sauf révision légale possible tous les 3 ans" },
};

export function commercialComplianceRules(input: {
  bail: {
    bailType?: string | null;
    rentAmount?: number | null;
    securityDeposit?: number | null;
    effectiveDate?: Date | string | null;
    endDate?: Date | string | null;
  };
  terms: any | null | undefined;
  owner: Party;
  tenant: Party;
}): CommercialRule[] {
  const { bail, terms, owner, tenant } = input;
  const t = terms ?? {};
  const rules: CommercialRule[] = [];
  const start = toDate(bail.effectiveDate);
  const endDate = toDate(bail.endDate);

  // 1. Durée : 9 ans (3-6-9), ou 3 ans au plus pour un bail dérogatoire.
  if (bail.bailType === "COMMERCIAL_DEROGATOIRE") {
    const months: number | null = t.derogatoryMonths ?? null;
    const over = months != null && months > 36;
    const when = period(start, months, endDate);
    rules.push({
      id: "duree",
      label: "Bail dérogatoire",
      auto: true,
      missing: months == null || over,
      note:
        months == null
          ? "Durée en mois à saisir"
          : over
            ? `${months} mois : un bail dérogatoire ne peut pas dépasser 36 mois, renouvellements compris`
            : null,
      view:
        months != null
          ? {
              kind: "facts",
              facts: [
                { label: "Durée", values: [`${months} mois`], tone: over ? "warn" : "ok" },
                ...(when ? [{ label: "Période", values: [when] }] : []),
              ],
            }
          : null,
      warnings:
        t.previouslyLet === true ? ["Local déjà loué : si c'était au même locataire en dérogatoire, 3 ans au total au maximum."] : [],
      legal: "",
      values: [bail.bailType, months],
      editsTerms: true,
    });
  } else {
    const when = period(start, 108, endDate);
    rules.push({
      id: "duree",
      label: "Bail 3/6/9",
      auto: true,
      missing: false,
      note: null,
      view: {
        kind: "facts",
        facts: [
          { label: "Durée", values: ["9 ans"], tone: "ok" },
          ...(when ? [{ label: "Période", values: [when] }] : []),
          { label: "Sortie", values: ["le locataire peut partir tous les 3 ans"] },
        ],
      },
      warnings: [],
      legal: "Article L145-4 du Code de commerce",
      values: [bail.bailType],
      editsTerms: false,
    });
  }

  // 2. Inventaire des charges, impôts et taxes, avec leur répartition (loi Pinel).
  const allocation = t.chargesAllocation && typeof t.chargesAllocation === "object" ? (t.chargesAllocation as Record<string, string>) : null;
  const unallocated = CHARGE_ITEMS.filter((item) => !allocation?.[item.key]);
  const byPayer = (payer: string) => CHARGE_ITEMS.filter((item) => allocation?.[item.key] === payer).map((item) => ({ label: item.label }));
  rules.push({
    id: "charges",
    label: "Inventaire des charges, impôts et taxes",
    // Répartition choisie dans le formulaire ; grosses réparations et honoraires de gestion y sont
    // toujours au propriétaire : rien à vérifier à la main.
    auto: true,
    missing: unallocated.length > 0,
    note: unallocated.length > 0 ? "Répartition à compléter" : null,
    view: {
      kind: "split",
      groups: [
        { label: "Locataire", tone: "tenant" as const, items: byPayer("TENANT") },
        {
          label: "Propriétaire",
          tone: "owner" as const,
          items: [...byPayer("OWNER"), ...OWNER_ONLY_CHARGES.map((item) => ({ label: SHORT_OWNER_ONLY[item.key] || item.label, fixed: true }))],
        },
        ...(unallocated.length > 0 ? [{ label: "À répartir", tone: "missing" as const, items: unallocated.map((item) => ({ label: item.label })) }] : []),
      ],
    },
    warnings: [],
    legal: "Articles L145-40-2 et R145-35 du Code de commerce",
    values: [allocation ? CHARGE_ITEMS.map((item) => allocation[item.key] ?? null) : null],
    editsTerms: true,
  });

  // 3. État des travaux : réalisés sur les 3 dernières années, prévus sur les 3 prochaines.
  const pastUnknown = t.hasPastWorks == null;
  const plannedUnknown = t.hasPlannedWorks == null;
  const worksFact = (label: string, unknown: boolean, has: boolean, list: unknown): RuleFact =>
    unknown
      ? { label, values: ["non renseigné"], tone: "warn" }
      : has
        ? { label, values: worksLines(list).length ? worksLines(list) : ["oui, à détailler"], tone: worksLines(list).length ? "neutral" : "warn" }
        : { label, values: ["aucun"], tone: "ok" };
  rules.push({
    id: "travaux",
    label: "État des travaux",
    // Le formulaire exige une réponse et le coût de chaque travail.
    auto: true,
    missing: pastUnknown || plannedUnknown,
    note:
      pastUnknown || plannedUnknown
        ? `À renseigner : ${[pastUnknown && "travaux des 3 dernières années", plannedUnknown && "travaux prévus dans les 3 ans"].filter(Boolean).join(", ")}`
        : null,
    view: {
      kind: "facts",
      facts: [
        worksFact("Faits (3 ans passés)", pastUnknown, !!t.hasPastWorks, t.pastWorks),
        worksFact("Prévus (3 ans à venir)", plannedUnknown, !!t.hasPlannedWorks, t.plannedWorks),
      ],
    },
    warnings: [],
    legal: "Article L145-40-2 du Code de commerce · annexé au bail, remis au locataire tous les 3 ans",
    values: [t.hasPastWorks ?? null, t.hasPlannedWorks ?? null, JSON.stringify(t.pastWorks ?? null), JSON.stringify(t.plannedWorks ?? null)],
    editsTerms: true,
  });

  // 4. Révision du loyer : indice adapté à l'activité.
  const index = t.indexation ? INDEX_SHORT[t.indexation] : null;
  rules.push({
    id: "indexation",
    label: "Révision du loyer",
    // Indice choisi dans le formulaire parmi ILC, ILAT ou pas de révision.
    auto: true,
    missing: !t.indexation,
    note: !t.indexation ? "Indice de révision à choisir" : null,
    view: t.indexation
      ? {
          kind: "facts",
          facts: [
            { label: "Indice", values: [index?.value || t.indexation], tone: "ok" },
            ...(t.activity ? [{ label: "Activité", values: [String(t.activity)] }] : []),
            ...(index ? [{ label: "Usage", values: [index.use] }] : []),
          ],
        }
      : null,
    warnings: [],
    legal: "Articles L145-34, L145-38 et L145-39 du Code de commerce ; L112-2 du Code monétaire et financier",
    values: [t.indexation ?? null, t.activity ?? null],
    editsTerms: true,
  });

  // 5. Locataire immatriculé : condition du statut des baux commerciaux (droit au renouvellement).
  if (tenant) {
    const company = partyCompany(tenant);
    let fact: RuleFact;
    let auto = false;
    if (company?.isRegistered === false) {
      auto = true;
      fact = { label: "Locataire", values: ["société en création : demander le Kbis dès qu'il existe"], tone: "warn" };
    } else if (company && isRegistryVerifiedActive(company)) {
      auto = true;
      fact = { label: "Locataire", values: [`trouvé au registre, en activité${company.registration ? ` · n° ${company.registration}` : ""}`], tone: "ok" };
    } else if (company) {
      fact = { label: "Locataire", values: ["saisi à la main : vérifier sur le Kbis (ou bouton « Registre »)"], tone: "warn" };
    } else {
      fact = { label: "Locataire", values: ["particulier : vérifier qu'il est inscrit au RCS ou au répertoire des métiers"], tone: "warn" };
    }
    rules.push({
      id: "immatriculation",
      label: "Inscription du locataire au registre",
      auto,
      missing: false,
      note: null,
      view: { kind: "facts", facts: [fact] },
      warnings: [],
      legal: "Article L145-1 du Code de commerce ; L210-6 pour une société en formation",
      values: [tenant.type ?? null, company?.isRegistered ?? null, company?.registration ?? null, company?.registryCheckedAt ?? null],
      editsTerms: false,
    });
  }

  // 6. Pouvoirs des signataires des sociétés (saisis dans le bloc de chaque partie).
  const companies = [
    { label: "Propriétaire", entreprise: partyCompany(owner) },
    { label: "Locataire", entreprise: partyCompany(tenant) },
  ].filter((entry) => entry.entreprise);
  if (companies.length > 0) {
    const checks = companies.map(({ label, entreprise }) => ({ label, entreprise, status: registryRepresentativeStatus(entreprise) }));
    rules.push({
      id: "signataires",
      label: "Pouvoirs des signataires",
      // Vérifié automatiquement quand chaque signataire est représentant légal au registre.
      auto: checks.every((check) => check.status === "legal"),
      missing: false,
      note: null,
      view: {
        kind: "facts",
        facts: checks.map(({ label, entreprise, status }): RuleFact => {
          const who = [entreprise.representativeName, entreprise.representativeRole].filter(Boolean).join(", ");
          if (!who) return { label, values: ["signataire à indiquer dans son bloc"], tone: "warn" };
          if (status === "legal") return { label, values: [`${who} · peut signer (représentant légal au registre)`], tone: "ok" };
          if (status === "listed" || status === "unlisted") {
            return { label, values: [`${who} · n'est pas représentant légal : demander une délégation de pouvoir`], tone: "warn" };
          }
          return {
            label,
            values: [`${who} · ${entreprise.isRegistered === false ? "société en création : vérifier dans les statuts" : "pas vérifiable au registre : vérifier sur le Kbis"}`],
            tone: "warn",
          };
        }),
      },
      warnings: [],
      legal: "Pouvoirs du représentant légal (statuts, Kbis)",
      values: checks.map(({ entreprise, status }) => [entreprise.representativeName ?? null, entreprise.representativeRole ?? null, status]),
      editsTerms: false,
    });
  }

  // 7. Propriétaire marié en communauté : le conjoint consent au bail d'un bien commun.
  const ownerPerson = owner?.type === "PERSONNE_PHYSIQUE" ? (owner.persons ?? []).find((p: any) => p.isPrimary) ?? owner.persons?.[0] : null;
  if (ownerPerson && ownerPerson.familyStatus === "MARIE" && ["COMMUNAUTE_REDUITE", "COMMUNAUTE_UNIVERSELLE"].includes(ownerPerson.matrimonialRegime)) {
    const asked = asksBoughtDuringMarriage(ownerPerson.familyStatus, ownerPerson.matrimonialRegime);
    const answer = t.premisesBoughtDuringMarriage;
    const unknown = asked && answer == null;
    const must = spouseMustSign(ownerPerson.familyStatus, ownerPerson.matrimonialRegime, answer === true ? "yes" : answer === false ? "no" : "");
    rules.push({
      id: "conjoint",
      label: "Accord du conjoint",
      // La règle découle du régime et de la réponse du propriétaire.
      auto: true,
      missing: unknown,
      note: unknown ? "À demander au propriétaire : le local a-t-il été acheté pendant le mariage ?" : null,
      view: unknown
        ? null
        : {
            kind: "facts",
            facts: [
              must
                ? { label: "Conjoint", values: ["doit aussi signer le bail (bien acheté pendant le mariage)"], tone: "warn" }
                : { label: "Conjoint", values: ["n'a pas besoin de signer (bien propre du propriétaire)"], tone: "ok" },
            ],
          },
      warnings: [],
      legal: "Article 1425 du Code civil",
      values: [ownerPerson.familyStatus, ownerPerson.matrimonialRegime, answer ?? null],
      editsTerms: true,
    });
  }

  return rules;
}

/** Dépôt de garantie d'un bail commercial : libre, mais au-delà de 2 termes il produit des intérêts. */
export function commercialDepositWarning(input: {
  rentAmount?: number | null;
  securityDeposit?: number | null;
  rentPeriodicity?: string | null;
}): string | null {
  const rent = input.rentAmount ?? 0;
  const deposit = input.securityDeposit ?? 0;
  if (rent <= 0 || deposit <= 0) return null;
  const term = input.rentPeriodicity === "QUARTERLY" ? rent * 3 : rent;
  if (deposit <= term * 2) return null;
  return `Plus de 2 termes de loyer (${euros(term * 2)}) : la part au-delà produit des intérêts au profit du locataire (article L145-40 du Code de commerce).`;
}
