import { prisma } from "@/lib/prisma";
import { 
  ClientType, 
  ProfilType, 
  FamilyStatus, 
  MatrimonialRegime, 
  BienLegalStatus,
  CompletionStatus,
  DocumentKind,
  NotificationType,
  BailStatus
} from "@prisma/client";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";

/**
 * Détermine les champs de données requis pour un client selon son type et profil
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
    requiredDocuments.push(DocumentKind.BIRTH_CERT, DocumentKind.ID_IDENTITY);
    
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
    requiredFields.push("legalName", "registration", "nationality");
    
    // Documents requis pour personne morale
    requiredDocuments.push(DocumentKind.KBIS, DocumentKind.STATUTES);
  }

  // Champs communs selon le profil
  if (profilType === ProfilType.PROPRIETAIRE) {
    requiredFields.push("phone", "fullAddress")
  } else if (profilType === ProfilType.LOCATAIRE) {
    requiredFields.push("phone", "fullAddress");
    requiredDocuments.push(DocumentKind.INSURANCE, DocumentKind.RIB);
  }else if (profilType === ProfilType.LEAD) {
    requiredFields = [];
    requiredDocuments = [];
  }

  return { requiredFields, requiredDocuments };
}

/**
 * Détermine les champs de données requis pour un bien selon son statut légal
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

/**
 * Vérifie si un client a toutes les données requises
 */
export async function checkClientCompletion(clientId: string): Promise<{
  hasAllFields: boolean;
  hasAllDocuments: boolean;
  missingFields: string[];
  missingDocuments: DocumentKind[];
}> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      persons: {
        include: {
          documents: true,
        },
      },
      entreprise: {
        include: {
          documents: true,
        },
      },
    },
  });

  if (!client) {
    return {
      hasAllFields: false,
      hasAllDocuments: false,
      missingFields: [],
      missingDocuments: [],
    };
  }

  // Récupérer la personne principale ou l'entreprise pour obtenir familyStatus et matrimonialRegime
  const primaryPerson = client.persons?.find((p) => p.isPrimary);
  const entreprise = client.entreprise;
  
  // Récupérer familyStatus et matrimonialRegime depuis la personne principale
  const familyStatus = primaryPerson?.familyStatus || null;
  const matrimonialRegime = primaryPerson?.matrimonialRegime || null;

  const { requiredFields, requiredDocuments } = getRequiredClientFields(
    client.type,
    client.profilType,
    familyStatus,
    matrimonialRegime
  );

  // Agréger tous les documents depuis persons et entreprise
  const allDocuments: any[] = [];
  // Documents des personnes
  if (client.persons) {
    for (const person of client.persons) {
      if (person.documents) {
        allDocuments.push(...person.documents);
      }
    }
  }
  // Documents de l'entreprise
  if (client.entreprise?.documents) {
    allDocuments.push(...client.entreprise.documents);
  }
  // Documents du client (livret de famille, contrat PACS)
  if (client.documents) {
    allDocuments.push(...client.documents);
  }

  // Vérifier les champs requis
  const missingFields: string[] = [];
  for (const field of requiredFields) {
    let value: any = null;
    
    // Les champs sont dans Person ou Entreprise selon le type
    if (client.type === ClientType.PERSONNE_PHYSIQUE && primaryPerson) {
      value = (primaryPerson as any)[field];
    } else if (client.type === ClientType.PERSONNE_MORALE && entreprise) {
      value = (entreprise as any)[field];
    }
    
    if (!value || (typeof value === "string" && value.trim() === "")) {
      missingFields.push(field);
    }
  }

  // Vérifier les documents requis
  // Pour PERSONNE_PHYSIQUE: BIRTH_CERT et ID_IDENTITY requis pour CHAQUE personne
  // Pour PERSONNE_MORALE: KBIS et STATUTES requis pour l'entreprise
  // LIVRET_DE_FAMILLE et CONTRAT_DE_PACS requis au niveau client (une seule fois)
  const missingDocuments: DocumentKind[] = [];
  
  if (client.type === ClientType.PERSONNE_PHYSIQUE) {
    // Vérifier que chaque personne a BIRTH_CERT et ID_IDENTITY
    for (const person of client.persons || []) {
      const personDocKinds = (person.documents || []).map((d: any) => d.kind);
      if (!personDocKinds.includes(DocumentKind.BIRTH_CERT)) {
        missingDocuments.push(DocumentKind.BIRTH_CERT);
      }
      if (!personDocKinds.includes(DocumentKind.ID_IDENTITY)) {
        missingDocuments.push(DocumentKind.ID_IDENTITY);
      }
    }
    
    // Vérifier les documents client (livret de famille, PACS)
    const clientDocKinds = (client.documents || []).map((d: any) => d.kind);
    if (familyStatus === FamilyStatus.MARIE && !clientDocKinds.includes(DocumentKind.LIVRET_DE_FAMILLE)) {
      missingDocuments.push(DocumentKind.LIVRET_DE_FAMILLE);
    }
    if (familyStatus === FamilyStatus.PACS && !clientDocKinds.includes(DocumentKind.CONTRAT_DE_PACS)) {
      missingDocuments.push(DocumentKind.CONTRAT_DE_PACS);
    }
  } else if (client.type === ClientType.PERSONNE_MORALE && entreprise) {
    // Vérifier les documents entreprise
    const entrepriseDocKinds = (entreprise.documents || []).map((d: any) => d.kind);
    if (!entrepriseDocKinds.includes(DocumentKind.KBIS)) {
      missingDocuments.push(DocumentKind.KBIS);
    }
    if (!entrepriseDocKinds.includes(DocumentKind.STATUTES)) {
      missingDocuments.push(DocumentKind.STATUTES);
    }
  }
  
  // Vérifier les autres documents requis (assurance, RIB pour locataire)
  const allDocKinds = allDocuments.map((doc) => doc.kind);
  const otherRequiredDocs = requiredDocuments.filter(
    (kind) => kind !== DocumentKind.BIRTH_CERT && 
              kind !== DocumentKind.ID_IDENTITY && 
              kind !== DocumentKind.KBIS && 
              kind !== DocumentKind.STATUTES &&
              kind !== DocumentKind.LIVRET_DE_FAMILLE &&
              kind !== DocumentKind.CONTRAT_DE_PACS
  );
  for (const kind of otherRequiredDocs) {
    if (!allDocKinds.includes(kind)) {
      missingDocuments.push(kind);
    }
  }

  return {
    hasAllFields: missingFields.length === 0,
    hasAllDocuments: missingDocuments.length === 0,
    missingFields,
    missingDocuments,
  };
}

