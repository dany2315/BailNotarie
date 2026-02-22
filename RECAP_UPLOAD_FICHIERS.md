# 📤 Récapitulatif : Système d'Upload de Fichiers

## 🎯 Vue d'ensemble

Tous les fichiers sont uploadés vers **AWS S3** avec une nomenclature uniforme : `documents/{timestamp}-{randomSuffix}-{sanitizedName}`

Le système utilise des **URLs signées S3** pour permettre des uploads directs depuis le client vers S3, sans passer par le serveur (plus rapide et scalable).

---

## 🔄 Flux d'Upload Standard (Recommandé)

### Méthode : Upload Direct Client → S3

```
1. Client sélectionne un fichier
   ↓
2. Client demande une URL signée S3 via `/api/blob/generate-upload-token`
   ↓
3. Serveur génère une URL signée valide 1h et retourne : { signedUrl, fileKey, publicUrl }
   ↓
4. Client upload directement vers S3 avec PUT request vers signedUrl
   ↓
5. Client crée le document dans la DB via `/api/documents/create` avec publicUrl
   ↓
6. Serveur crée/mise à jour le document dans Prisma
```

**Avantages :**
- ✅ Upload rapide (direct vers S3)
- ✅ Progression réelle avec XMLHttpRequest
- ✅ Pas de limite de taille côté serveur
- ✅ Scalable

---

## 📍 Endroits où les fichiers sont uploadés

### 1. **Composant FileUpload** (Principal)
**Fichier :** `components/ui/file-upload.tsx`

**Utilisation :** Composant réutilisable utilisé partout dans l'application

**Fonctionnement :**
- Si `documentKind` est fourni → Upload automatique vers S3
- Sinon → Stocke juste le fichier dans le state (pour upload manuel)

**Props importantes :**
- `uploadToken` : Token d'intake (pour les formulaires d'intake)
- `documentClientId`, `documentPersonId`, `documentPropertyId`, `documentBailId` : Pour les documents clients/propriétés
- `documentKind` : Type de document (KBIS, ID_IDENTITY, etc.)
- `onUploadComplete`, `onUploadProgress`, `onUploadStateChange` : Callbacks

**Flux :**
```typescript
1. handleFileChange() ou handleDrop()
   ↓
2. fetch("/api/blob/generate-upload-token") avec contexte
   ↓
3. uploadFileToS3(file, signedUrl) avec XMLHttpRequest + progression
   ↓
4. fetch("/api/documents/create") pour créer le document dans la DB
   ↓
5. Émission d'événements CustomEvent pour recharger les documents
```

**Où utilisé :**
- ✅ `components/intakes/owner-intake-form.tsx` (formulaire propriétaire)
- ✅ `components/intakes/tenant-intake-form.tsx` (formulaire locataire)
- ✅ `components/clients/edit-client-form.tsx` (édition client)
- ✅ `components/client/create-property-form.tsx` (création propriété)

---

### 2. **Formulaires d'Intake (TenantIntakeForm)**
**Fichier :** `components/intakes/tenant-intake-form.tsx`

**Fonction :** `uploadSingleFile()` (ligne 984)

**Fonctionnement :**
- Upload manuel lors de la soumission du formulaire
- Utilise le même flux que FileUpload mais avec gestion personnalisée

**Flux :**
```typescript
1. uploadSingleFile(file, name, personIndex)
   ↓
2. fetch("/api/blob/generate-upload-token") avec token d'intake
   ↓
3. XMLHttpRequest PUT vers signedUrl
   ↓
4. fetch("/api/documents/create") pour créer le document
```

**Note :** Cette méthode est utilisée pour les uploads multiples lors de la soumission du formulaire d'intake.

---

### 3. **Chat de Bail (Messages avec fichiers)**
**Fichier :** `components/client/bail-chat-sheet.tsx`

**Fonction :** `onSubmit()` (ligne 845) et fonction inline (ligne 894)

**Fonctionnement :**
- Upload de fichiers joints aux messages de chat
- Upload multiple en parallèle avec progression globale

**Flux :**
```typescript
1. Utilisateur sélectionne fichiers et envoie message
   ↓
2. Pour chaque fichier :
   - fetch("/api/blob/generate-upload-token") avec bailId
   - uploadFileToS3(file, signedUrl) avec progression
   ↓
3. Tous les fichiers uploadés → fetch("/api/bail-messages/send") avec URLs publiques
   ↓
4. Serveur crée le message et les documents associés
```

**Fonction utilitaire :** `uploadFileToS3()` (ligne 50) - fonction locale avec progression

---

