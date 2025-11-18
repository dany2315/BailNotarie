"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { DocumentKind } from "@prisma/client";
import { put } from "@vercel/blob";
import { 
  updateClientCompletionStatus as calculateAndUpdateClientStatus, 
  updatePropertyCompletionStatus as calculateAndUpdatePropertyStatus 
} from "@/lib/utils/completion-status";

export async function getSignedUrl(kind: string, fileName: string, mimeType: string) {
  await requireAuth();
  
  // Stub: retourner une URL signée simulée
  // TODO: Implémenter avec votre service S3/GCS
  const fileKey = `documents/${Date.now()}-${fileName}`;
  const uploadUrl = `/api/upload?key=${fileKey}&mimeType=${mimeType}`;
  
  return {
    uploadUrl,
    fileKey,
  };
}

export async function createDocument(data: {
  kind: string;
  label?: string;
  fileKey: string;
  mimeType?: string;
  size?: number;
  clientId?: string;
  propertyId?: string;
  bailId?: string;
}) {
  const user = await requireAuth();

  const document = await prisma.document.create({
    data: {
      kind: data.kind as any,
      label: data.label,
      fileKey: data.fileKey,
      mimeType: data.mimeType,
      size: data.size,
      clientId: data.clientId,
      propertyId: data.propertyId,
      bailId: data.bailId,
      uploadedById: user.id,
    },
  });

  // Mettre à jour les statuts de complétion
  if (data.clientId) {
    await calculateAndUpdateClientStatus(data.clientId);
    revalidatePath(`/interface/clients/${data.clientId}`);
  }
  if (data.propertyId) {
    await calculateAndUpdatePropertyStatus(data.propertyId);
    revalidatePath(`/interface/properties/${data.propertyId}`);
  }
  if (data.bailId) {
    revalidatePath(`/interface/bails/${data.bailId}`);
  }

  return document;
}

export async function deleteDocument(id: string) {
  await requireAuth();
  const document = await prisma.document.findUnique({ where: { id } });
  
  if (!document) {
    throw new Error("Document introuvable");
  }

  const clientId = document.clientId;
  const propertyId = document.propertyId;

  await prisma.document.delete({ where: { id } });

  // Mettre à jour les statuts de complétion
  if (clientId) {
    await calculateAndUpdateClientStatus(clientId);
    revalidatePath(`/interface/clients/${clientId}`);
  }
  if (propertyId) {
    await calculateAndUpdatePropertyStatus(propertyId);
    revalidatePath(`/interface/properties/${propertyId}`);
  }
  if (document.bailId) {
    revalidatePath(`/interface/bails/${document.bailId}`);
  }
}

