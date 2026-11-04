import { 
  ClientType, 
  ProfilType, 
  FamilyStatus, 
  MatrimonialRegime, 
  BienLegalStatus,
  DocumentKind,
} from "@prisma/client";
import { commercialDocuments } from "./commercial-terms";

/**
 * Pièce d'état civil attendue par le notaire : la convention de PACS, ou le
 * contrat de mariage quand le régime n'est pas la communauté légale (mariage
 * sans contrat : rien à fournir, l'étude demande l'extrait d'acte de mariage).
 */
export function getMaritalDocumentKind(
  familyStatus?: FamilyStatus | null,
  matrimonialRegime?: MatrimonialRegime | null
): DocumentKind | null {
  if (familyStatus === FamilyStatus.PACS) return DocumentKind.CONTRAT_DE_PACS;
  if (
    familyStatus === FamilyStatus.MARIE &&
    matrimonialRegime &&
    matrimonialRegime !== MatrimonialRegime.COMMUNAUTE_REDUITE
  ) {
    return DocumentKind.CONTRAT_DE_MARIAGE;
  }
  return null;
}

/** Pièces d'état civil rattachées au client (et non à une personne). */
export const MARITAL_DOCUMENT_KINDS: DocumentKind[] = [
  DocumentKind.LIVRET_DE_FAMILLE,
  DocumentKind.CONTRAT_DE_PACS,
  DocumentKind.CONTRAT_DE_MARIAGE,
];

/**
 * Détermine les champs de données requis pour un client selon son type et profil
 * Fonction pure utilisable côté client
 */
export function getRequiredClientFields(
  type: ClientType,
  profilType: ProfilType,
  familyStatus?: FamilyStatus | null,
  matrimonialRegime?: MatrimonialRegime | null,
  entreprise?: { isRegistered?: boolean | null } | null
): {
  requiredFields: string[];
  requiredDocuments: DocumentKind[];
} {
  let requiredFields: string[] = [];
  let requiredDocuments: DocumentKind[] = [];

  // Champs communs à tous les clients
  requiredFields.push("email");
  
  // Champs spécifiques selon le type
  if (type === ClientType.PERSONNE_PHYSIQUE) {
    requiredFields.push("firstName", "lastName", "nationality", "birthDate", "birthPlace", "familyStatus");
    
    // Documents requis pour personne physique
    requiredDocuments.push(DocumentKind.ID_IDENTITY);
    
    // Contrat de mariage (hors communauté légale) ou convention de PACS
    const maritalDocument = getMaritalDocumentKind(familyStatus, matrimonialRegime);
    if (maritalDocument) {
      requiredDocuments.push(maritalDocument);
    }

    // Si marié, le régime matrimonial est requis
    if (familyStatus === FamilyStatus.MARIE && !matrimonialRegime) {
      requiredFields.push("matrimonialRegime");
    }
  } else if (type === ClientType.PERSONNE_MORALE) {
    requiredFields.push("legalName", "registration");
    
    // Documents requis pour personne morale
    // Société pas encore immatriculée : pas de Kbis, les statuts suffisent
    if (entreprise?.isRegistered !== false) requiredDocuments.push(DocumentKind.KBIS);
    requiredDocuments.push(DocumentKind.STATUTES);
  }

  // Champs communs selon le profil (l'assurance et le RIB ne sont plus demandés)
  if (profilType === ProfilType.PROPRIETAIRE || profilType === ProfilType.LOCATAIRE) {
    requiredFields.push("phone", "fullAddress");
  } else if (profilType === ProfilType.LEAD) {
    requiredFields = [];
    requiredDocuments = [];
  }

  // Dédoublonnage : « matrimonialRegime » pouvait être ajouté deux fois
  // (marié sans régime), ce qui comptait un manque en double.
  return { requiredFields: Array.from(new Set(requiredFields)), requiredDocuments: Array.from(new Set(requiredDocuments)) };
}

