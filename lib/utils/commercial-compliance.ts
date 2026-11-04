/**
 * Conformité légale d'un bail commercial, pour la fiche dossier de l'équipe.
 * Remplace le plafond de loyer et la relocation en zone tendue, propres au logement.
 * Fonctions pures : la page fournit le bail, ses conditions et les parties.
 */
import {
  CHARGE_ITEMS,
  INDEXATION_LABELS,
  OWNER_ONLY_CHARGES,
  asksBoughtDuringMarriage,
  spouseMustSign,
} from "./commercial-terms";

export interface CommercialRule {
  /** Identifiant stable de la règle (la clé de validation y ajoute les données contrôlées). */
  id: string;
  label: string;
  /** Contrôlée par le logiciel : pas de clic « Valider ». */
  auto: boolean;
  /** Donnée absente ou contraire à la loi : bloque l'envoi au notaire. */
  missing: boolean;
  /** Ce qui manque ou ce qui ne va pas (en rouge). */
  note: string | null;
  /** Ce que l'équipe vérifie, ligne par ligne. */
  lines: string[];
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

function worksLines(value: unknown): string[] {
  const lines = Array.isArray(value) ? value : [];
  return lines.map((line: any) =>
    [line?.label, line?.year ? `(${line.year})` : null, line?.amount != null && line.amount !== "" ? euros(Number(line.amount)) : null]
      .filter(Boolean)
      .join(" "),
  );
}

type Party = { type?: string | null; entreprise?: any; persons?: any[] } | null | undefined;

function partyCompany(party: Party) {
  return party?.type === "PERSONNE_MORALE" ? party.entreprise ?? null : null;
}

export function commercialComplianceRules(input: {
  bail: { bailType?: string | null; rentAmount?: number | null; securityDeposit?: number | null };
  terms: any | null | undefined;
  owner: Party;
  tenant: Party;
}): CommercialRule[] {
  const { bail, terms, owner, tenant } = input;
  const t = terms ?? {};
  const rules: CommercialRule[] = [];

  // 1. Durée : 9 ans au moins (3-6-9), ou 3 ans au plus pour un bail dérogatoire.
  if (bail.bailType === "COMMERCIAL_DEROGATOIRE") {
    const months: number | null = t.derogatoryMonths ?? null;
    const over = months != null && months > 36;
    rules.push({
      id: "duree",
      label: "Durée du bail dérogatoire",
      auto: true,
      missing: months == null || over,
      note:
        months == null
          ? "Durée en mois à saisir"
          : over
            ? `${months} mois : un bail dérogatoire ne peut pas dépasser 36 mois, renouvellements compris`
            : null,
      lines: months != null && !over ? [`${months} mois, soit moins de 3 ans`] : [],
      warnings: [
        "Si le locataire reste plus d'un mois après la fin sans que le propriétaire s'y oppose, le bail devient un bail commercial de 9 ans.",
        ...(t.previouslyLet === true
          ? ["Local déjà loué : si c'était au même locataire en bail dérogatoire, la durée totale ne doit pas dépasser 3 ans."]
          : []),
      ],
      legal: "Article L145-5 du Code de commerce",
      values: [bail.bailType, months],
      editsTerms: true,
    });
  } else {
    rules.push({
      id: "duree",
      label: "Durée du bail",
      auto: true,
      missing: false,
      note: null,
      lines: ["9 ans, résiliable par le locataire à la fin de chaque période de 3 ans"],
      warnings: [],
      legal: "Article L145-4 du Code de commerce",
      values: [bail.bailType],
      editsTerms: false,
    });
  }

  // 2. Inventaire des charges, impôts et taxes, avec leur répartition (loi Pinel).
  const allocation = t.chargesAllocation && typeof t.chargesAllocation === "object" ? (t.chargesAllocation as Record<string, string>) : null;
  const unallocated = CHARGE_ITEMS.filter((item) => !allocation?.[item.key]);
  const byPayer = (payer: string) => CHARGE_ITEMS.filter((item) => allocation?.[item.key] === payer).map((item) => item.label);
  rules.push({
    id: "charges",
    label: "Inventaire des charges, impôts et taxes",
    auto: false,
    missing: unallocated.length > 0,
    note: unallocated.length > 0 ? `Répartition à compléter : ${unallocated.map((item) => item.label.toLowerCase()).join(", ")}` : null,
    lines: allocation
      ? [
          `Locataire : ${byPayer("TENANT").join(", ") || "aucune charge"}`,
          `Propriétaire : ${[...byPayer("OWNER"), ...OWNER_ONLY_CHARGES.map((item) => item.label)].join(", ")}`,
        ]
      : [],
    warnings: [
      "Jamais à la charge du locataire : grosses réparations (article 606 du Code civil), honoraires de gestion des loyers, impôts dont le propriétaire est redevable (sauf taxe foncière et taxe d'ordures ménagères).",
    ],
    legal: "Articles L145-40-2 et R145-35 du Code de commerce",
    values: [allocation ? CHARGE_ITEMS.map((item) => allocation[item.key] ?? null) : null],
    editsTerms: true,
  });

  // 3. État des travaux : réalisés sur les 3 dernières années, prévus sur les 3 prochaines.
  const pastUnknown = t.hasPastWorks == null;
  const plannedUnknown = t.hasPlannedWorks == null;
  rules.push({
    id: "travaux",
    label: "État des travaux (3 ans passés, 3 ans à venir)",
    auto: false,
    missing: pastUnknown || plannedUnknown,
    note:
      pastUnknown || plannedUnknown
        ? `À renseigner : ${[pastUnknown && "travaux des 3 dernières années", plannedUnknown && "travaux prévus dans les 3 ans"].filter(Boolean).join(", ")}`
        : null,
    lines: [
      !pastUnknown ? `Réalisés : ${t.hasPastWorks ? worksLines(t.pastWorks).join(" ; ") || "à détailler" : "aucun"}` : null,
      !plannedUnknown ? `Prévus : ${t.hasPlannedWorks ? worksLines(t.plannedWorks).join(" ; ") || "à détailler" : "aucun"}` : null,
    ].filter((line): line is string => !!line),
    warnings: ["Le coût de chaque travail est indiqué : l'état est annexé au bail, puis remis au locataire tous les 3 ans."],
    legal: "Article L145-40-2 du Code de commerce",
    values: [t.hasPastWorks ?? null, t.hasPlannedWorks ?? null, JSON.stringify(t.pastWorks ?? null), JSON.stringify(t.plannedWorks ?? null)],
    editsTerms: true,
  });

  // 4. Révision du loyer : indice adapté à l'activité.
  rules.push({
    id: "indexation",
    label: "Révision du loyer",
    auto: false,
    missing: !t.indexation,
    note: !t.indexation ? "Indice de révision à choisir" : null,
    lines: t.indexation ? [INDEXATION_LABELS[t.indexation] || t.indexation] : [],
    warnings: [
      "ILC pour une activité commerciale ou artisanale, ILAT pour une activité tertiaire (bureaux, professions libérales). Une clause qui ne joue qu'à la hausse est réputée non écrite.",
    ],
    legal: "Articles L145-34, L145-38 et L145-39 du Code de commerce ; L112-2 du Code monétaire et financier",
    values: [t.indexation ?? null, t.activity ?? null],
    editsTerms: true,
  });

  // 5. Locataire immatriculé : condition du statut des baux commerciaux (droit au renouvellement).
  if (tenant) {
    const company = partyCompany(tenant);
    const lines: string[] = [];
    const warnings: string[] = [];
    if (company?.isRegistered === false) {
      lines.push("Société en cours de création");
      warnings.push(
        "Le bail est signé au nom de la société en formation, qui le reprend à son immatriculation. Kbis à demander dès qu'il est disponible.",
      );
    } else if (company) {
      lines.push(`Société immatriculée${company.registration ? ` · n° ${company.registration}` : ""}`);
    } else {
      lines.push("Particulier");
      warnings.push("Vérifiez qu'il est inscrit au registre du commerce ou au répertoire des métiers pour l'activité exercée dans le local.");
    }
    rules.push({
      id: "immatriculation",
      label: "Immatriculation du locataire",
      auto: false,
      missing: false,
      note: null,
      lines,
      warnings,
      legal: "Article L145-1 du Code de commerce (statut des baux commerciaux) ; L210-6 pour une société en formation",
      values: [tenant.type ?? null, company?.isRegistered ?? null, company?.registration ?? null],
      editsTerms: false,
    });
  }

  // 6. Pouvoirs des signataires des sociétés (saisis dans le bloc de chaque partie).
  const companies = [
    { label: "Propriétaire", entreprise: partyCompany(owner) },
    { label: "Locataire", entreprise: partyCompany(tenant) },
  ].filter((entry) => entry.entreprise);
  if (companies.length > 0) {
    rules.push({
      id: "signataires",
      label: "Pouvoirs des signataires",
      auto: false,
      missing: false,
      note: null,
      lines: companies.map(({ label, entreprise }) => {
        const who = [entreprise.representativeName, entreprise.representativeRole].filter(Boolean).join(", ");
        return `${label} : ${who || "représentant à indiquer dans son bloc"}`;
      }),
      warnings: ["Si le signataire n'est pas le représentant légal inscrit au registre, une délégation de pouvoirs est jointe au dossier."],
      legal: "Pouvoirs du représentant légal (statuts, Kbis)",
      values: companies.map(({ entreprise }) => [entreprise.representativeName ?? null, entreprise.representativeRole ?? null]),
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
      auto: false,
      missing: unknown,
      note: unknown ? "À demander au propriétaire : le local a-t-il été acheté pendant le mariage ?" : null,
      lines: unknown ? [] : [must ? "Bien commun : le conjoint signe aussi le bail" : "Bien propre : l'accord du conjoint n'est pas nécessaire"],
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