### 4. **Actions Serveur (Upload via Serveur)**
**Fichier :** `lib/actions/bail-messages.ts`

**Fonctions :**
- `sendBailMessageWithFile()` (ligne 746)
- `addDocumentToNotaireRequestWithFile()` (ligne 1299)

**Fonctionnement :**
- Upload depuis le serveur (fallback)
- Utilise `uploadFileToS3()` de `lib/utils/s3-client.ts`
- Utilisé quand l'upload direct n'est pas possible

**Flux :**
```typescript
1. Serveur reçoit FormData avec fichiers
   ↓
2. Pour chaque fichier :
   - generateS3FileKey(file.name) → génère la clé S3
   - uploadFileToS3(file, fileKey) → upload vers S3 depuis serveur
   ↓
3. Création des documents dans Prisma avec URL publique S3
```

**Note :** Cette méthode est moins optimale car les fichiers passent par le serveur.

---

### 5. **Actions Documents (Helper)**
**Fichier :** `lib/actions/documents.ts`

**Fonction :** `uploadFileAndCreateDocument()` (ligne 209)

**Fonctionnement :**
- Helper pour uploader un fichier depuis le serveur
- Utilisé dans les formulaires serveur (formulaires propriétaires, etc.)
- **⚠️ DEPRECATED** : Les commentaires indiquent que cette fonction est obsolète

**Flux :**
```typescript
1. uploadFileAndCreateDocument(file, kind, options)
   ↓
2. generateS3FileKey(file.name) → génère la clé S3
   ↓
3. uploadFileToS3(file, fileKey) → upload depuis serveur
   ↓
4. prisma.document.create() → crée le document dans la DB
   ↓
5. Met à jour les statuts de complétion
```

**Où utilisé :**
- `lib/actions/documents.ts` : `createClientFromIntake()`, `updateClientFromIntake()` (fonctions deprecated)

---

## 🔧 Routes API

### 1. **`/api/blob/generate-upload-token`**
**Fichier :** `app/api/blob/generate-upload-token/route.ts`

**Rôle :** Génère une URL signée S3 pour upload direct

**Paramètres acceptés :**
- `token` : Token d'intake
- `clientId`, `personId`, `entrepriseId`, `propertyId`, `bailId` : Contexte du document
- `fileName` : Nom du fichier
- `contentType` : Type MIME (optionnel)
- `documentKind` : Type de document (optionnel)

**Fonctionnement :**
1. Valide que l'entité existe (intakeLink, client, personne, etc.)
2. Génère la clé S3 avec `generateS3FileKey(fileName)`
3. Génère l'URL signée avec `generateSignedUploadUrl(fileKey)`
4. Retourne `{ signedUrl, fileKey, publicUrl, expiresIn }`

**Validation :**
- Vérifie que l'intakeLink existe et n'est pas révoqué
- Vérifie que les entités (client, personne, etc.) existent
- Retourne 404 si entité introuvable
- Retourne 403 si intakeLink révoqué

---

### 2. **`/api/documents/create`**
**Fichier :** `app/api/documents/create/route.ts`

**Rôle :** Crée un document dans la DB après upload

**Paramètres acceptés :**
- `token` : Token d'intake
- `clientId`, `personId`, `entrepriseId`, `propertyId`, `bailId` : Contexte
- `fileKey` : URL publique S3
- `kind` : Type de document (DocumentKind)
- `fileName`, `mimeType`, `size`, `label` : Métadonnées
- `personIndex` : Index de la personne (pour ID_IDENTITY)

**Fonctionnement :**
1. Détermine où attacher le document selon le `kind` :
   - `ID_IDENTITY` → Personne
   - `KBIS`, `STATUTES` → Entreprise
   - `DIAGNOSTICS`, `TITLE_DEED`, etc. → Propriété
   - `INSURANCE`, `RIB` → Client ou Propriété selon profil
   - Autres → Client
2. Vérifie si le document existe déjà (même fileKey + kind + contexte)
3. Crée ou met à jour le document dans Prisma
4. Met à jour les statuts de complétion
5. Revalide les chemins Next.js

**Logique d'attachement :**
- Documents par personne : attachés à la personne correspondante
- Documents entreprise : attachés à l'entreprise du client
- Documents propriété : attachés à la propriété
- Documents client : attachés au client

---

## 🛠️ Utilitaires S3

### **`lib/utils/s3-client.ts`**

#### `generateS3FileKey(fileName: string): string`
Génère une clé S3 unique avec le pattern : `documents/{timestamp}-{randomSuffix}-{sanitizedName}`

**Exemple :** `documents/1704123456789-abc1234-document_pdf.pdf`

