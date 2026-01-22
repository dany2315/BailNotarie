import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DocumentKind, ProfilType } from "@prisma/client";

/**
 * Route API pour créer les documents dans la DB après upload direct côté client
 * Utilisée avec l'upload optimisé selon la checklist Vercel Blob
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      token: intakeToken,
      documents, // Array de { fileKey, kind, fileName, mimeType, size, label, personIndex?, ... }
      clientId,
      propertyId,
      bailId,
    } = body;

    if (!intakeToken) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 400 }
      );
    }

    // Vérifier que l'intakeLink existe et est valide
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

    const finalClientId = clientId || intakeLink.clientId;
    const finalPropertyId = propertyId || intakeLink.propertyId;
    const finalBailId = bailId || intakeLink.bailId;

    // Récupérer le client avec ses personnes et entreprise
    const client = finalClientId ? await prisma.client.findUnique({
      where: { id: finalClientId },
      include: {
        persons: {
          orderBy: { isPrimary: 'desc' },
        },
        entreprise: true,
      },
    }) : null;

    const createdDocuments: any[] = [];

    // Créer chaque document dans la DB
    for (const doc of documents) {
      try {
        // Déterminer où attacher le document
        let targetPersonId: string | null = null;
        let targetEntrepriseId: string | null = null;
        let targetClientId: string | null = null;
        let targetPropertyId: string | null = null;
        let targetBailId: string | null = null;

        const kind = doc.kind as DocumentKind;

        // Documents par personne
        if (kind === "ID_IDENTITY") {
          const personIndex = doc.personIndex !== undefined ? doc.personIndex : 0;
          if (client && client.persons && client.persons.length > personIndex) {
            targetPersonId = client.persons[personIndex].id;
          } else if (client && client.persons && client.persons.length > 0) {
            targetPersonId = client.persons[0].id;
          }
        }
        // Documents entreprise
        else if (kind === "KBIS" || kind === "STATUTES") {
          if (client && client.entreprise) {
            targetEntrepriseId = client.entreprise.id;
          }
        }
        // Documents bien
        else if (["DIAGNOSTICS", "TITLE_DEED", "REGLEMENT_COPROPRIETE", "CAHIER_DE_CHARGE_LOTISSEMENT", "STATUT_DE_LASSOCIATION_SYNDICALE"].includes(kind)) {
          targetPropertyId = finalPropertyId || null;
        }
        // Documents INSURANCE et RIB : attachés au Property pour les propriétaires, au Client pour les locataires
        else if (kind === "INSURANCE" || kind === "RIB") {
          // Vérifier le profilType du client pour déterminer si c'est un propriétaire
          if (client && client.profilType === ProfilType.PROPRIETAIRE) {
            targetPropertyId = finalPropertyId || null;
          } else {
            // Pour les locataires, attacher au Client
            targetClientId = finalClientId;
          }
        }
        // Documents client (livret de famille, PACS)
        else {
          targetClientId = finalClientId;
        }

        // Vérifier si le document existe déjà
        const whereCondition: any = {
          fileKey: doc.fileKey,
          kind: kind,
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

        if (!existingDoc) {
          // Créer le document
          const documentData: any = {
            kind: kind,
            label: doc.label || doc.fileName,
            fileKey: doc.fileKey,
            mimeType: doc.mimeType,
            size: doc.size,
            uploadedById: null, // Sera mis à jour lors du savePartialIntake
          };

          if (targetPersonId) documentData.personId = targetPersonId;
          if (targetEntrepriseId) documentData.entrepriseId = targetEntrepriseId;
          if (targetClientId) documentData.clientId = targetClientId;
          if (targetPropertyId) documentData.propertyId = targetPropertyId;
          if (targetBailId) documentData.bailId = targetBailId;

          const createdDoc = await prisma.document.create({
            data: documentData,
          });

          createdDocuments.push({
            name: doc.name,
            documentId: createdDoc.id,
            kind: createdDoc.kind,
            fileKey: createdDoc.fileKey,
            fileName: doc.fileName,
            mimeType: createdDoc.mimeType,
            size: createdDoc.size,
            label: createdDoc.label,
            target: targetPersonId ? 'person' : 
                   targetEntrepriseId ? 'entreprise' : 
                   targetPropertyId ? 'property' : 
                   targetBailId ? 'bail' : 
                   'client',
            personIndex: targetPersonId && client?.persons ? 
              client.persons.findIndex(p => p.id === targetPersonId) : 
              undefined,
          });
        } else {
          // Document existe déjà, le retourner quand même
          createdDocuments.push({
            name: doc.name,
            documentId: existingDoc.id,
            kind: existingDoc.kind,
            fileKey: existingDoc.fileKey,
            fileName: doc.fileName,
            mimeType: existingDoc.mimeType,
            size: existingDoc.size,
            label: existingDoc.label,
            target: targetPersonId ? 'person' : 
                   targetEntrepriseId ? 'entreprise' : 
                   targetPropertyId ? 'property' : 
                   targetBailId ? 'bail' : 
                   'client',
            personIndex: targetPersonId && client?.persons ? 
              client.persons.findIndex(p => p.id === targetPersonId) : 
              undefined,
          });
        }
      } catch (error) {
        console.error(`[create-documents] Erreur lors de la création du document ${doc.name}:`, error);
        // Continuer avec les autres documents
      }
    }

    return NextResponse.json({
      success: true,
      documents: createdDocuments,
    });
  } catch (error: any) {
    console.error("[create-documents] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création des documents" },
      { status: 500 }
    );
  }
}


