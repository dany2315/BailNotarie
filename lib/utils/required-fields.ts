import { 
  ClientType, 
  ProfilType, 
  FamilyStatus, 
  MatrimonialRegime, 
  BienLegalStatus,
  DocumentKind,
} from "@prisma/client";

/**
 * Détermine les champs de données requis pour un client selon son type et profil
 * Fonction pure utilisable côté client
 */
export function getRequiredClientFields(
  type: ClientType,
  profilType: ProfilType,
  familyStatus?: FamilyStatus | null,
  matrimonialRegime?: MatrimonialRegime | null
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
    requiredFields.push("firstName", "lastName", "nationality", "birthDate", "birthPlace");
    
    // Documents requis pour personne physique
    requiredDocuments.push(DocumentKind.ID_IDENTITY);
    
    // Documents conditionnels selon le statut familial
    if (familyStatus === FamilyStatus.MARIE) {
      requiredDocuments.push(DocumentKind.LIVRET_DE_FAMILLE);
      // Si marié, le régime matrimonial est requis
      if (!matrimonialRegime) {
        requiredFields.push("matrimonialRegime");
      }
    } else if (familyStatus === FamilyStatus.PACS) {
      requiredDocuments.push(DocumentKind.CONTRAT_DE_PACS);
    }
    
    // Si le statut familial nécessite un régime matrimonial
    if (familyStatus === FamilyStatus.MARIE && !matrimonialRegime) {
      requiredFields.push("matrimonialRegime");
    }
  } else if (type === ClientType.PERSONNE_MORALE) {
    requiredFields.push("legalName", "registration");
    
    // Documents requis pour personne morale
    requiredDocuments.push(DocumentKind.KBIS, DocumentKind.STATUTES);
  }

  // Champs communs selon le profil
  if (profilType === ProfilType.PROPRIETAIRE) {
    requiredFields.push("phone", "fullAddress");
    // Ne pas ajouter INSURANCE et RIB ici car ils sont attachés au Property (bien)
  } else if (profilType === ProfilType.LOCATAIRE) {
    requiredFields.push("phone", "fullAddress");
    // Pour les locataires, INSURANCE et RIB sont attachés au Client
    requiredDocuments.push(DocumentKind.INSURANCE, DocumentKind.RIB);
  } else if (profilType === ProfilType.LEAD) {
    requiredFields = [];
    requiredDocuments = [];
  }

  return { requiredFields, requiredDocuments };
}

/**
 * Détermine les champs de données requis pour un bien selon son statut légal
 * Fonction pure utilisable côté client
 */
export function getRequiredPropertyFields(
  legalStatus?: BienLegalStatus | null
): {
  requiredFields: string[];
  requiredDocuments: DocumentKind[];
} {
  const requiredFields: string[] = ["fullAddress"];
  const requiredDocuments: DocumentKind[] = [
    DocumentKind.DIAGNOSTICS,
    DocumentKind.TITLE_DEED,
    // Documents du propriétaire attachés au Property (bien)
    DocumentKind.INSURANCE,
    DocumentKind.RIB,
  ];

  // Documents conditionnels selon le statut légal
  if (legalStatus === BienLegalStatus.CO_PROPRIETE) {
    requiredDocuments.push(DocumentKind.REGLEMENT_COPROPRIETE);
  } else if (legalStatus === BienLegalStatus.LOTISSEMENT) {
    requiredDocuments.push(DocumentKind.CAHIER_DE_CHARGE_LOTISSEMENT);
    requiredDocuments.push(DocumentKind.STATUT_DE_LASSOCIATION_SYNDICALE);
  }

  return { requiredFields, requiredDocuments };
}