/**
 * Le règlement d'un lotissement ne s'applique plus 10 ans après son
 * autorisation : il n'est demandé que si le lotissement est plus récent,
 * ou par prudence quand le propriétaire ne sait pas (ou n'a pas répondu).
 */
export function needsSubdivisionRules(subdivisionOver10Years?: string | null): boolean {
  return subdivisionOver10Years !== "YES";
}

/**
 * Détermine les champs de données requis pour un bien selon son statut légal
 * Fonction pure utilisable côté client
 */
export function getRequiredPropertyFields(
  legalStatus?: BienLegalStatus | null,
  subdivisionOver10Years?: string | null
): {
  requiredFields: string[];
  requiredDocuments: DocumentKind[];
} {
  const requiredFields: string[] = ["fullAddress"];
  const requiredDocuments: DocumentKind[] = [
    DocumentKind.DIAGNOSTICS,
    DocumentKind.TITLE_DEED,
  ];

  // Documents conditionnels selon le statut légal
  if (legalStatus === BienLegalStatus.CO_PROPRIETE) {
    requiredDocuments.push(DocumentKind.REGLEMENT_COPROPRIETE);
  } else if (legalStatus === BienLegalStatus.LOTISSEMENT && needsSubdivisionRules(subdivisionOver10Years)) {
    // Règlement du lotissement (type historique « cahier des charges »)
    requiredDocuments.push(DocumentKind.CAHIER_DE_CHARGE_LOTISSEMENT);
  }

  return { requiredFields, requiredDocuments };
}

/** Pièce attendue pour un bail donné : où elle se rattache et si elle bloque l'envoi au notaire. */
export interface BailDocumentRule {
  kind: string;
  label?: string;
  required: boolean;
  target: "property" | "bail";
}

/** Pièces du bail commercial rattachées au bail (location précédente) ; les autres vont au bien. */
const BAIL_TARGET_KINDS = new Set(["PREVIOUS_LEASE", "LEASE_TERMINATION", "PREVIOUS_TENANT_EXIT_PROOF"]);

/**
 * Pièces qui dépendent du bail et pas seulement du bien : celles du bail commercial (selon les
 * réponses du propriétaire), et la déclaration d'occupation dans une ville à loyers encadrés.
 * Les mêmes règles que le formulaire, pour la fiche de l'équipe et le calcul des manques.
 */
export function getBailDocumentRules(input: {
  bailFamily?: string | null;
  property?: {
    legalStatus?: string | null;
    inShoppingCenter?: boolean | null;
    complexType?: string | null;
    surfaceM2?: number | string | { toString(): string } | null;
    type?: string | null;
  } | null;
  previouslyLet?: boolean | null;
  occupancyDeclarationRequired?: boolean;
}): BailDocumentRule[] {
  if (input.bailFamily === "COMMERCIAL") {
    const surface = input.property?.surfaceM2 != null ? Number(input.property.surfaceM2.toString()) : null;
    return commercialDocuments({
      previouslyLet: input.previouslyLet === true ? "yes" : input.previouslyLet === false ? "no" : "",
      legalStatus: input.property?.legalStatus,
      inShoppingCenter: input.property?.inShoppingCenter,
      complexType: input.property?.complexType,
      surfaceM2: Number.isFinite(surface) ? surface : null,
      premisesType: input.property?.type,
    })
      // « Autres documents » n'est pas une pièce attendue ; le pouvoir de signer suit la société.
      .filter((rule) => rule.kind !== "OTHER" && rule.kind !== "SIGNING_AUTHORITY")
      .map((rule) => ({ kind: rule.kind, label: rule.label, required: rule.required, target: BAIL_TARGET_KINDS.has(rule.kind) ? "bail" : "property" }));
  }
  if (input.occupancyDeclarationRequired) {
    return [{ kind: DocumentKind.OCCUPANCY_DECLARATION, required: true, target: "property" }];
  }
  return [];
}