#### `generateSignedUploadUrl(fileKey: string, expiresIn?: number): Promise<string>`
Génère une URL signée pour upload PUT vers S3 (valide 1h par défaut)

#### `uploadFileToS3(file: File | Buffer, fileKey: string, contentType?: string): Promise<S3UploadResult>`
Upload un fichier depuis le serveur vers S3 (fallback)

#### `uploadFileDirectToS3(file: File, signedUrl: string, onProgress?: (progress: number) => void): Promise<void>`
Upload un fichier depuis le client vers S3 avec URL signée (avec progression)

#### `deleteFileFromS3(fileKey: string): Promise<void>`
Supprime un fichier de S3

#### `extractS3KeyFromUrl(url: string): string | null`
Extrait la clé S3 depuis une URL publique

---

## 📋 Nomenclature des Fichiers

**Pattern uniforme :** `documents/{timestamp}-{randomSuffix}-{sanitizedName}`

**Exemples :**
- `documents/1704123456789-abc1234-kbis.pdf`
- `documents/1704123456789-xyz5678-carte_identite.pdf`
- `documents/1704123456789-def9012-assurance.pdf`

**Caractéristiques :**
- `timestamp` : Date.now() en millisecondes (tri chronologique)
- `randomSuffix` : 7 caractères alphanumériques (unicité)
- `sanitizedName` : Nom original avec caractères spéciaux remplacés par `_`

**Tous les fichiers sont dans le dossier `documents/`** (pas de sous-dossiers par identifiant)

---

## 🔐 Sécurité

### URLs Signées
- ✅ Valides 1 heure seulement
- ✅ Permissions limitées à PUT pour l'upload
- ✅ Validation côté serveur avant génération
- ✅ Pas de Content-Type dans la signature (évite les problèmes de correspondance)

### Validation
- ✅ Vérification de l'existence des entités avant génération d'URL
- ✅ Vérification du statut des intakeLinks (pas révoqué)
- ✅ Pas d'authentification requise pour les uploads (contrôlé par validation des entités)

---

## 📊 Comparaison des Méthodes

| Méthode | Flux | Vitesse | Progression | Utilisation |
|---------|------|---------|-------------|-------------|
| **FileUpload** | Client → S3 → DB | ⚡⚡⚡ | ✅ Réelle | ✅ Recommandé |
| **TenantIntakeForm** | Client → S3 → DB | ⚡⚡⚡ | ✅ Réelle | Uploads multiples |
| **BailChatSheet** | Client → S3 → DB | ⚡⚡⚡ | ✅ Réelle | Messages avec fichiers |
| **Actions Serveur** | Client → Serveur → S3 → DB | ⚡⚡ | ❌ Non | Fallback uniquement |

---

## 🎯 Recommandations

1. **Utiliser FileUpload** pour tous les nouveaux uploads
2. **Éviter les uploads via serveur** sauf cas spécifiques
3. **Toujours fournir `documentKind`** pour activer l'upload automatique
4. **Gérer la progression** avec `onUploadProgress` pour UX
5. **Gérer les erreurs** avec try/catch et affichage utilisateur

---

## 🐛 Dépannage

### Erreur "Access Denied"
- Vérifier les permissions IAM AWS
- Vérifier la configuration CORS du bucket S3

### Erreur "Invalid signature"
- Vérifier les variables d'environnement AWS
- Vérifier que l'URL signée n'a pas expiré (1h)

### Upload lent
- Vérifier la région S3 (utiliser région proche des utilisateurs)
- Vérifier la connexion réseau et la taille des fichiers

### Document non créé dans la DB
- Vérifier que `/api/documents/create` est appelé après l'upload
- Vérifier les logs serveur pour erreurs de création
- Vérifier que le `documentKind` est correct

---

## 📝 Notes Importantes

- ⚠️ **Tous les fichiers sont publics** (URLs publiques S3)
- ⚠️ **Pas de limite de taille** côté client (limité par S3)
- ⚠️ **Les fichiers sont organisés par timestamp** pour tri chronologique
- ⚠️ **Les documents existants sont mis à jour** si même fileKey + kind + contexte
- ⚠️ **Les statuts de complétion sont mis à jour automatiquement** après création de document

---

## 🔄 Migration depuis Vercel Blob

- ✅ Migration complète vers S3 effectuée
- ✅ Anciens fichiers Vercel Blob supprimés (`intake-upload-optimized.ts`, `blob-client-upload.ts`)
- ✅ Pattern uniforme : `documents/{timestamp}-{random}-{name}`
- ✅ Tous les uploads utilisent maintenant S3 avec URLs signées