/**
 * Vérifie si un bien a toutes les données requises
 */
export async function checkPropertyCompletion(propertyId: string): Promise<{
  hasAllFields: boolean;
  hasAllDocuments: boolean;
  missingFields: string[];
  missingDocuments: DocumentKind[];
}> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      documents: true,
    },
  });

  if (!property) {
    return {
      hasAllFields: false,
      hasAllDocuments: false,
      missingFields: [],
      missingDocuments: [],
    };
  }

  const { requiredFields, requiredDocuments } = getRequiredPropertyFields(
    property.legalStatus
  );

  // Vérifier les champs requis
  const missingFields: string[] = [];
  for (const field of requiredFields) {
    const value = (property as any)[field];
    if (!value || (typeof value === "string" && value.trim() === "")) {
      missingFields.push(field);
    }
  }

  // Vérifier les documents requis
  const propertyDocumentKinds = property.documents.map((doc) => doc.kind);
  const missingDocuments = requiredDocuments.filter(
    (kind) => !propertyDocumentKinds.includes(kind)
  );

  return {
    hasAllFields: missingFields.length === 0,
    hasAllDocuments: missingDocuments.length === 0,
    missingFields,
    missingDocuments,
  };
}

/**
 * Calcule le statut de complétion d'un client
 */
export async function calculateClientCompletionStatus(
  clientId: string
): Promise<CompletionStatus> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    return CompletionStatus.NOT_STARTED;
  }

  // Si le statut est COMPLETED, on ne le change pas automatiquement
  if (client.completionStatus === CompletionStatus.COMPLETED) {
    return CompletionStatus.COMPLETED;
  }
  
  // Si le statut est PENDING_CHECK, on ne le change pas automatiquement
  // (le client a soumis son formulaire et attend une vérification)
  if (client.completionStatus === CompletionStatus.PENDING_CHECK) {
    return CompletionStatus.PENDING_CHECK;
  }

  const completion = await checkClientCompletion(clientId);

  // Vérifier s'il y a au moins une donnée
  const hasAnyData = 
    client.firstName ||
    client.lastName ||
    client.legalName ||
    client.email ||
    client.phone ||
    client.fullAddress ||
    client.nationality ||
    client.birthDate ||
    client.birthPlace ||
    client.familyStatus ||
    client.matrimonialRegime ||
    client.profession;

  // Vérifier s'il y a au moins un document
  const hasAnyDocument = completion.missingDocuments.length < 
    getRequiredClientFields(
      client.type,
      client.profilType,
      client.familyStatus,
      client.matrimonialRegime
    ).requiredDocuments.length;

  // Si aucune donnée n'a été ajoutée
  if (!hasAnyData && !hasAnyDocument) {
    return CompletionStatus.NOT_STARTED;
  }

  // Si toutes les données et documents sont présents
  if (completion.hasAllFields && completion.hasAllDocuments) {
    return CompletionStatus.PENDING_CHECK;
  }

  // Sinon, c'est partiel
  return CompletionStatus.PARTIAL;
}

