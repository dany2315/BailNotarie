/**
 * Registre des entreprises : fonctions pures partagées entre le formulaire
 * (contrôle du numéro avant recherche) et le serveur (recherche, enregistrement).
 */

/** Représentant légal retenu dans le registre (gérant, président, directeur général…). */
export type RegistryRepresentative = {
  name: string;
  role: string | null;
  /** Représentant personne morale (ex. holding présidente d'une SAS). */
  isCompany: boolean;
  /** Représentant légal selon la forme juridique (gérant, président de SAS, directeur général de SA…). */
  isLegalRepresentative: boolean;
};

/** Société telle que renvoyée par le registre, réduite à ce qui sert au dossier. */
export type RegistryCompany = {
  siren: string;
  /** SIRET du siège social. */
  siret: string | null;
  legalName: string;
  tradeName: string | null;
  legalFormCode: string | null;
  legalFormLabel: string | null;
  nafCode: string | null;
  /** Adresse du siège social (absente en diffusion partielle). */
  headOfficeAddress: string | null;
  creationDate: string | null;
  isActive: boolean;
  /** Diffusion partielle : adresse et noms des dirigeants masqués. */
  partialDiffusion: boolean;
  /** Entreprise individuelle : ce n'est pas une personne morale. */
  isIndividual: boolean;
  /** Un liquidateur figure parmi les dirigeants. */
  inLiquidation: boolean;
  representatives: RegistryRepresentative[];
};

export type CompanyLookupResult =
  | { found: true; company: RegistryCompany }
  | { found: false; reason: "invalid" | "not_found" | "unavailable" };

/** Ne garde que les chiffres (espaces, points et tirets acceptés à la saisie). */
export function normalizeRegistrationNumber(input: string | null | undefined): string {
  return String(input ?? "").replace(/\D/g, "");
}

function luhnSum(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum;
}

export function isValidSiren(siren: string): boolean {
  return /^\d{9}$/.test(siren) && luhnSum(siren) % 10 === 0;
}

export function isValidSiret(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  // Les établissements de La Poste ne respectent pas la clé de Luhn
  if (siret.startsWith("356000000")) {
    return [...siret].reduce((acc, d) => acc + Number(d), 0) % 5 === 0;
  }
  return luhnSum(siret) % 10 === 0;
}

/** SIREN (9 chiffres) déduit d'un SIREN ou d'un SIRET valide, sinon null. */
export function sirenFromRegistration(input: string | null | undefined): string | null {
  const digits = normalizeRegistrationNumber(input);
  if (digits.length === 9 && isValidSiren(digits)) return digits;
  if (digits.length === 14 && isValidSiret(digits)) return digits.slice(0, 9);
  return null;
}

/** SIRET saisi s'il est valide, sinon null. */
export function siretFromRegistration(input: string | null | undefined): string | null {
  const digits = normalizeRegistrationNumber(input);
  return digits.length === 14 && isValidSiret(digits) ? digits : null;
}

/** « 443855085 » → « 443 855 085 », « 44385508500017 » → « 443 855 085 00017 ». */
export function formatRegistrationNumber(input: string | null | undefined): string {
  const digits = normalizeRegistrationNumber(input);
  if (digits.length === 9) return digits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  if (digits.length === 14) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4");
  return String(input ?? "");
}

// Catégories juridiques INSEE les plus courantes (niveau III)
const LEGAL_FORM_LABELS: Record<string, string> = {
  "1000": "Entrepreneur individuel",
  "5202": "Société en nom collectif",
  "5410": "SARL nationale",
  "5485": "Société d'exercice libéral à responsabilité limitée (SELARL)",
  "5498": "SARL unipersonnelle (EURL)",
  "5499": "Société à responsabilité limitée (SARL)",
  "5599": "SA à conseil d'administration",
  "5699": "SA à directoire",
  "5710": "Société par actions simplifiée (SAS)",
  "5720": "Société par actions simplifiée unipersonnelle (SASU)",
  "5785": "Société d'exercice libéral par actions simplifiée (SELAS)",
  "6220": "Groupement d'intérêt économique (GIE)",
  "6540": "Société civile immobilière (SCI)",
  "6541": "SCI de construction-vente",
  "6589": "Société civile de moyens",
  "6598": "Exploitation agricole à responsabilité limitée (EARL)",
  "6599": "Société civile",
  "9220": "Association déclarée",
};

// Repli par famille quand le code exact n'est pas dans la table
const LEGAL_FORM_FAMILIES: [string, string][] = [
  ["54", "Société à responsabilité limitée"],
  ["55", "Société anonyme"],
  ["56", "Société anonyme"],
  ["57", "Société par actions simplifiée"],
  ["65", "Société civile"],
  ["92", "Association"],
];

const comparable = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

type EntrepriseRegistryView = {
  legalName?: string | null;
  fullAddress?: string | null;
  representativeName?: string | null;
  registrySource?: string | null;
  registryCheckedAt?: Date | string | null;
  registrySnapshot?: unknown;
};

/**
 * Points d'attention pour l'équipe : vérification au registre, société fermée
 * ou en liquidation, et écarts entre la saisie du client et le registre.
 */
export function registryNotes(entreprise: EntrepriseRegistryView): string[] {
  if (!entreprise.registrySource) return [];
  if (entreprise.registrySource === "MANUAL" || !entreprise.registryCheckedAt) {
    return ["Saisie manuelle, non vérifiée au registre"];
  }
  const day = new Date(entreprise.registryCheckedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  const notes = [`Vérifiée au registre le ${day}`];
  const snapshot = entreprise.registrySnapshot as Partial<RegistryCompany> | null | undefined;
  if (!snapshot) return notes;
  if (snapshot.isActive === false) notes.push("⚠ Société fermée au registre");
  if (snapshot.inLiquidation) notes.push("⚠ Un liquidateur figure parmi les dirigeants");
  if (snapshot.partialDiffusion) notes.push("Diffusion partielle : adresse et dirigeants masqués au registre");
  if (snapshot.legalName && comparable(snapshot.legalName) !== comparable(entreprise.legalName)) {
    notes.push(`Raison sociale modifiée par le client (registre : ${snapshot.legalName})`);
  }
  if (snapshot.headOfficeAddress && comparable(snapshot.headOfficeAddress) !== comparable(entreprise.fullAddress)) {
    notes.push(`Adresse différente du siège au registre (${snapshot.headOfficeAddress})`);
  }
  const representative = comparable(entreprise.representativeName);
  if (representative && !(snapshot.representatives ?? []).some((r) => comparable(r.name) === representative)) {
    notes.push("Représentant non listé parmi les dirigeants au registre");
  }
  return notes;
}

export function legalFormLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  if (LEGAL_FORM_LABELS[code]) return LEGAL_FORM_LABELS[code];
  const family = LEGAL_FORM_FAMILIES.find(([prefix]) => code.startsWith(prefix));
  return family ? family[1] : `Forme juridique (code ${code})`;
}
