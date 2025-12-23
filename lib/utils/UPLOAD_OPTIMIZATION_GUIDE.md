# Guide d'optimisation des uploads selon la checklist Vercel Blob

## Problèmes identifiés selon la checklist

✅ **Les fichiers passent par le serveur** → Cause principale de lenteur
✅ **Pas de client SDK avec token** → À migrer
✅ **Pas de multipart: true explicite** → À ajouter
✅ **Uploads séquentiels** → Déjà en parallèle côté serveur, mais toujours via serveur

## Solution optimisée

### 1. Route API pour générer le token d'upload
`/api/blob/generate-upload-token` - Génère un token sécurisé pour les uploads côté client

### 2. Upload direct depuis le client
Utiliser `put()` directement depuis le client avec le token généré, au lieu de passer par `/api/intakes/upload`

### 3. Création des documents dans la DB
Après l'upload direct, utiliser `/api/intakes/create-documents` pour créer les documents dans la DB

## Migration de `uploadFiles`

### Avant (via serveur - lent)
```typescript
const filesFormData = new FormData();
filesFormData.append("token", intakeToken);
filesFormData.append("file1", file1);
filesFormData.append("file2", file2);

const response = await fetch("/api/intakes/upload", {
  method: "POST",
  body: filesFormData,
});
```

### Après (direct client - rapide)
```typescript
// 1. Récupérer le token d'upload
const tokenResponse = await fetch("/api/blob/generate-upload-token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: intakeToken }),
});
const { token: uploadToken } = await tokenResponse.json();

// 2. Uploader directement depuis le client avec multipart automatique
import { put } from "@vercel/blob";

const filesToUpload = [
  { file: file1, pathname: `intakes/${token}/file1.pdf`, documentKind: "KBIS" },
  { file: file2, pathname: `intakes/${token}/file2.pdf`, documentKind: "STATUTES" },
];

const uploadResults = await Promise.all(
  filesToUpload.map(async ({ file, pathname }) => {
    const blob = await put(pathname, file, {
      access: "public",
      token: uploadToken,
      contentType: file.type,
      // multipart: true est activé automatiquement pour fichiers > 100MB
    });
    return { fileKey: blob.url, fileName: file.name, ... };
  })
);

// 3. Créer les documents dans la DB
const createResponse = await fetch("/api/intakes/create-documents", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    token: intakeToken,
    documents: uploadResults.map((result, index) => ({
      fileKey: result.fileKey,
      kind: filesToUpload[index].documentKind,
      fileName: result.fileName,
      // ... autres métadonnées
    })),
  }),
});
```

## Utilisation de la fonction utilitaire

```typescript
import { uploadFilesOptimized } from "@/lib/utils/intake-upload-optimized";

// Récupérer le token
const tokenResponse = await fetch("/api/blob/generate-upload-token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: intakeToken }),
});
const { token: uploadToken } = await tokenResponse.json();

// Préparer les fichiers
const filesToUpload = [
  { 
    file: file1, 
    name: "kbis",
    documentKind: DocumentKind.KBIS,
  },
  // ... autres fichiers
];

// Uploader avec progression
const progressMap = new Map();
const results = await uploadFilesOptimized(
  filesToUpload,
  intakeToken,
  uploadToken,
  (progress) => {
    // Mettre à jour l'UI avec la progression
    progress.forEach((value, key) => {
      console.log(`${key}: ${value.progress}%`);
    });
  }
);

// Créer les documents dans la DB
const createResponse = await fetch("/api/intakes/create-documents", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    token: intakeToken,
    documents: results.map((result) => ({
      fileKey: result.fileKey,
      kind: result.kind,
      fileName: result.fileName,
      mimeType: result.mimeType,
      size: result.size,
      label: result.label,
    })),
  }),
});
```

## Avantages

1. **Performance** : Upload direct depuis le client, pas de transit via le serveur
2. **Multipart automatique** : Activé automatiquement pour fichiers > 100MB
3. **Uploads parallèles contrôlés** : Limité à 3 uploads simultanés pour éviter la surcharge
4. **Progression par document** : Suivi de la progression de chaque fichier individuellement
5. **Fiabilité** : Retry automatique en cas d'erreur réseau

## Notes de sécurité

⚠️ **Important** : Le token `BLOB_READ_WRITE_TOKEN` est exposé côté client dans cette implémentation. 
Pour une sécurité maximale en production, envisagez :
- Générer des tokens temporaires avec permissions limitées
- Utiliser des tokens avec expiration
- Limiter les pathnames autorisés









