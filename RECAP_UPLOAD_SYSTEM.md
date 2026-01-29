# Récapitulatif Détaillé du Système d'Upload

## Vue d'ensemble

Le système d'upload du site utilise **Vercel Blob** comme service de stockage de fichiers. Il existe plusieurs méthodes d'upload selon le contexte d'utilisation (formulaires d'intake, interface notaire, etc.).

---

## 🎯 Composants Principaux

### 1. **Composant UI : `FileUpload`**
**Fichier :** `components/ui/file-upload.tsx`

**Fonction :** Composant React réutilisable pour l'upload de fichiers avec drag & drop.

**Fonctionnalités :**
- Upload direct côté client vers Vercel Blob (méthode optimisée)
- Support drag & drop
- Barre de progression simulée
- Validation de taille (max 4MB)
- Validation de type MIME (PDF, DOC, DOCX, JPG, PNG)
- Gestion des erreurs avec retry
- Affichage responsive (desktop/tablet/mobile)

**Fonction principale : `handleFileChange`**
```133:235:components/ui/file-upload.tsx
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (!file) {
      onChange(null);
      setUploadingFile(null);
      return;
    }

    // Valider la taille du fichier (max 3MB)
    const maxSizeInBytes = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSizeInBytes) {
      toast.error(`Fichier trop volumineux. Taille maximale: 4   MB (fichier: ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      onChange(null);
      setUploadingFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    // Si uploadToken est fourni, faire l'upload direct vers Vercel Blob (client SDK)
    if (uploadToken && documentKind) {
      setUploadingFile(file); // Stocker le fichier en cours d'upload
      setIsUploading(true);
      setUploadProgress(0);
      onUploadStateChange?.(true);
      
      try {
        // 1. Récupérer le token d'upload depuis le serveur
        const tokenResponse = await fetch("/api/blob/generate-upload-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: uploadToken }),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.json();
          throw new Error(error.error || "Erreur lors de la récupération du token");
        }

        const { token: blobToken } = await tokenResponse.json();

        // 2. Uploader directement vers Vercel Blob avec le client SDK
        // Utilise multipart automatiquement pour fichiers > 100MB
        const blob = await uploadFileOptimized(file, blobToken, uploadToken);

        // 3. Créer le document dans la DB via l'API
        const createDocResponse = await fetch("/api/intakes/create-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: uploadToken,
            documents: [{
              fileKey: blob.url,
              kind: documentKind,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
              label: file.name,
              personIndex: personIndex,
            }],
            clientId: clientId,
          }),
        });

        if (!createDocResponse.ok) {
          const error = await createDocResponse.json();
          console.warn("[FileUpload] Erreur lors de la création du document:", error);
          // Ne pas faire échouer l'upload si la création du document échoue
          // Le document sera créé lors du savePartialIntake
        }

        toast.success("Fichier uploadé avec succès");
        
        if (onUploadComplete) {
          onUploadComplete(blob.url);
        }

        // Déclencher l'événement pour recharger les documents
        window.dispatchEvent(new CustomEvent(`document-uploaded-${uploadToken}`));

        // Garder le fichier dans le state pour l'affichage
        onChange(file);
      } catch (error: any) {
        console.error("[FileUpload] Erreur lors de l'upload:", error);
        toast.error(error.message || "Erreur lors de l'upload du fichier");
        onChange(null);
        setUploadingFile(null); // Nettoyer le fichier en upload en cas d'erreur
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadingFile(null); // Nettoyer après l'upload
        onUploadStateChange?.(false);
      }
    } else {
      // Comportement par défaut : juste stocker le fichier
      onChange(file);
    }
  };