/**
 * Calcule le statut de complétion d'un bien
 */
export async function calculatePropertyCompletionStatus(
  propertyId: string
): Promise<CompletionStatus> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) {
    return CompletionStatus.NOT_STARTED;
  }

  // Si le statut est COMPLETED, on ne le change pas automatiquement
  if (property.completionStatus === CompletionStatus.COMPLETED) {
    return CompletionStatus.COMPLETED;
  }

  const completion = await checkPropertyCompletion(propertyId);

  // Vérifier s'il y a au moins une donnée
  const hasAnyData = 
    property.fullAddress ||
    property.label ||
    property.surfaceM2 ||
    property.type ||
    property.legalStatus;

  // Vérifier s'il y a au moins un document
  const hasAnyDocument = completion.missingDocuments.length < 
    getRequiredPropertyFields(property.legalStatus).requiredDocuments.length;

  // Si aucune donnée n'a été ajoutée
  if (!hasAnyData && !hasAnyDocument) {
    return CompletionStatus.NOT_STARTED;
  }

  // Si toutes les données et documents sont présents
  if (completion.hasAllFields && completion.hasAllDocuments) {
    return CompletionStatus.PENDING_CHECK;
  }

  // Sinon, c'est partiel
  return CompletionStatus.PARTIAL;
}

/**
 * Vérifie et met à jour le statut des baux lorsque tous les statuts de complétion sont COMPLETED
 * (propriétaire, locataire et bien)
 */
async function checkAndUpdateBailStatusForClient(clientId: string): Promise<void> {
  // Récupérer tous les baux où ce client est une partie
  const bails = await prisma.bail.findMany({
    where: {
      parties: {
        some: { id: clientId }
      },
      status: BailStatus.DRAFT
    },
    include: {
      property: {
        include: {
          owner: true
        }
      },
      parties: true
    }
  });

  for (const bail of bails) {
    await checkAndUpdateBailStatus(bail);
  }
}

/**
 * Vérifie et met à jour le statut des baux pour un bien
 */
async function checkAndUpdateBailStatusForProperty(propertyId: string): Promise<void> {
  // Récupérer tous les baux de ce bien
  const bails = await prisma.bail.findMany({
    where: {
      propertyId,
      status: BailStatus.DRAFT
    },
    include: {
      property: {
        include: {
          owner: true
        }
      },
      parties: true
    }
  });

  for (const bail of bails) {
    await checkAndUpdateBailStatus(bail);
  }
}

/**
 * Vérifie si tous les statuts de complétion sont COMPLETED et met à jour le bail
 */
