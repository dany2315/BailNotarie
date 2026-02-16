# Migration de Vercel Blob vers AWS S3

## ✅ Modifications Effectuées

### 1. **Nouveau fichier : `lib/utils/s3-client.ts`**
   - Utilitaire complet pour les uploads S3 avec URLs signées
   - Fonctions pour générer des URLs signées pour upload direct
   - Fonctions pour upload depuis le serveur (fallback)
   - URLs publiques S3 directes

### 2. **Composant FileUpload modifié**
   - Remplacement de l'upload Vercel Blob par upload S3 avec URL signée
   - Progression réelle avec XMLHttpRequest (au lieu de simulation)
   - Upload direct depuis le client vers S3

### 3. **Routes API modifiées**
   - `/api/blob/generate-upload-token` : Génère maintenant des URLs signées S3
   - `/api/blob/upload` : Utilise S3 au lieu de Blob
   - `/api/intakes/upload` : Utilise S3 pour les uploads multiples
   - `/api/clients/upload-document` : Utilise S3 pour les uploads depuis l'interface notaire

### 4. **Actions serveur modifiées**
   - `lib/actions/documents.ts` : Utilise S3 pour les uploads de documents

### 5. **Dépendances ajoutées**
   - `@aws-sdk/client-s3` : Client SDK AWS S3
   - `@aws-sdk/s3-request-presigner` : Pour générer des URLs signées

## 🔧 Configuration Requise

### Variables d'environnement à ajouter dans `.env` :

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=eu-west-3
AWS_S3_BUCKET_NAME=your-bucket-name
```

## 📋 Installation

1. **Installer les dépendances AWS SDK** :
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

2. **Configurer AWS S3** :
   - Créer un bucket S3 dans votre région préférée
   - Créer un utilisateur IAM avec les permissions suivantes :
     - `s3:PutObject` : Pour uploader des fichiers
     - `s3:GetObject` : Pour lire des fichiers (si besoin)
     - `s3:DeleteObject` : Pour supprimer des fichiers (si besoin)
   - Configurer les variables d'environnement

3. **Configuration du bucket S3** :
   - Activer CORS pour permettre les uploads depuis le navigateur
   - Configuration CORS recommandée :
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "POST", "GET"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

## 🚀 Avantages de la Migration

1. **Uploads plus rapides** : Upload direct depuis le client vers S3 sans passer par le serveur
2. **Progression réelle** : Suivi de progression réel avec XMLHttpRequest
3. **Scalabilité** : S3 peut gérer des fichiers beaucoup plus volumineux
4. **Coûts** : Généralement moins cher que Vercel Blob pour de gros volumes
5. **Simplicité** : Utilisation directe des URLs S3 sans configuration supplémentaire

## 🔄 Flux d'Upload avec S3

### Upload Direct (Recommandé)
1. Client demande une URL signée S3 via `/api/blob/generate-upload-token`
2. Serveur génère une URL signée valide 1 heure
3. Client upload directement vers S3 avec l'URL signée (PUT request)
4. Client notifie le serveur pour créer le document dans la DB

### Upload via Serveur (Fallback)
1. Client envoie le fichier au serveur via FormData
2. Serveur upload vers S3
3. Serveur crée le document dans la DB

## 📝 Notes Importantes

- Les URLs signées sont valides pendant 1 heure par défaut
- Les fichiers sont organisés dans S3 avec la structure : `{prefix}/{token}/{timestamp}-{random}-{filename}`
- Les URLs publiques utilisent directement les URLs S3 : `https://{bucket}.s3.{region}.amazonaws.com/{fileKey}`
- La progression de l'upload est maintenant réelle (pas simulée)

## 🐛 Dépannage

### Erreur : "Access Denied"
- Vérifier les permissions IAM de l'utilisateur AWS
- Vérifier la configuration CORS du bucket S3

### Erreur : "Invalid signature"
- Vérifier que les variables d'environnement AWS sont correctes
- Vérifier que l'URL signée n'a pas expiré (1 heure)

### Upload lent
- Vérifier la région S3 (utiliser une région proche des utilisateurs)
- Vérifier la connexion réseau et la taille des fichiers

## 🔐 Sécurité

- Les URLs signées sont temporaires (1 heure)
- Les permissions sont limitées à PUT pour l'upload
- Validation côté serveur avant génération de l'URL signée
- Les fichiers sont organisés par token d'intake pour isolation

## 📚 Documentation AWS S3

- [AWS S3 SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)