```

**Fonction d'upload optimisée : `uploadFileOptimized`**
```55:119:components/ui/file-upload.tsx
  const uploadFileOptimized = useCallback(async (
    file: File,
    blobToken: string,
    intakeToken: string
  ): Promise<{ url: string; pathname: string }> => {
    // Générer un pathname unique avec timestamp pour tri chronologique
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pathname = `intakes/${intakeToken}/${timestamp}-${randomSuffix}-${sanitizedName}`;

    // Simuler la progression de manière plus réaliste
    // Basée sur la taille du fichier et le temps estimé
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedTimeMs = Math.max(1000, fileSizeMB * 200); // ~200ms par MB
    const updateInterval = Math.max(50, estimatedTimeMs / 100); // 100 mises à jour
    let currentProgress = 0;

    progressIntervalRef.current = setInterval(() => {
      if (currentProgress < 90) {
        // Accélération au début, ralentissement vers la fin
        const increment = currentProgress < 50 
          ? Math.random() * 15 + 5  // 5-20% par intervalle au début
          : Math.random() * 5 + 2;   // 2-7% par intervalle vers la fin
        
        currentProgress = Math.min(currentProgress + increment, 90);
        setUploadProgress(currentProgress);
        if (onUploadProgress) {
          onUploadProgress(currentProgress);
        }
      }
    }, updateInterval);

    try {
      // Upload direct vers Vercel Blob avec multipart automatique pour fichiers > 100MB
      const blob = await put(pathname, file, {
        access: "public",
        token: blobToken,
        contentType: file.type || "application/octet-stream",
        // multipart: true est activé automatiquement pour fichiers > 100MB selon la doc
      });

      // Nettoyer l'intervalle et mettre à jour à 100%
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setUploadProgress(100);
      if (onUploadProgress) {
        onUploadProgress(100);
      }

      return {
        url: blob.url,
        pathname: blob.pathname,
      };
    } catch (error) {
      // Nettoyer l'intervalle en cas d'erreur
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      throw error;
    }
  }, [onUploadProgress]);