async function checkAndUpdateBailStatus(bail: any): Promise<void> {
  const owner = bail.parties.find((p: any) => p.profilType === ProfilType.PROPRIETAIRE);
  const tenant = bail.parties.find((p: any) => p.profilType === ProfilType.LOCATAIRE);
  const property = bail.property;

  // Vérifier que propriétaire, locataire et bien existent
  if (!owner || !tenant || !property) {
    return;
  }

  // Vérifier que tous les statuts de complétion sont COMPLETED
  const ownerCompleted = owner.completionStatus === CompletionStatus.COMPLETED;
  const tenantCompleted = tenant.completionStatus === CompletionStatus.COMPLETED;
  const propertyCompleted = property.completionStatus === CompletionStatus.COMPLETED;

  // Si tous sont COMPLETED et le bail est en DRAFT, passer à PENDING_VALIDATION
  if (ownerCompleted && tenantCompleted && propertyCompleted && bail.status === BailStatus.DRAFT) {
    await prisma.bail.update({
      where: { id: bail.id },
      data: { status: BailStatus.PENDING_VALIDATION }
    });

    // Notification pour le changement de statut du bail (notifier tous les utilisateurs)
    await createNotificationForAllUsers(
      NotificationType.BAIL_STATUS_CHANGED,
      "BAIL",
      bail.id,
      null, // Changement automatique via intake, notifier tous les utilisateurs
      {
        oldStatus: BailStatus.DRAFT,
        newStatus: BailStatus.PENDING_VALIDATION,
      }
    );
  }
}

/**
 * Met à jour le statut de complétion d'un client
 */
export async function updateClientCompletionStatus(clientId: string): Promise<void> {
  // Récupérer l'ancien statut
  const oldClient = await prisma.client.findUnique({ where: { id: clientId } });
  const oldStatus = oldClient?.completionStatus;
  
  const newStatus = await calculateClientCompletionStatus(clientId);
  
  await prisma.client.update({
    where: { id: clientId },
    data: { completionStatus: newStatus },
  });

  // Notification uniquement si le statut devient COMPLETED (via intake, notifier tous les utilisateurs)
  // Pas de notification pour PARTIAL -> PENDING_CHECK car déjà notifié lors de la soumission du formulaire
  if (oldStatus !== newStatus && newStatus === CompletionStatus.COMPLETED) {
    await createNotificationForAllUsers(
      NotificationType.COMPLETION_STATUS_CHANGED,
      "CLIENT",
      clientId,
      null, // Modifié via formulaire intake, notifier tous les utilisateurs
      { 
        oldStatus,
        newStatus,
        entityType: "CLIENT"
      }
    );
  }

  // Vérifier et mettre à jour les baux si nécessaire
  await checkAndUpdateBailStatusForClient(clientId);
}

/**
 * Met à jour le statut de complétion d'un bien
 */
export async function updatePropertyCompletionStatus(propertyId: string): Promise<void> {
  // Récupérer l'ancien statut
  const oldProperty = await prisma.property.findUnique({ where: { id: propertyId } });
  const oldStatus = oldProperty?.completionStatus;
  
  const newStatus = await calculatePropertyCompletionStatus(propertyId);
  
  await prisma.property.update({
    where: { id: propertyId },
    data: { completionStatus: newStatus },
  });

  // Notification uniquement si le statut devient COMPLETED (via intake, notifier tous les utilisateurs)
  // Pas de notification pour PARTIAL -> PENDING_CHECK car déjà notifié lors de la soumission du formulaire
  if (oldStatus !== newStatus && newStatus === CompletionStatus.COMPLETED) {
    await createNotificationForAllUsers(
      NotificationType.COMPLETION_STATUS_CHANGED,
      "PROPERTY",
      propertyId,
      null, // Modifié via formulaire intake, notifier tous les utilisateurs
      { 
        oldStatus,
        newStatus,
        entityType: "PROPERTY"
      }
    );
  }

  // Vérifier et mettre à jour les baux si nécessaire
  await checkAndUpdateBailStatusForProperty(propertyId);
}

