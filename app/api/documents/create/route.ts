import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DocumentKind } from "@prisma/client";
import { requireAuth } from "@/lib/auth-helpers";
import { 
  updateClientCompletionStatus as calculateAndUpdateClientStatus, 
  updatePropertyCompletionStatus as calculateAndUpdatePropertyStatus 
} from "@/lib/utils/completion-status";
import { revalidatePath } from "next/cache";

/**
 * Route API pour créer des documents dans la DB après upload direct côté client
 * Supporte tous les contextes : intakes, clients, propriétés, baux
 * 
 * Note : Les intakes (formulaires publics) n'ont PAS besoin d'authentification.
 * Seuls les documents de l'interface notaire nécessitent une authentification.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      // Pour les intakes
      token: intakeToken,
      // Pour les documents clients/propriétés
      clientId,
      personId,
      entrepriseId,
      propertyId,
      bailId,
      // Données du document
      fileKey, // URL publique S3
      kind,
      fileName,
      mimeType,
      size,
      label,
      personIndex, // Pour les documents de personne (ID_IDENTITY)
    } = body;

    if (!fileKey || !kind) {
      return NextResponse.json(
        { error: "fileKey et kind sont requis" },
        { status: 400 }
      );
    }

    let finalClientId: string | null = null;
    let finalPropertyId: string | null = null;
    let finalBailId: string | null = null;
    let uploadedById: string | null = null;

    // Cas 1: Document pour intake - PAS D'AUTHENTIFICATION REQUISE
    // Les utilisateurs publics peuvent créer des documents via leur token d'intake
    if (intakeToken) {
      // Vérifier que l'intakeLink existe
      const intakeLink = await prisma.intakeLink.findUnique({
        where: { token: intakeToken },
        include: {
          client: {
            include: {
              persons: {
                orderBy: { isPrimary: 'desc' },
              },
              entreprise: true,
            },
          },
        },
      });

      if (!intakeLink) {
        return NextResponse.json(
          { error: "Lien d'intake introuvable" },
          { status: 404 }
        );
      }

      if (intakeLink.status === "REVOKED") {
        return NextResponse.json(
          { error: "Ce lien a été révoqué" },
          { status: 403 }
        );
      }

      finalClientId = clientId || intakeLink.clientId;
      finalPropertyId = propertyId || intakeLink.propertyId;
      finalBailId = bailId || intakeLink.bailId;
      // uploadedById sera mis à jour lors du savePartialIntake
    }
    // Cas 2: Document pour client/propriété (nécessite auth)
    else {
      const user = await requireAuth();
      uploadedById = user.id;

      // Récupérer le clientId si nécessaire
      if (personId) {
        const person = await prisma.person.findUnique({
          where: { id: personId },
          select: { clientId: true },
        });
        if (!person) {
          return NextResponse.json(
            { error: "Personne introuvable" },
            { status: 404 }
          );
        }
        finalClientId = person.clientId;
      } else if (entrepriseId) {
        const entreprise = await prisma.entreprise.findUnique({
          where: { id: entrepriseId },
          select: { clientId: true },
        });
        if (!entreprise) {
          return NextResponse.json(
            { error: "Entreprise introuvable" },
            { status: 404 }
          );
        }
        finalClientId = entreprise.clientId;
      } else if (clientId) {
        finalClientId = clientId;
      } else if (propertyId) {
        finalPropertyId = propertyId;
      } else if (bailId) {
        finalBailId = bailId;
        // Note: Bail a une relation many-to-many avec Client via parties
        // On n'a pas besoin de récupérer le clientId ici pour les documents de bail
      }
    }

    // Récupérer le client avec ses personnes et entreprise si nécessaire
    const client = finalClientId ? await prisma.client.findUnique({
      where: { id: finalClientId },
      include: {
        persons: {
          orderBy: { isPrimary: 'desc' },
        },
        entreprise: true,
      },
    }) : null;

    // Déterminer où attacher le document
    let targetPersonId: string | null = null;
    let targetEntrepriseId: string | null = null;
    let targetClientId: string | null = null;
    let targetPropertyId: string | null = null;
    let targetBailId: string | null = null;

    const documentKind = kind as DocumentKind;

    // Documents par personne (ID_IDENTITY)
    if (documentKind === "ID_IDENTITY") {
      const pIndex = personIndex !== undefined ? personIndex : 0;
      if (client && client.persons && client.persons.length > pIndex) {
        targetPersonId = client.persons[pIndex].id;
      } else if (client && client.persons && client.persons.length > 0) {
        targetPersonId = client.persons[0].id;
      }
    }
    // Documents entreprise (KBIS et STATUTES)
    else if (documentKind === "KBIS" || documentKind === "STATUTES") {
      if (client && client.entreprise) {
        targetEntrepriseId = client.entreprise.id;
      }
    }
    // Documents bien (PROPERTY)
    else if (["DIAGNOSTICS", "TITLE_DEED", "REGLEMENT_COPROPRIETE", "CAHIER_DE_CHARGE_LOTISSEMENT", "STATUT_DE_LASSOCIATION_SYNDICALE"].includes(documentKind)) {
      targetPropertyId = finalPropertyId || null;
    }
    // Documents INSURANCE et RIB : attachés au Property pour les propriétaires, au Client pour les locataires
    else if (documentKind === "INSURANCE" || documentKind === "RIB") {
      if (client && client.profilType === "PROPRIETAIRE") {
        targetPropertyId = finalPropertyId || null;
      } else {
        targetClientId = finalClientId;
      }
    }
    // Documents client (livret de famille, PACS)
    else {
      targetClientId = finalClientId;
    }

    // Vérifier si le document existe déjà
    const whereCondition: any = {
      fileKey: fileKey,
      kind: documentKind,
    };

    if (targetPersonId) whereCondition.personId = targetPersonId;
    if (targetEntrepriseId) whereCondition.entrepriseId = targetEntrepriseId;
    if (targetClientId) {
      whereCondition.clientId = targetClientId;
      if (!targetPersonId && !targetEntrepriseId) {
        whereCondition.personId = null;
        whereCondition.entrepriseId = null;
      }
    }
    if (targetPropertyId) whereCondition.propertyId = targetPropertyId;
    if (targetBailId) whereCondition.bailId = targetBailId;

    const existingDoc = await prisma.document.findFirst({
      where: whereCondition,
    });

    let document;
    if (existingDoc) {
      // Mettre à jour le document existant
      document = await prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          label: label || fileName,
          mimeType: mimeType,
          size: size,
          ...(uploadedById && { uploadedById }),
        },
      });
    } else {
      // Créer le document
      const documentData: any = {
        kind: documentKind,
        label: label || fileName,
        fileKey: fileKey,
        mimeType: mimeType,
        size: size,
        ...(uploadedById && { uploadedById }),
      };

      if (targetPersonId) documentData.personId = targetPersonId;
      if (targetEntrepriseId) documentData.entrepriseId = targetEntrepriseId;
      if (targetClientId) documentData.clientId = targetClientId;
      if (targetPropertyId) documentData.propertyId = targetPropertyId;
      if (targetBailId) documentData.bailId = targetBailId;

      document = await prisma.document.create({
        data: documentData,
      });
    }

    // Mettre à jour les statuts de complétion
    if (finalClientId) {
      await calculateAndUpdateClientStatus(finalClientId);
      revalidatePath(`/interface/clients/${finalClientId}`);
    }
    if (finalPropertyId) {
      await calculateAndUpdatePropertyStatus(finalPropertyId);
      revalidatePath(`/interface/properties/${finalPropertyId}`);
    }
    if (finalBailId) {
      revalidatePath(`/interface/bails/${finalBailId}`);
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        kind: document.kind,
        label: document.label,
        fileKey: document.fileKey,
        mimeType: document.mimeType,
        size: document.size,
      },
    });
  } catch (error: any) {
    console.error("[documents/create] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création du document" },
      { status: 500 }
    );
  }
}