```

---

## 🔌 Routes API d'Upload

### 2. **Route API : Génération de Token d'Upload**
**Fichier :** `app/api/blob/generate-upload-token/route.ts`

**Fonction :** Génère un token sécurisé pour permettre l'upload direct côté client vers Vercel Blob.

**Endpoint :** `POST /api/blob/generate-upload-token`

**Fonction principale :**
```8:68:app/api/blob/generate-upload-token/route.ts
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token: intakeToken } = body;

    if (!intakeToken) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 400 }
      );
    }

    // Vérifier que l'intakeLink existe et est valide
    const intakeLink = await prisma.intakeLink.findUnique({
      where: { token: intakeToken },
      select: { 
        id: true,
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

    // Retourner le token d'upload (BLOB_READ_WRITE_TOKEN)
    // Note: En production, on devrait générer un token temporaire avec des permissions limitées
    // Pour l'instant, on utilise le token complet mais avec validation côté serveur
    const uploadToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (!uploadToken) {
      return NextResponse.json(
        { error: "Token d'upload non configuré" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token: uploadToken,
      // Indiquer que multipart est supporté
      multipart: true,
    });
  } catch (error: any) {
    console.error("[generate-upload-token] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération du token d'upload" },
      { status: 500 }
    );
  }
}
```

**Utilisation :** Appelée par le composant `FileUpload` avant chaque upload pour obtenir le token d'authentification.

---

### 3. **Route API : Upload via Serveur (Blob)**
**Fichier :** `app/api/blob/upload/route.ts`

**Fonction :** Endpoint alternatif pour uploader un fichier via le serveur (utilisé comme fallback ou pour uploads spécifiques).

**Endpoint :** `POST /api/blob/upload`

**Caractéristiques :**
- Accepte FormData avec le fichier
- Valide le token d'intake
- Valide la taille (max 20MB)
- Valide le type MIME
- Upload vers Vercel Blob avec retry logic
- Crée automatiquement le document dans la DB

**Fonction principale :**
```30:285:app/api/blob/upload/route.ts
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Le client SDK envoie le fichier via FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Fichier manquant" },
        { status: 400 }
      );
    }

    // Récupérer les paramètres depuis les query params
    const token = request.nextUrl.searchParams.get("token");
    const clientId = request.nextUrl.searchParams.get("clientId");
    const propertyId = request.nextUrl.searchParams.get("propertyId");
    const documentKind = request.nextUrl.searchParams.get("documentKind");
    const personIndex = request.nextUrl.searchParams.get("personIndex")
      ? parseInt(request.nextUrl.searchParams.get("personIndex")!, 10)
      : undefined;

    if (!token) {
      return NextResponse.json(
        { error: "Token manquant" },
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
    const finalPropertyId = propertyId || intakeLink.propertyId;

    // Valider la taille du fichier (max 20MB pour ce endpoint)
    const maxSizeInBytes = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Taille maximale: ${maxSizeInBytes / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Valider le type MIME
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé: ${file.type}` },
        { status: 400 }
      );
    }

    // Générer le pathname avec le token pour organiser les fichiers
    // Utiliser timestamp pour tri chronologique (selon doc Vercel Blob)
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pathname = `intakes/${token}/${timestamp}-${randomSuffix}-${sanitizedFilename}`;

    // Uploader le fichier vers Vercel Blob avec retry logic
    // La fonction put() gère automatiquement les multipart uploads pour fichiers > 100MB
    const blob = await retryUpload(async () => {
      return await put(pathname, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.type || "application/octet-stream", // S'assurer que le Content-Type est défini
        // addRandomSuffix: false, // On gère déjà l'unicité avec timestamp + randomSuffix
      });
    });

    // Créer le document dans la base de données
    try {
      const intakeToken = token;
      const docClientId = finalClientId;
      const docPropertyId = finalPropertyId;
      const kind = documentKind;
      const pIndex = personIndex;

      if (!kind) {
        console.warn("[blob/upload] documentKind manquant");
        return NextResponse.json(
          { error: "documentKind manquant" },
          { status: 400 }
        );
      }

      // Récupérer le client avec ses personnes et entreprise
      const client = docClientId ? await prisma.client.findUnique({
        where: { id: docClientId },
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

      // Documents par personne (ID_IDENTITY)
      if (kind === "ID_IDENTITY") {
        const personIdx = pIndex !== undefined ? pIndex : 0;
        if (client && client.persons && client.persons.length > personIdx) {
          targetPersonId = client.persons[personIdx].id;
        } else if (client && client.persons && client.persons.length > 0) {
          targetPersonId = client.persons[0].id;
        }
      }
      // Documents entreprise (KBIS et STATUTES)
      else if (kind === "KBIS" || kind === "STATUTES") {
        if (client && client.entreprise) {
          targetEntrepriseId = client.entreprise.id;
        }
      }
      // Documents bien (PROPERTY) - diagnostics, titre de propriété, etc.
      // Documents INSURANCE et RIB : attachés au Property pour les propriétaires, au Client pour les locataires
      else if (kind === "INSURANCE" || kind === "RIB") {
        // Vérifier le profilType du client pour déterminer si c'est un propriétaire
        if (client && client.profilType === "PROPRIETAIRE") {
          // Sera géré dans targetPropertyId ci-dessous
        } else {
          // Pour les locataires, attacher au Client
          targetClientId = docClientId;
        }
      }
      // Documents client (livret de famille, PACS)
      else {
        targetClientId = docClientId;
      }

      // Déterminer targetPropertyId pour les documents de bien
      let targetPropertyId: string | null = null;
      if (["DIAGNOSTICS", "TITLE_DEED", "REGLEMENT_COPROPRIETE", "CAHIER_DE_CHARGE_LOTISSEMENT", "STATUT_DE_LASSOCIATION_SYNDICALE"].includes(kind)) {
        targetPropertyId = docPropertyId || null;
      } else if ((kind === "INSURANCE" || kind === "RIB") && client && client.profilType === "PROPRIETAIRE") {
        // Pour les propriétaires, INSURANCE et RIB sont attachés au Property
        targetPropertyId = docPropertyId || null;
      }

      // Vérifier si le document existe déjà
      const whereCondition: any = {
        fileKey: blob.url,
        kind: kind as any,
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
          kind: kind as any,
          label: file.name,
          fileKey: blob.url,
          mimeType: file.type,
          size: file.size,
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

        console.log(`[blob/upload] Document créé: ${kind} pour ${intakeToken}`);
      } else {
        console.log(`[blob/upload] Document existe déjà: ${kind} pour ${intakeToken}`);
      }
    } catch (error) {
      console.error("[blob/upload] Erreur lors de la création du document:", error);
      // Ne pas faire échouer l'upload si la création du document échoue
      // Le document sera créé lors du savePartialIntake
    }

    // Retourner la réponse attendue par le SDK client
    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      contentDisposition: blob.contentDisposition,
      size: file.size,
    });
  } catch (error: any) {
    console.error("[blob/upload] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération du token d'upload" },
      { status: 500 }
    );
  }
}
```

**Fonction de retry :**
```10:28:app/api/blob/upload/route.ts
async function retryUpload<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (i < maxRetries - 1) {
        // Attendre avant de réessayer avec backoff exponentiel
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError!;
}
```

---

### 4. **Route API : Upload Multiple (Intakes)**
**Fichier :** `app/api/intakes/upload/route.ts`

**Fonction :** Upload multiple de fichiers en parallèle pour les formulaires d'intake (propriétaires/locataires).

**Endpoint :** `POST /api/intakes/upload`

**Caractéristiques :**
- Accepte FormData avec plusieurs fichiers
- Mapping automatique des noms de fichiers vers DocumentKind
- Upload parallèle de tous les fichiers
- Création automatique des documents dans la DB
- Gestion des erreurs avec Promise.allSettled

**Mapping des fichiers :**
```12:28:app/api/intakes/upload/route.ts
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
```

**Fonction principale (extrait) :**
```30:387:app/api/intakes/upload/route.ts
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
            // Générer un nom de fichier unique avec timestamp et index pour éviter les collisions
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 9);
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const fileName = `intakes/${token}/${timestamp}-${randomSuffix}-${sanitizedName}`;

            const blobStartTime = Date.now();
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            console.log(`[API upload] Début upload ${name} vers Vercel Blob (${fileSizeMB} MB)`);
            
            // Uploader le fichier vers Vercel Blob (en parallèle avec les autres)
            // La fonction put() gère automatiquement les multipart uploads pour fichiers > 100MB
            // selon la documentation Vercel Blob: https://vercel.com/docs/vercel-blob
            const blob = await put(fileName, file, {
              access: "public",
              token: process.env.BLOB_READ_WRITE_TOKEN,
              contentType: file.type || "application/octet-stream", // S'assurer que le Content-Type est défini
              // addRandomSuffix: false, // On gère déjà l'unicité avec timestamp + randomSuffix
            });
            
            const blobUploadTime = Date.now() - blobStartTime;
            console.log(`[API upload] Upload ${name} vers Vercel Blob terminé en ${blobUploadTime}ms (${(blobUploadTime / 1000).toFixed(2)}s)`);
            
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
              fileKey: blob.url,
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
                fileKey: blob.url,
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
            console.log(`[API upload] Total pour ${name}: ${Date.now() - fileStartTime}ms (Blob: ${blobUploadTime}ms, DB: ${dbTime}ms)`);

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
```

---

### 5. **Route API : Création de Documents après Upload**
**Fichier :** `app/api/intakes/create-documents/route.ts`

**Fonction :** Crée les documents dans la DB après un upload direct côté client (utilisé avec le composant FileUpload).

**Endpoint :** `POST /api/intakes/create-documents`

**Fonction principale :**
```9:224:app/api/intakes/create-documents/route.ts
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
    const maxSizeInBytes = 4 * 1024 * 1024; // 4MB

    // Créer chaque document dans la DB
    for (const doc of documents) {
      try {
        // Valider la taille du fichier (max 4MB)
        if (doc.size && doc.size > maxSizeInBytes) {
          console.warn(`[create-documents] Document ${doc.fileName} trop volumineux: ${(doc.size / 1024 / 1024).toFixed(2)} MB`);
          continue; // Ignorer ce document
        }
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
```

---

### 6. **Route API : Upload Document Client**
**Fichier :** `app/api/clients/upload-document/route.ts`

**Fonction :** Upload de document depuis l'interface notaire pour un client existant.

**Endpoint :** `POST /api/clients/upload-document`

**Caractéristiques :**
- Requiert authentification
- Upload vers Vercel Blob
- Création du document dans la DB
- Mise à jour du statut de complétion du client

**Fonction principale :**
```14:145:app/api/clients/upload-document/route.ts
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get("file") as File | null;
    const kind = formData.get("kind") as string | null;
    const personId = formData.get("personId") as string | null;
    const entrepriseId = formData.get("entrepriseId") as string | null;
    const clientIdParam = formData.get("clientId") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    if (!kind || !Object.values(DocumentKind).includes(kind as DocumentKind)) {
      return NextResponse.json(
        { error: "Type de document invalide" },
        { status: 400 }
      );
    }

    if (!personId && !entrepriseId && !clientIdParam) {
      return NextResponse.json(
        { error: "ID personne, entreprise ou client manquant" },
        { status: 400 }
      );
    }

    // Récupérer le clientId depuis Person, Entreprise ou directement depuis le paramètre
    let clientId: string | null = null;
    
    if (clientIdParam) {
      // Vérifier que le client existe
      const client = await prisma.client.findUnique({
        where: { id: clientIdParam },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json(
          { error: "Client introuvable" },
          { status: 404 }
        );
      }
      clientId = clientIdParam;
    } else if (personId) {
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
      clientId = person.clientId;
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
      clientId = entreprise.clientId;
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "Client introuvable" },
        { status: 404 }
      );
    }

    // Générer un nom de fichier unique avec timestamp pour tri chronologique
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `documents/${clientId}/${timestamp}-${sanitizedName}`;

    // Uploader le fichier vers Vercel Blob
    // La fonction put() gère automatiquement les multipart uploads pour fichiers > 100MB
    // selon la documentation Vercel Blob: https://vercel.com/docs/vercel-blob
    const blob = await put(fileName, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type || "application/octet-stream", // S'assurer que le Content-Type est défini
    });

    // Créer le document dans la base de données
    const document = await prisma.document.create({
      data: {
        kind: kind as DocumentKind,
        label: file.name,
        fileKey: blob.url,
        mimeType: file.type,
        size: file.size,
        ...(personId && { personId }),
        ...(entrepriseId && { entrepriseId }),
        ...(clientIdParam && { clientId: clientIdParam }),
      },
    });

    // Mettre à jour le statut de complétion
    await calculateAndUpdateClientStatus(clientId);

    revalidatePath(`/interface/clients/${clientId}`);
    revalidatePath(`/interface/clients/${clientId}/edit`);

    return NextResponse.json({ 
      success: true, 
      document: {
        id: document.id,
        kind: document.kind,
        label: document.label,
        fileKey: document.fileKey,
        mimeType: document.mimeType,
      }
    });
  } catch (error: any) {
    console.error("Erreur lors de l'upload du document:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'upload du document" },
      { status: 500 }
    );
  }
}
```

---

## 🛠️ Utilitaires d'Upload

### 7. **Utilitaire : Upload Client Optimisé**
**Fichier :** `lib/utils/blob-client-upload.ts`

**Fonction :** Fonctions utilitaires pour upload direct côté client avec gestion de progression.

**Fonctions principales :**
- `uploadFileDirect` : Upload un fichier directement vers Vercel Blob
- `batchUploadFiles` : Upload batch avec parallélisme contrôlé

---

### 8. **Utilitaire : Upload Intake Optimisé**
**Fichier :** `lib/utils/intake-upload-optimized.ts`

**Fonction :** Version optimisée pour les uploads d'intake avec gestion de progression par document.

**Fonction principale :**
- `uploadFilesOptimized` : Upload batch optimisé avec création de documents

---

## 📋 Actions Serveur

### 9. **Action : Upload et Création de Document**
**Fichier :** `lib/actions/documents.ts`

**Fonction :** `uploadFileAndCreateDocument` - Helper pour uploader un fichier et créer un document dans la DB.

**Utilisation :** Utilisée dans les formulaires serveur (formulaires propriétaires, etc.)

**Fonction :**
```156:209:lib/actions/documents.ts
async function uploadFileAndCreateDocument(
  file: File | null | undefined,
  kind: DocumentKind,
  options: {
    clientId?: string;
    personId?: string;
    entrepriseId?: string;
    propertyId?: string;
    bailId?: string;
    label?: string;
  }
) {
  if (!file) return null;

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
      personId: options.personId,
      entrepriseId: options.entrepriseId,
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
```

---

## 🎨 Composants d'Affichage

### 10. **Composant : Document Uploaded**
**Fichier :** `components/intakes/document-uploaded.tsx`

**Fonction :** Affiche un document uploadé avec possibilité de visualisation, téléchargement et suppression.

**Fonctionnalités :**
- Affichage du document uploadé
- Visualisation (PDF, images)
- Téléchargement
- Suppression avec confirmation
- Cache des documents pour éviter les rechargements

**Utilisation :** Utilisé dans les formulaires d'intake pour afficher les documents déjà uploadés.

---

## 📊 Flux d'Upload

### **Flux 1 : Upload Direct Côté Client (Optimisé)**
1. Utilisateur sélectionne un fichier dans `FileUpload`
2. `FileUpload` appelle `/api/blob/generate-upload-token` pour obtenir le token
3. `FileUpload` upload directement vers Vercel Blob avec `put()` du SDK client
4. `FileUpload` appelle `/api/intakes/create-documents` pour créer le document dans la DB
5. Un événement `document-uploaded-${token}` est déclenché pour rafraîchir l'affichage

### **Flux 2 : Upload Multiple via Serveur**
1. Formulaire soumet plusieurs fichiers via FormData
2. Appel à `/api/intakes/upload` avec tous les fichiers
3. Le serveur upload tous les fichiers en parallèle vers Vercel Blob
4. Le serveur crée tous les documents dans la DB
5. Retourne la liste des documents créés

### **Flux 3 : Upload depuis Interface Notaire**
1. Notaire sélectionne un fichier dans l'interface
2. Appel à `/api/clients/upload-document` avec authentification
3. Upload vers Vercel Blob
4. Création du document dans la DB
5. Mise à jour du statut de complétion

---

## 🔐 Sécurité

- **Validation des tokens** : Tous les endpoints vérifient que le token d'intake est valide et non révoqué
- **Validation des types MIME** : Seuls les types autorisés sont acceptés
- **Validation de taille** : Limites de taille selon le contexte (4MB pour FileUpload, 20MB pour blob/upload)
- **Authentification** : L'endpoint `/api/clients/upload-document` requiert une authentification
- **Sanitisation des noms de fichiers** : Les noms de fichiers sont sanitizés avant upload

---

## 📝 Notes Techniques

- **Multipart Upload** : Activé automatiquement pour fichiers > 100MB par Vercel Blob
- **Retry Logic** : Implémenté dans `/api/blob/upload` avec backoff exponentiel
- **Uploads Parallèles** : Gérés avec `Promise.allSettled` pour ne pas bloquer sur une erreur
- **Progression** : Simulée côté client (Vercel Blob SDK ne fournit pas de callback de progression réel)
- **Organisation des fichiers** : Structure `intakes/{token}/{timestamp}-{random}-{filename}` pour tri chronologique

---

## 🎯 Points d'Entrée Principaux

1. **Formulaires d'Intake** : Utilisent `FileUpload` avec upload direct
2. **Interface Notaire** : Utilise `/api/clients/upload-document`
3. **Formulaires Serveur** : Utilisent `uploadFileAndCreateDocument` depuis `lib/actions/documents.ts`

---

## 📌 Limitations Actuelles

- Progression simulée (pas de progression réelle depuis Vercel Blob SDK)
- Token d'upload complet exposé côté client (devrait être temporaire en production)
- Taille max 4MB pour FileUpload, 20MB pour blob/upload

---

## 🔄 Améliorations Possibles

1. Générer des tokens temporaires avec permissions limitées
2. Implémenter une progression réelle avec XMLHttpRequest
3. Ajouter compression d'images avant upload
4. Implémenter upload résumable pour gros fichiers
5. Ajouter validation de contenu (détection de virus, scan de contenu)