export async function getDocuments(params: {
  clientId?: string;
  propertyId?: string;
  bailId?: string;
}) {
  await requireAuth();

  return prisma.document.findMany({
    where: {
      clientId: params.clientId,
      propertyId: params.propertyId,
      bailId: params.bailId,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Helper pour uploader un fichier et créer un document
async function uploadFileAndCreateDocument(
  file: File | null | undefined,
  kind: DocumentKind,
  options: {
    clientId?: string;
    propertyId?: string;
    bailId?: string;
    label?: string;
  }
) {
  if (!file) return null;

  console.log("data", options);

  const user = await requireAuth();
  
  // Générer un nom de fichier unique
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `documents/${timestamp}-${sanitizedName}`;

  // Uploader le fichier vers Vercel Blob
  const blob = await put(fileName, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  // Créer le document dans la base de données
  const document = await prisma.document.create({
    data: {
      kind,
      label: options.label || file.name,
      fileKey: blob.url, // URL Vercel Blob
      mimeType: file.type,
      size: file.size,
      clientId: options.clientId,
      propertyId: options.propertyId,
      bailId: options.bailId,
      uploadedById: user.id,
    },
  });

  // Mettre à jour les statuts de complétion
  if (options.clientId) {
    await calculateAndUpdateClientStatus(options.clientId);
  }
  if (options.propertyId) {
    await calculateAndUpdatePropertyStatus(options.propertyId);
  }

  return document;
}

// Fonction pour gérer les pièces jointes d'un formulaire propriétaire
export async function handleOwnerFormDocuments(
  formData: FormData,
  clientId: string,
  propertyId: string,
  bailId: string,
  type: string,
  familyStatus?: string
) {
  const documents: any[] = [];

  // Pièces jointes - Client (personne morale)
  if (type === "PERSONNE_MORALE") {
    const kbis = formData.get("kbis") as File | null;
    if (kbis && kbis.size > 0) {
      const doc = await uploadFileAndCreateDocument(kbis, DocumentKind.KBIS, {
        clientId,
        label: "KBIS",
      });
      if (doc) documents.push(doc);
    }

    const statutes = formData.get("statutes") as File | null;
    if (statutes && statutes.size > 0) {
      const doc = await uploadFileAndCreateDocument(statutes, DocumentKind.STATUTES, {
        clientId,
        label: "Statuts",
      });
      if (doc) documents.push(doc);
    }
  }

  // Pièces jointes - Client (personne physique)
  if (type === "PERSONNE_PHYSIQUE") {
    const birthCert = formData.get("birthCert") as File | null;
    if (birthCert && birthCert.size > 0) {
      const doc = await uploadFileAndCreateDocument(birthCert, DocumentKind.BIRTH_CERT, {
        clientId,
        label: "Acte de naissance",
      });
      if (doc) documents.push(doc);
    }

    const idIdentity = formData.get("idIdentity") as File | null;
    if (idIdentity && idIdentity.size > 0) {
      const doc = await uploadFileAndCreateDocument(idIdentity, DocumentKind.ID_IDENTITY, {
        clientId,
        label: "Pièce d'identité",
      });
      if (doc) documents.push(doc);
    }

    // Livret de famille si marié
    if (familyStatus === "MARIE") {
      const livretDeFamille = formData.get("livretDeFamille") as File | null;
      if (livretDeFamille && livretDeFamille.size > 0) {
        const doc = await uploadFileAndCreateDocument(livretDeFamille, DocumentKind.LIVRET_DE_FAMILLE, {
          clientId,
          label: "Livret de famille",
        });
        if (doc) documents.push(doc);
      }
    }

    // Contrat de PACS si pacsé
    if (familyStatus === "PACS") {
      const contratDePacs = formData.get("contratDePacs") as File | null;
      if (contratDePacs && contratDePacs.size > 0) {
        const doc = await uploadFileAndCreateDocument(contratDePacs, DocumentKind.CONTRAT_DE_PACS, {
          clientId,
          label: "Contrat de PACS",
        });
        if (doc) documents.push(doc);
      }
    }
  }

  // Pièces jointes - Bien (propriétaire uniquement)
  const diagnostics = formData.get("diagnostics") as File | null;
  if (diagnostics && diagnostics.size > 0) {
    const doc = await uploadFileAndCreateDocument(diagnostics, DocumentKind.DIAGNOSTICS, {
      propertyId,
      label: "Diagnostics",
    });
    if (doc) documents.push(doc);
  }

  const reglementCopropriete = formData.get("reglementCopropriete") as File | null;
  if (reglementCopropriete && reglementCopropriete.size > 0) {
    const doc = await uploadFileAndCreateDocument(reglementCopropriete, DocumentKind.REGLEMENT_COPROPRIETE, {
      propertyId,
      label: "Règlement de copropriété",
    });
    if (doc) documents.push(doc);
  }

  const cahierChargeLotissement = formData.get("cahierChargeLotissement") as File | null;
  if (cahierChargeLotissement && cahierChargeLotissement.size > 0) {
    const doc = await uploadFileAndCreateDocument(cahierChargeLotissement, DocumentKind.CAHIER_DE_CHARGE_LOTISSEMENT, {
      propertyId,
      label: "Cahier des charges lotissement",
    });
    if (doc) documents.push(doc);
  }

  const statutAssociationSyndicale = formData.get("statutAssociationSyndicale") as File | null;
  if (statutAssociationSyndicale && statutAssociationSyndicale.size > 0) {
    const doc = await uploadFileAndCreateDocument(statutAssociationSyndicale, DocumentKind.STATUT_DE_LASSOCIATION_SYNDICALE, {
      propertyId,
      label: "Statut de l'association syndicale",
    });
    if (doc) documents.push(doc);
  }

  // Pièces jointes - Bail (propriétaire)
  const insuranceOwner = formData.get("insuranceOwner") as File | null;
  if (insuranceOwner && insuranceOwner.size > 0) {
    const doc = await uploadFileAndCreateDocument(insuranceOwner, DocumentKind.INSURANCE, {
      clientId,
      label: "Assurance propriétaire",
    });
    if (doc) documents.push(doc);
  }

  const ribOwner = formData.get("ribOwner") as File | null;
  if (ribOwner && ribOwner.size > 0) {
    const doc = await uploadFileAndCreateDocument(ribOwner, DocumentKind.RIB, {
      clientId,
      label: "RIB propriétaire",
    });
    if (doc) documents.push(doc);
  }

  return documents;
}

// Fonction pour gérer les pièces jointes d'un formulaire locataire
export async function handleTenantFormDocuments(
  formData: FormData,
  clientId: string,
  bailId: string,
  type: string,
  familyStatus?: string
) {
  const documents: any[] = [];

  // Pièces jointes - Client (personne morale)
  if (type === "PERSONNE_MORALE") {
    const kbis = formData.get("kbis") as File | null;
    if (kbis && kbis.size > 0) {
      const doc = await uploadFileAndCreateDocument(kbis, DocumentKind.KBIS, {
        clientId,
        label: "KBIS",
      });
      if (doc) documents.push(doc);
    }

    const statutes = formData.get("statutes") as File | null;
    if (statutes && statutes.size > 0) {
      const doc = await uploadFileAndCreateDocument(statutes, DocumentKind.STATUTES, {
        clientId,
        label: "Statuts",
      });
      if (doc) documents.push(doc);
    }
  }

  // Pièces jointes - Client (personne physique)
  if (type === "PERSONNE_PHYSIQUE") {
    const birthCert = formData.get("birthCert") as File | null;
    if (birthCert && birthCert.size > 0) {
      const doc = await uploadFileAndCreateDocument(birthCert, DocumentKind.BIRTH_CERT, {
        clientId,
        label: "Acte de naissance",
      });
      if (doc) documents.push(doc);
    }

    const idIdentity = formData.get("idIdentity") as File | null;
    if (idIdentity && idIdentity.size > 0) {
      const doc = await uploadFileAndCreateDocument(idIdentity, DocumentKind.ID_IDENTITY, {
        clientId,
        label: "Pièce d'identité",
      });
      if (doc) documents.push(doc);
    }

    // Livret de famille si marié
    if (familyStatus === "MARIE") {
      const livretDeFamille = formData.get("livretDeFamille") as File | null;
      if (livretDeFamille && livretDeFamille.size > 0) {
        const doc = await uploadFileAndCreateDocument(livretDeFamille, DocumentKind.LIVRET_DE_FAMILLE, {
          clientId,
          label: "Livret de famille",
        });
        if (doc) documents.push(doc);
      }
    }

    // Contrat de PACS si pacsé
    if (familyStatus === "PACS") {
      const contratDePacs = formData.get("contratDePacs") as File | null;
      if (contratDePacs && contratDePacs.size > 0) {
        const doc = await uploadFileAndCreateDocument(contratDePacs, DocumentKind.CONTRAT_DE_PACS, {
          clientId,
          label: "Contrat de PACS",
        });
        if (doc) documents.push(doc);
      }
    }
  }

  // Pièces jointes - Bail (locataire)
  const insuranceTenant = formData.get("insuranceTenant") as File | null;
  if (insuranceTenant && insuranceTenant.size > 0) {
    const doc = await uploadFileAndCreateDocument(insuranceTenant, DocumentKind.INSURANCE, {
      clientId,
      label: "Assurance locataire",
    });
    if (doc) documents.push(doc);
  }

  const ribTenant = formData.get("ribTenant") as File | null;
  if (ribTenant && ribTenant.size > 0) {
    const doc = await uploadFileAndCreateDocument(ribTenant, DocumentKind.RIB, {
      clientId,
      label: "RIB locataire",
    });
    if (doc) documents.push(doc);
  }

  return documents;
}


