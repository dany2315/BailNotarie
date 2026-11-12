import { 
  ClientType, 
  ProfilType, 
  FamilyStatus, 
  MatrimonialRegime, 
  BienLegalStatus,
  DocumentKind,
} from "@prisma/client";
import {
  getMaritalDocumentKind,
  leaseDocumentRequirements,
  needsSubdivisionRules,
  partyDocumentRequirements,
  propertyDocumentRequirements,
} from "@/lib/rules/dossier-rules";

// Règles réunies dans lib/rules/dossier-rules.ts ; ces fonctions gardent leur forme pour la fiche admin et la complétude.
export { getMaritalDocumentKind, needsSubdivisionRules };

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
    
    // Si marié, le régime matrimonial est requis
    if (familyStatus === FamilyStatus.MARIE && !matrimonialRegime) {
      requiredFields.push("matrimonialRegime");
    }
  } else if (type === ClientType.PERSONNE_MORALE) {
    requiredFields.push("legalName", "registration");
    
  }

  // Pièces : identité et état civil, ou Kbis (société immatriculée) et statuts
  requiredDocuments = partyDocumentRequirements({
    clientType: type,
    persons: type === ClientType.PERSONNE_PHYSIQUE ? [{ familyStatus, matrimonialRegime }] : [],
    entreprise,
  }).map((rule) => rule.kind as DocumentKind);

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
  const requiredDocuments = propertyDocumentRequirements({ legalStatus, subdivisionOver10Years }).map(
    (rule) => rule.kind as DocumentKind,
  );

  return { requiredFields, requiredDocuments };
}

/** Pièce attendue pour un bail donné : où elle se rattache et si elle bloque l'envoi au notaire. */
export interface BailDocumentRule {
  kind: string;
  label?: string;
  required: boolean;
  target: "property" | "bail";
}

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
  return (
    leaseDocumentRequirements(input)
      // « Autres documents » n'est pas une pièce attendue ; le pouvoir de signer suit la société.
      .filter((rule) => rule.kind !== "OTHER" && rule.kind !== "SIGNING_AUTHORITY")
      .map((rule) => ({
        kind: rule.kind,
        // Libellé propre au bail commercial ; la déclaration d'occupation garde le libellé général.
        label: input.bailFamily === "COMMERCIAL" ? rule.label : undefined,
        required: rule.level !== "optional",
        target: rule.target === "bail" ? ("bail" as const) : ("property" as const),
      }))
  );
}
