import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DocumentKind } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      documentKind,
      clientId,
      personIndex,
      blobUrl,
      fileName,
      mimeType,
      size,
    } = body;

    if (!token || !documentKind || !blobUrl) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    // Vérifier que l'intakeLink existe et est valide
    const intakeLink = await prisma.intakeLink.findUnique({
      where: { token },
      select: {
        id: true,
        clientId: true,
        propertyId: true,
        status: true,
      },
    });

    if (!intakeLink) {
      return NextResponse.json(
        { error: "Lien d'intake introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que le lien n'est pas révoqué
    if (intakeLink.status === "REVOKED") {
      return NextResponse.json(
        { error: "Ce lien a été révoqué" },
        { status: 403 }
      );
    }

    // Utiliser les IDs de l'intakeLink si non fournis
    const finalClientId = clientId || intakeLink.clientId;
    const finalPropertyId = intakeLink.propertyId;

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

    // Déterminer où attacher le document
    let targetPersonId: string | null = null;
    let targetEntrepriseId: string | null = null;
    let targetClientId: string | null = null;
    let targetPropertyId: string | null = null;

    // Documents par personne (BIRTH_CERT et ID_IDENTITY)
    if (documentKind === "BIRTH_CERT" || documentKind === "ID_IDENTITY") {
      const personIdx = personIndex !== undefined ? personIndex : 0;
      if (client && client.persons && client.persons.length > personIdx) {
        targetPersonId = client.persons[personIdx].id;
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
      targetPropertyId = finalPropertyId;
      targetClientId = finalClientId; // Garder aussi clientId pour compatibilité
    }
    // Documents client (livret de famille, PACS, assurance, RIB)
    else {
      targetClientId = finalClientId;
    }

    // Vérifier si le document existe déjà
    const whereCondition: any = {
      fileKey: blobUrl,
      kind: documentKind as DocumentKind,
    };

    if (targetPersonId) {
      whereCondition.personId = targetPersonId;
    }
    if (targetEntrepriseId) {
      whereCondition.entrepriseId = targetEntrepriseId;
    }
    if (targetClientId) {
      whereCondition.clientId = targetClientId;
      if (!targetPersonId && !targetEntrepriseId) {
        whereCondition.personId = null;
        whereCondition.entrepriseId = null;
      }
    }
    if (targetPropertyId) {
      whereCondition.propertyId = targetPropertyId;
    }

    const existingDoc = await prisma.document.findFirst({
      where: whereCondition,
    });

    if (!existingDoc) {
      // Créer le document dans la base de données
      const documentData: any = {
        kind: documentKind as DocumentKind,
        label: fileName,
        fileKey: blobUrl,
        mimeType: mimeType || "application/octet-stream",
        size: size || 0,
        uploadedById: null, // Sera mis à jour lors du savePartialIntake
      };

      if (targetPersonId) {
        documentData.personId = targetPersonId;
      }
      if (targetEntrepriseId) {
        documentData.entrepriseId = targetEntrepriseId;
      }
      if (targetClientId) {
        documentData.clientId = targetClientId;
      }
      if (targetPropertyId) {
        documentData.propertyId = targetPropertyId;
      }

      await prisma.document.create({
        data: documentData,
      });

      console.log(`[create-document] Document créé: ${documentKind} pour ${token}`);
    } else {
      console.log(`[create-document] Document existe déjà: ${documentKind} pour ${token}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[create-document] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création du document" },
      { status: 500 }
    );
  }
}



