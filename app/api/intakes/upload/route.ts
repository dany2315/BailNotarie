import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { DocumentKind } from "@prisma/client";

// Configuration pour accepter les fichiers volumineux
// Les API routes dans Next.js App Router gèrent automatiquement les FormData
// Pas besoin de bodyParser: false car Next.js le gère automatiquement
export const maxDuration = 60; // 60 secondes pour les uploads volumineux
export const runtime = 'nodejs'; // Utiliser Node.js runtime pour les uploads

// Mapping des noms de fichiers aux types de documents
const FILE_TO_DOCUMENT_KIND: Record<string, DocumentKind> = {
  kbis: DocumentKind.KBIS,
  statutes: DocumentKind.STATUTES,
  birthCert: DocumentKind.BIRTH_CERT,
  idIdentity: DocumentKind.ID_IDENTITY,
  livretDeFamille: DocumentKind.LIVRET_DE_FAMILLE,
  contratDePacs: DocumentKind.CONTRAT_DE_PACS,
  diagnostics: DocumentKind.DIAGNOSTICS,
  titleDeed: DocumentKind.TITLE_DEED,
  reglementCopropriete: DocumentKind.REGLEMENT_COPROPRIETE,
  cahierChargeLotissement: DocumentKind.CAHIER_DE_CHARGE_LOTISSEMENT,
  statutAssociationSyndicale: DocumentKind.STATUT_DE_LASSOCIATION_SYNDICALE,
  insuranceOwner: DocumentKind.INSURANCE,
  ribOwner: DocumentKind.RIB,
  insuranceTenant: DocumentKind.INSURANCE,
  ribTenant: DocumentKind.RIB,
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Récupérer les paramètres depuis les query params ou le formData
    const token = formData.get("token") as string;
    const clientId = formData.get("clientId") as string | null;
    const propertyId = formData.get("propertyId") as string | null;
    const bailId = formData.get("bailId") as string | null;

    if (!token) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 400 }
      );
    }

    // Vérifier que l'intakeLink existe et est valide
    const intakeLink = await prisma.intakeLink.findUnique({
      where: { token },
      include: {
        client: true,
        property: true,
        bail: true,
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

    // Vérifier que le lien n'est pas déjà soumis (on permet quand même l'upload pour les modifications)
    // Mais on vérifie qu'il n'est pas révoqué

    // Utiliser les IDs de l'intakeLink si non fournis
    const finalClientId = clientId || intakeLink.clientId;
    const finalPropertyId = propertyId || intakeLink.propertyId;
    const finalBailId = bailId || intakeLink.bailId;

    // Créer un tableau de promesses pour uploader tous les fichiers en parallèle
    const uploadPromises: Promise<{ name: string; documentId: string }>[] = [];

    // Parcourir tous les fichiers dans le FormData et créer des promesses d'upload
    for (const [name, value] of formData.entries()) {
      // Ignorer les champs qui ne sont pas des fichiers
      if (name === "token" || name === "clientId" || name === "propertyId" || name === "bailId") {
        continue;
      }

      const file = value as File;
      if (!file || file.size === 0) {
        continue;
      }

      const documentKind = FILE_TO_DOCUMENT_KIND[name];
      if (!documentKind) {
        console.warn(`Type de document inconnu pour: ${name}`);
        continue;
      }

      // Créer une promesse pour chaque upload (exécution en parallèle)
      uploadPromises.push(
        (async () => {
          try {
            // Générer un nom de fichier unique avec timestamp et index pour éviter les collisions
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 9);
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const fileName = `intakes/${token}/${timestamp}-${randomSuffix}-${sanitizedName}`;

            // Uploader le fichier vers Vercel Blob (en parallèle avec les autres)
            const blob = await put(fileName, file, {
              access: "public",
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });

            // Déterminer où attacher le document
            let targetClientId: string | null = null;
            let targetPersonId: string | null = null;
            let targetEntrepriseId: string | null = null;
            let targetPropertyId: string | null = null;
            let targetBailId: string | null = null;

            // Récupérer le client avec ses personnes et entreprise
            const client = finalClientId ? await prisma.client.findUnique({
              where: { id: finalClientId },
              include: {
                persons: true,
                entreprise: true,
              },
            }) : null;

            // Documents par personne (BIRTH_CERT et ID_IDENTITY)
            if (name === "birthCert" || name === "idIdentity") {
              // Si le nom contient un index (ex: "birthCert_0"), utiliser cet index
              // Sinon, utiliser la première personne (personne principale)
              const match = name.match(/_(\d+)$/);
              const personIndex = match ? parseInt(match[1], 10) : 0;
              
              if (client && client.persons && client.persons.length > personIndex) {
                targetPersonId = client.persons[personIndex].id;
              } else if (client && client.persons && client.persons.length > 0) {
                // Fallback: utiliser la première personne si l'index n'existe pas
                targetPersonId = client.persons[0].id;
              }
            }
            // Documents entreprise (KBIS et STATUTES)
            else if (name === "kbis" || name === "statutes") {
              if (client && client.entreprise) {
                targetEntrepriseId = client.entreprise.id;
              }
            }
            // Documents client communs (LIVRET_DE_FAMILLE et CONTRAT_DE_PACS)
            else if (["livretDeFamille", "contratDePacs"].includes(name)) {
              targetClientId = finalClientId;
            }
            // Documents bail (locataire)
            else if (["insuranceTenant", "ribTenant"].includes(name)) {
              targetClientId = finalClientId;
            }
            // Documents bien
            else if (["diagnostics", "titleDeed", "reglementCopropriete", "cahierChargeLotissement", "statutAssociationSyndicale", "insuranceOwner", "ribOwner"].includes(name)) {
              targetPropertyId = finalPropertyId;
            }

            // Créer le document dans la base de données
            const document = await prisma.document.create({
              data: {
                kind: documentKind,
                label: file.name,
                fileKey: blob.url,
                mimeType: file.type,
                size: file.size,
                clientId: targetClientId,
                personId: targetPersonId,
                entrepriseId: targetEntrepriseId,
                propertyId: targetPropertyId,
                bailId: targetBailId,
              },
            });

            return { name, documentId: document.id };
          } catch (error) {
            console.error(`Erreur lors de l'upload du fichier ${name}:`, error);
            // Relancer l'erreur pour que Promise.allSettled puisse la capturer
            throw { name, error };
          }
        })()
      );
    }

    // Exécuter tous les uploads en parallèle
    // Utiliser allSettled pour continuer même si certains échouent
    const results = await Promise.allSettled(uploadPromises);
    
    // Filtrer les résultats réussis et gérer les erreurs
    const uploadedDocuments: { name: string; documentId: string }[] = [];
    const errors: { name: string; error: any }[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        uploadedDocuments.push(result.value);
      } else {
        // result.reason contient l'erreur ou l'objet { name, error }
        const errorInfo = result.reason?.name 
          ? { name: result.reason.name, error: result.reason.error }
          : { name: `fichier_${index}`, error: result.reason };
        errors.push(errorInfo);
        console.error(`Échec de l'upload pour ${errorInfo.name}:`, errorInfo.error);
      }
    });

    // Si tous les uploads ont échoué, retourner une erreur
    if (uploadedDocuments.length === 0 && uploadPromises.length > 0) {
      return NextResponse.json(
        { 
          error: "Tous les uploads ont échoué",
          details: errors
        },
        { status: 500 }
      );
    }

    // Si certains uploads ont échoué, retourner un avertissement mais continuer
    if (errors.length > 0) {
      console.warn(`${errors.length} fichier(s) n'ont pas pu être uploadés:`, errors);
    }

    return NextResponse.json({
      success: true,
      documents: uploadedDocuments,
    });
  } catch (error: any) {
    console.error("Erreur lors de l'upload des fichiers:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'upload des fichiers" },
      { status: 500 }
    );
  }
}




