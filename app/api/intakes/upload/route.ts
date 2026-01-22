import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DocumentKind } from "@prisma/client";
import { uploadFileToS3, generateS3FileKey } from "@/lib/utils/s3-client";

// Configuration pour accepter les fichiers volumineux
// Les API routes dans Next.js App Router gèrent automatiquement les FormData
// Pas besoin de bodyParser: false car Next.js le gère automatiquement
export const maxDuration = 300; // 5 minutes pour les uploads volumineux (fichiers jusqu'à ~50MB)
export const runtime = 'nodejs'; // Utiliser Node.js runtime pour les uploads

// Mapping des noms de fichiers aux types de documents
const FILE_TO_DOCUMENT_KIND: Record<string, DocumentKind> = {
  kbis: DocumentKind.KBIS,
  statutes: DocumentKind.STATUTES,
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

    // Récupérer le client avec ses personnes et entreprise UNE SEULE FOIS avant la boucle
    const startTime = Date.now();
    const client = finalClientId ? await prisma.client.findUnique({
      where: { id: finalClientId },
      include: {
        persons: {
          orderBy: { isPrimary: 'desc' },
        },
        entreprise: true,
      },
    }) : null;
    console.log(`[API upload] Client récupéré en ${Date.now() - startTime}ms`);

    // Créer un tableau de promesses pour uploader tous les fichiers en parallèle
    const uploadPromises: Promise<{ name: string; documentId: string }>[] = [];

    // Parcourir tous les fichiers dans le FormData et créer des promesses d'upload
    console.log("[API upload] Début du traitement des fichiers");
    for (const [name, value] of formData.entries()) {
      // Ignorer les champs qui ne sont pas des fichiers
      if (name === "token" || name === "clientId" || name === "propertyId" || name === "bailId") {
        console.log(`[API upload] Ignoré (paramètre): ${name}`);
        continue;
      }

      const file = value as File;
      if (!file || file.size === 0) {
        console.log(`[API upload] Fichier invalide ou vide: ${name}`);
        continue;
      }

      console.log(`[API upload] Traitement du fichier: ${name}, taille: ${file.size}`);

      // Pour les fichiers avec index (ex: idIdentity_1), extraire le nom de base
      const baseName = name.split('_')[0];
      const documentKind = FILE_TO_DOCUMENT_KIND[baseName] || FILE_TO_DOCUMENT_KIND[name];
      if (!documentKind) {
        console.warn(`[API upload] Type de document inconnu pour: ${name} (baseName: ${baseName})`);
        continue;
      }

      console.log(`[API upload] DocumentKind trouvé: ${documentKind} pour ${name} (baseName: ${baseName})`);

      // Créer une promesse pour chaque upload (exécution en parallèle)
      uploadPromises.push(
        (async () => {
          const fileStartTime = Date.now();
          try {
            // Générer la clé S3 pour le fichier
            const fileKey = generateS3FileKey("intakes", file.name, token);

            const s3StartTime = Date.now();
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            console.log(`[API upload] Début upload ${name} vers S3 (${fileSizeMB} MB)`);
            
            // Uploader le fichier vers S3 (en parallèle avec les autres)
            const s3Result = await uploadFileToS3(
              file,
              fileKey,
              file.type || "application/octet-stream"
            );
            
            const s3UploadTime = Date.now() - s3StartTime;
            console.log(`[API upload] Upload ${name} vers S3 terminé en ${s3UploadTime}ms (${(s3UploadTime / 1000).toFixed(2)}s)`);
            
            const dbStartTime = Date.now();

            // Déterminer où attacher le document
            let targetClientId: string | null = null;
            let targetPersonId: string | null = null;
            let targetEntrepriseId: string | null = null;
            let targetPropertyId: string | null = null;
            let targetBailId: string | null = null;

            // Le client a déjà été récupéré avant la boucle, pas besoin de le refaire

            // Utiliser baseName pour déterminer le type de document et où le rattacher
            // Documents par personne (ID_IDENTITY)
            if (baseName === "idIdentity") {
              // Si le nom contient un index (ex: "idIdentity_0"), utiliser cet index
              // Sinon, utiliser la première personne (personne principale)
              const match = name.match(/_(\d+)$/);
              const personIndex = match ? parseInt(match[1], 10) : 0;
              
              console.log(`[API upload] Document de personne (${baseName}), index: ${personIndex}`);
              
              if (client && client.persons && client.persons.length > personIndex) {
                targetPersonId = client.persons[personIndex].id;
                console.log(`[API upload] Document rattaché à personId: ${targetPersonId}`);
              } else if (client && client.persons && client.persons.length > 0) {
                // Fallback: utiliser la première personne si l'index n'existe pas
                targetPersonId = client.persons[0].id;
                console.log(`[API upload] Document rattaché à première personne (fallback): ${targetPersonId}`);
              } else {
                console.warn(`[API upload] Aucune personne trouvée pour le client ${finalClientId}`);
              }
            }
            // Documents entreprise (KBIS et STATUTES)
            else if (baseName === "kbis" || baseName === "statutes") {
              if (client && client.entreprise) {
                targetEntrepriseId = client.entreprise.id;
                console.log(`[API upload] Document rattaché à entrepriseId: ${targetEntrepriseId}`);
              } else {
                console.warn(`[API upload] Aucune entreprise trouvée pour le client ${finalClientId}`);
              }
            }
            // Documents client communs (LIVRET_DE_FAMILLE et CONTRAT_DE_PACS)
            else if (baseName === "livretDeFamille" || baseName === "contratDePacs") {
              targetClientId = finalClientId;
              console.log(`[API upload] Document rattaché à clientId: ${targetClientId}`);
            }
            // Documents bail (locataire) - mais ceux-ci devraient être sur le client locataire, pas le propriétaire
            else if (baseName === "insuranceTenant" || baseName === "ribTenant") {
              targetClientId = finalClientId;
              console.log(`[API upload] Document locataire rattaché à clientId: ${targetClientId}`);
            }
            // Documents bien (PROPERTY)
            else if (["diagnostics", "titleDeed", "reglementCopropriete", "cahierChargeLotissement", "statutAssociationSyndicale", "insuranceOwner", "ribOwner"].includes(baseName)) {
              targetPropertyId = finalPropertyId;
              console.log(`[API upload] Document rattaché à propertyId: ${targetPropertyId}`);
            } else {
              console.warn(`[API upload] Type de document non reconnu pour le rattachement: ${baseName}`);
            }

            // Vérifier si le document existe déjà (éviter les doublons)
            // Construire la condition where en fonction des targets
            const whereCondition: any = {
              fileKey: s3Result.url,
              kind: documentKind,
            };
            
            if (targetPersonId) {
              whereCondition.personId = targetPersonId;
            }
            if (targetEntrepriseId) {
              whereCondition.entrepriseId = targetEntrepriseId;
            }
            if (targetClientId) {
              whereCondition.clientId = targetClientId;
              // Pour les documents client, s'assurer qu'ils ne sont pas sur une personne ou entreprise
              if (!targetPersonId && !targetEntrepriseId) {
                whereCondition.personId = null;
                whereCondition.entrepriseId = null;
              }
            }
            if (targetPropertyId) {
              whereCondition.propertyId = targetPropertyId;
            }
            if (targetBailId) {
              whereCondition.bailId = targetBailId;
            }
            
            console.log(`[API upload] Recherche document existant avec:`, whereCondition);
            
            const findStartTime = Date.now();
            const existingDoc = await prisma.document.findFirst({
              where: whereCondition,
            });
            console.log(`[API upload] Recherche document existant terminée en ${Date.now() - findStartTime}ms`);

            let document;
            if (existingDoc) {
              // Mettre à jour le document existant
              const updateStartTime = Date.now();
              document = await prisma.document.update({
                where: { id: existingDoc.id },
                data: {
                  label: file.name,
                  mimeType: file.type,
                  size: file.size,
                },
              });
              console.log(`[API upload] Document mis à jour en ${Date.now() - updateStartTime}ms`);
            } else {
              // Créer le document dans la base de données
              // Note: uploadedById sera mis à jour lors du savePartialIntake
              const documentData: any = {
                kind: documentKind,
                label: file.name,
                fileKey: s3Result.url, // URL publique S3
                mimeType: file.type,
                size: file.size,
                uploadedById: null, // Sera mis à jour lors du savePartialIntake
              };
              
              // Ajouter les relations uniquement si elles sont définies
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
              if (targetBailId) {
                documentData.bailId = targetBailId;
              }
              
              console.log(`[API upload] Création document avec:`, {
                kind: documentData.kind,
                personId: documentData.personId || null,
                entrepriseId: documentData.entrepriseId || null,
                clientId: documentData.clientId || null,
                propertyId: documentData.propertyId || null,
                bailId: documentData.bailId || null,
              });
              
              const createStartTime = Date.now();
              document = await prisma.document.create({
                data: documentData,
              });
              console.log(`[API upload] Document créé avec ID: ${document.id} en ${Date.now() - createStartTime}ms`);
            }
            
            const dbTime = Date.now() - dbStartTime;
            console.log(`[API upload] Opérations DB pour ${name} terminées en ${dbTime}ms`);
            console.log(`[API upload] Total pour ${name}: ${Date.now() - fileStartTime}ms (S3: ${s3UploadTime}ms, DB: ${dbTime}ms)`);

            // Retourner toutes les métadonnées nécessaires
            return { 
              name, 
              documentId: document.id,
              kind: document.kind,
              fileKey: document.fileKey,
              fileName: file.name,
              mimeType: document.mimeType,
              size: document.size,
              label: document.label,
              target: targetPersonId ? 'person' : 
                     targetEntrepriseId ? 'entreprise' : 
                     targetPropertyId ? 'property' : 
                     targetBailId ? 'bail' : 
                     'client',
              personIndex: targetPersonId && client?.persons ? 
                client.persons.findIndex(p => p.id === targetPersonId) : 
                undefined,
            };
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
    const uploadStartTime = Date.now();
    console.log(`[API upload] Début de l'upload parallèle de ${uploadPromises.length} fichier(s)`);
    const results = await Promise.allSettled(uploadPromises);
    console.log(`[API upload] Tous les uploads terminés en ${Date.now() - uploadStartTime}ms`);
    
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




