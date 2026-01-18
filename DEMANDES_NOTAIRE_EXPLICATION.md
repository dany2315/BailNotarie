# Explication du Système de Demandes du Notaire

## 🔧 Résolution du Problème Prisma

### Problème rencontré
L'erreur `Unknown field 'document' for include statement on model 'BailMessage'` se produit car le client Prisma n'a pas été régénéré après l'ajout de la relation `document` dans le schéma.

### Solution
1. **Arrêter le serveur de développement** (Ctrl+C dans le terminal où il tourne)
2. **Régénérer le client Prisma** :
   ```bash
   npx prisma generate
   ```
3. **Redémarrer le serveur de développement** :
   ```bash
   npm run dev
   ```

### Correction appliquée
- Correction du type `DocumentKind` dans `sendBailMessageWithFile` : utilisation de `ID_IDENTITY` au lieu de `OTHER` (qui n'existe pas dans l'enum)

---

## 📋 Fonctionnement des Demandes du Notaire

### Vue d'ensemble
Le système de demandes permet au notaire de demander des documents ou des informations aux parties (propriétaire et/ou locataire) dans le cadre d'un dossier de bail.

### Architecture du Système

#### 1. **Modèles de Données**

##### `DossierNotaireAssignment`
- Représente l'assignation d'un notaire à un dossier
- Lie un notaire à un client, une propriété et/ou un bail
- Un dossier peut avoir plusieurs demandes (`NotaireRequest[]`)

##### `NotaireRequest`
- Représente une demande spécifique du notaire
- **Types de demande** :
  - `DOCUMENT` : Demande de pièce/document
  - `DATA` : Demande de données/informations
- **Destinataires** :
  - `targetProprietaire` : Si la demande s'adresse au propriétaire
  - `targetLocataire` : Si la demande s'adresse au locataire
  - Les deux peuvent être sélectionnés simultanément
- **Statuts** :
  - `PENDING` : En attente de réponse (par défaut)
  - `COMPLETED` : Complétée
  - `CANCELLED` : Annulée

##### `BailMessage`
- Messages de chat associés à un bail
- Peut être lié à une demande via `notaireRequestId`
- Types de messages :
  - `MESSAGE` : Message texte normal
  - `REQUEST` : Message lié à une demande `NotaireRequest`

#### 2. **Flux de Fonctionnement**

##### Création d'une Demande (Notaire)
1. Le notaire ouvre le chat d'un bail dans son interface
2. Il clique sur "Créer une demande"
3. Il remplit le formulaire :
   - **Type** : DOCUMENT ou DATA
   - **Titre** : Titre de la demande
   - **Contenu** : Description détaillée
   - **Destinataires** : Propriétaire et/ou Locataire
4. La demande est créée dans `NotaireRequest`
5. Un message automatique est ajouté au chat : "Nouvelle demande : [titre]"
6. Les parties concernées voient la demande dans leur interface

##### Visualisation des Demandes (Client)
1. Le client (propriétaire ou locataire) ouvre le chat de son bail
2. Il voit :
   - Les messages normaux du chat
   - Les demandes qui lui sont adressées (selon son profil)
3. Il peut répondre aux demandes en :
   - Envoyant un message texte
   - Envoyant un document (fichier joint)

##### Réponse à une Demande
1. Le client répond via le chat (message ou document)
2. Le notaire voit la réponse dans le chat
3. Le notaire peut marquer la demande comme `COMPLETED` ou `CANCELLED`

#### 3. **Permissions et Sécurité**

##### Pour les Notaires
- Seuls les notaires assignés à un dossier peuvent créer des demandes pour ce dossier
- Un notaire ne peut voir que les demandes de ses propres dossiers

##### Pour les Clients
- Un client ne peut voir que les demandes qui lui sont adressées :
  - Propriétaire : voit les demandes avec `targetProprietaire = true`
  - Locataire : voit les demandes avec `targetLocataire = true`
- Un client ne peut créer que des messages de réponse, pas de nouvelles demandes

#### 4. **Fichiers et Documents**

##### Envoi de Fichiers dans le Chat
- Les fichiers sont uploadés vers Vercel Blob Storage
- Un document `Document` est créé dans la base de données
- Le document est lié au message via `documentId`
- Le document est également lié au bail via `bailId`

##### Structure des Documents
- `fileKey` : URL du fichier dans le blob storage
- `label` : Nom du fichier
- `mimeType` : Type MIME du fichier
- `size` : Taille du fichier en octets

#### 5. **Fonctions Principales**

##### `getBailMessages(bailId: string)`
- Récupère tous les messages d'un bail
- Inclut : sender, document (si présent), notaireRequest (si présent)
- Vérifie les permissions avant de retourner les messages

##### `getNotaireRequestsByBail(bailId: string)`
- Récupère toutes les demandes associées à un bail
- Trouve d'abord le dossier via `DossierNotaireAssignment`
- Retourne les demandes avec les informations du créateur

##### `createNotaireRequest(data)`
- Crée une nouvelle demande
- Vérifie que :
  - L'utilisateur est un notaire
  - Le notaire est assigné au dossier
  - Au moins un destinataire est sélectionné

##### `sendBailMessage(bailId: string, content: string)`
- Envoie un message texte dans le chat
- Vérifie les permissions avant d'envoyer

##### `sendBailMessageWithFile(bailId: string, formData: FormData)`
- Envoie un message avec un fichier joint
- Upload le fichier vers Vercel Blob
- Crée un document dans la base de données
- Crée le message avec le document lié

### 6. **Interface Utilisateur**

#### Côté Notaire
- **Composant** : `NotaireBailChat` ou `NotaireBailChatSheet`
- **Fonctionnalités** :
  - Voir tous les messages du chat
  - Créer de nouvelles demandes
  - Voir toutes les demandes du bail
  - Envoyer des messages texte ou avec fichiers

#### Côté Client
- **Composant** : `BailChat` ou `BailChatSheet`
- **Fonctionnalités** :
  - Voir les messages du chat
  - Voir les demandes qui lui sont adressées
  - Répondre aux demandes (texte ou fichier)
  - Envoyer des messages texte ou avec fichiers

### 7. **Améliorations Possibles**

1. **Ajouter un type `OTHER` à `DocumentKind`** pour les fichiers du chat génériques
2. **Système de notifications** : Notifier les clients quand une nouvelle demande est créée
3. **Statut des demandes** : Permettre au notaire de marquer une demande comme complétée depuis l'interface
4. **Historique** : Afficher l'historique des réponses à une demande
5. **Pièces jointes multiples** : Permettre d'envoyer plusieurs fichiers en un seul message

---

## 🔍 Structure des Relations

```
DossierNotaireAssignment (1) ──→ (N) NotaireRequest
                                      │
                                      │ (via notaireRequestId)
                                      ↓
BailMessage ──→ Document (via documentId)
     │
     └──→ NotaireRequest (via notaireRequestId)
```

---

## 📝 Notes Importantes

- Les demandes sont toujours associées à un `DossierNotaireAssignment`, pas directement à un bail
- Pour trouver les demandes d'un bail, on doit d'abord trouver le dossier associé
- Les messages peuvent être liés à une demande, mais ce n'est pas obligatoire
- Les documents peuvent être liés à un message, mais ce n'est pas obligatoire
- Un message peut avoir à la fois un document ET être lié à une demande







