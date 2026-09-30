# Audit — Intégration d'une IA auto-hébergée dans le parcours client

> Objectif : raccourcir le parcours de création d'un dossier de bail notarié en posant d'abord
> les seules questions qui déterminent les pièces, puis en laissant une IA **hébergée chez nous**
> (aucune API externe) lire les documents et pré-remplir le dossier.
>
> Statut : **audit uniquement — aucun code modifié.** Les chiffres de coût sont des ordres de
> grandeur à vérifier sur les grilles tarifaires en vigueur.

---

## Sommaire

1. [Résumé exécutif](#1-résumé-exécutif)
2. [État actuel du parcours](#2-état-actuel-du-parcours)
3. [Parcours cible](#3-parcours-cible)
4. [Questions décisives et arbre des pièces](#4-questions-décisives-et-arbre-des-pièces)
5. [Ce que l'IA peut (et ne peut pas) extraire](#5-ce-que-lia-peut-et-ne-peut-pas-extraire)
6. [Architecture technique](#6-architecture-technique)
7. [Choix du modèle et pipeline d'extraction](#7-choix-du-modèle-et-pipeline-dextraction)
8. [Hébergement et coûts GPU](#8-hébergement-et-coûts-gpu)
9. [Base de données (Prisma)](#9-base-de-données-prisma)
10. [Impact sur le code existant](#10-impact-sur-le-code-existant)
11. [UX : écrans du nouveau parcours](#11-ux--écrans-du-nouveau-parcours)
12. [Sécurité, RGPD, juridique](#12-sécurité-rgpd-juridique)
13. [Risques et parades](#13-risques-et-parades)
14. [Plan de mise en œuvre par phases](#14-plan-de-mise-en-œuvre-par-phases)
15. [Décisions à prendre](#15-décisions-à-prendre)

---

## 1. Résumé exécutif

- **Le parcours propriétaire passe de 13 étapes à ~4** : questions (1 min) → documents → vérification pré-remplie + 5-6 champs → paiement.
- **L'arbre « situation → pièces » existe déjà** dans `lib/utils/required-fields.ts`. Il suffit de poser ces questions en premier.
- **L'IA ne remplace pas tout le formulaire.** Loyer, charges, dépôt, dates, durée, téléphone, mobilier, email du locataire n'apparaissent dans aucun document et restent à saisir.
- **Auto-hébergement = un serveur GPU séparé.** Vercel ne peut pas faire tourner de modèle. Les briques asynchrones nécessaires existent déjà : Inngest (jobs), Pusher (temps réel), S3 (fichiers).
- **Coût GPU marginal : ~0,04 € par dossier** si l'on trie les pages (diagnostics, titre de propriété). Le coût réel est celui du serveur allumé : de ~1 € par dossier en démarrage à la demande, à moins de 0,60 € par dossier au-delà de 1 000 dossiers/mois.
- **Garde-fous obligatoires** : l'IA propose, le client confirme, l'équipe valide. Un mode manuel doit toujours rester possible. Une AIPD (RGPD) est à réaliser.
- **Recommandation** : phase 1 = nouveau parcours **sans IA**. Il apporte déjà une grande partie du gain et ne présente aucun risque. L'IA arrive ensuite, document par document.

---

## 2. État actuel du parcours

### 2.1 Enchaînement

| Étape | Fichier |
|---|---|
| Saisie email | `components/start/owner-email-input-form.tsx` |
| Vérification OTP | `components/start/otp-verification-form.tsx`, `app/api/auth/client/*` |
| Orchestration email/OTP | `components/start/start-page-client.tsx` → redirection vers `/commencer/proprietaire/[token]` |
| Création client + IntakeLink | `lib/actions/start.ts` (`startAsOwner`) |
| Formulaire propriétaire | `app/commencer/proprietaire/[token]/page.tsx` → `components/intakes/owner-intake-form.tsx` (**4 880 lignes**) |
| Formulaire locataire | `components/intakes/tenant-intake-form.tsx` (3 054 lignes, 4 étapes) |
| Sauvegarde / soumission | `lib/actions/intakes.ts` : `savePartialIntake`, `submitIntake`, `getIntakeDocuments` |
| Upload | URL signée S3 (`lib/utils/s3-client.ts`) puis `app/api/intakes/create-documents/route.ts` |
| Paiement | `components/intakes/payment-step.tsx` (Stripe) |

### 2.2 Les 13 étapes du formulaire propriétaire (`owner-intake-form.tsx:139`)

`bailFamilySelection` → `clientType` → `clientInfo` → `summary` → `propertyAddress` → `propertyDetails` → `bailType` → `bailRent` → `bailFurniture` → `bailDates` → `tenant` → `documents` → `payment`

**Constat** : les documents arrivent **en avant-dernier**, alors que la plupart des informations saisies avant s'y trouvent déjà (identité, adresse du bien, type de bien, surface…).

### 2.3 Infrastructure actuelle

- **Next.js 15** déployé sur **Vercel** (serverless)
- **PostgreSQL** via Prisma
- **AWS S3** `eu-west-3` (Paris) pour les fichiers
- **Inngest** pour les tâches asynchrones (`app/api/inngest/route.ts`, `lib/inngest/functions/*`)
- **Pusher** pour le temps réel (`lib/pusher.ts`, `lib/pusher-client.ts`)
- **Stripe** (paiement), **Resend** (emails), **better-auth** (auth)

---

## 3. Parcours cible

```
1. Email                      (inchangé)
2. OTP                        (inchangé)
3. Questions décisives        5 à 7 écrans très courts (1 clic chacun)
4. Dépôt des documents        liste générée à partir des réponses
                              └─ en arrière-plan : l'IA lit chaque document dès son upload
5. Compléments                loyer, charges, dépôt, date d'effet, durée, téléphone,
                              mobilier (si meublé), email locataire
                              └─ le client les remplit PENDANT que l'IA travaille
6. Vérification               écran récapitulatif pré-rempli, champs douteux surlignés,
                              le client confirme ou corrige
7. Paiement                   (inchangé)
```

L'étape 5 sert aussi à **masquer la latence de l'IA** : pendant que le client saisit son loyer, les documents sont analysés.

---

## 4. Questions décisives et arbre des pièces

### 4.1 Règles existantes (`lib/utils/required-fields.ts`)

| Condition | Pièces exigées |
|---|---|
| Personne physique | Pièce d'identité — **une par personne** |
| Personne morale | KBIS + statuts |
| Marié | Livret de famille (+ régime matrimonial) |
| Pacsé | Contrat de PACS |
| Copropriété | Règlement de copropriété |
| Lotissement | Cahier des charges + statuts de l'association syndicale |
| Toujours (bien) | Titre de propriété, diagnostics, assurance, RIB |
| Locataire | Pièce d'identité, assurance, RIB (+ livret/PACS selon situation) |

### 4.2 Questions proposées

| # | Question | Réponses | Impact |
|---|---|---|---|
| Q1 | Type de bail | Habitation / Commercial | Déjà en place (`bailFamilySelection`) |
| Q2 | Vous louez en tant que… | Particulier / Société | CNI **ou** KBIS + statuts |
| Q3 | Combien de propriétaires sur le titre de propriété ? | 1 / 2 / 3+ | Nombre de pièces d'identité |
| Q4 | Situation familiale | Célibataire / Marié / Pacsé / Divorcé / Veuf | Livret, PACS |
| Q4b | *(si marié)* Régime matrimonial | Communauté légale / Séparation / Participation / Universelle / **Je ne sais pas** | « Je ne sais pas » → demander le contrat de mariage, ou le laisser au notaire |
| Q5 | Le bien est-il en… | Copropriété / Lotissement / Aucun / **Je ne sais pas** | « Je ne sais pas » → **l'IA le déduit du titre de propriété** |
| Q6 | Vide ou meublé ? | Vide / Meublé | Déclenche la liste du mobilier |
| Q7 | Avez-vous déjà un locataire ? | Oui (email) / Pas encore | Existe (`tenant`) |

> Q3 et Q4 : aujourd'hui le formulaire prend le statut familial de la **première personne**
> (`owner-intake-form.tsx:1327`). À conserver tel quel, ou à préciser par personne.

---

## 5. Ce que l'IA peut (et ne peut pas) extraire

### 5.1 Par document

| Document | Champs extractibles | Méthode conseillée | Fiabilité attendue |
|---|---|---|---|
| **CNI / passeport** | Nom, prénoms, date de naissance, nationalité, sexe, n° et date d'expiration | **Lecture MRZ** (déterministe, CPU) + modèle vision pour le lieu de naissance | Très élevée (MRZ avec checksums) |
| **Livret de famille** | Époux, date et lieu de mariage, mention de contrat de mariage | Modèle vision | Moyenne (manuscrit, anciens livrets) |
| **Contrat de PACS** | Partenaires, date | Modèle vision / texte | Bonne |
| **Titre de propriété** | Adresse du bien, propriétaires, **copropriété / lotissement**, n° de lots, références cadastrales | Texte PDF ou OCR → sélection des pages → LLM | Bonne sur les actes numériques, moyenne sur les scans |
| **Diagnostics (DDT)** | Surface habitable, type de bien, **classe DPE/GES**, **année de construction**, n° ADEME | Texte PDF → sélection des pages → LLM | Bonne |
| **Règlement de copropriété** | Identification uniquement (bonne pièce ?) | Classification sur 2-3 pages | Bonne |
| **KBIS** | Raison sociale, SIREN, siège, représentant légal | Texte / modèle vision + contrôle SIREN (Luhn) | Élevée |
| **Statuts** | Dénomination, capital, gérant | Pages 1-3 | Bonne |
| **RIB** | IBAN, BIC, titulaire | Modèle vision + **checksum IBAN** | Très élevée |
| **Attestation d'assurance** | Assuré, adresse assurée, période de validité | Modèle vision | Bonne |

### 5.2 Ce qui reste à demander

- **Loyer, charges, dépôt de garantie, date d'effet, durée / type de bail, jour de paiement**
- **Téléphone, profession, adresse personnelle** (la CNI actuelle ne porte plus d'adresse)
- **Régime matrimonial** si le document ne le mentionne pas
- **Mobilier** (meublé)
- **Email du locataire**

### 5.3 Valeur ajoutée au-delà du pré-remplissage

1. **Classification** : détecter une CNI déposée dans la case RIB, un document illisible ou coupé → nouvel envoi demandé **immédiatement**.
2. **Cohérence entre documents** : même nom sur la CNI, le titre de propriété, le RIB et l'assurance ; adresse du titre = adresse des diagnostics = adresse de l'assurance.
3. **Contrôles réglementaires** : DPE classé **G** → alerte (interdiction progressive de location des passoires thermiques) ; pièce d'identité expirée ; attestation d'assurance hors période.
4. **Mentions du bail** : surface habitable, période de construction et classe énergie remplies automatiquement.
5. **Aide au back-office** : le statut `PENDING_CHECK` arrive avec une pré-vérification et une liste d'écarts.

---

## 6. Architecture technique

### 6.1 Vue d'ensemble

```
┌──────────────┐  URL signée   ┌───────────────┐
│  Navigateur  │──────────────▶│  S3 (fichiers)│
└──────┬───────┘               └───────┬───────┘
       │ POST create-documents         │ lecture seule
       ▼                               │
┌──────────────────┐  event            │
│ Next.js (Vercel) │──────────┐        │
│  + Prisma        │          ▼        ▼
└──────┬───────────┘   ┌────────────────────────────────┐
       │               │  Inngest                       │
       │               │  "document/uploaded"           │
       │               └──────────────┬─────────────────┘
       │                              ▼
       │               ┌────────────────────────────────┐
       │               │  Serveur IA (GPU, chez nous)   │
       │               │  - worker Python (Inngest SDK) │
       │               │  - prétraitement (PDF, OCR)    │
       │               │  - vLLM (modèle vision)        │
       │               └──────────────┬─────────────────┘
       │     résultat (JSON signé)    │
       ◀──────────────────────────────┘
       │ écrit DocumentExtraction
       ▼
  Pusher → navigateur : « Pièce d'identité lue ✓ »
```

### 6.2 Principes

- **Asynchrone** : l'upload ne bloque jamais sur l'IA.
- **Pas d'API publique sur le serveur GPU.** Deux options :
  - **Option A (recommandée)** : le serveur GPU héberge un **worker Inngest (SDK Python)**, qui reçoit les jobs directement. Seul Inngest l'appelle, avec des requêtes signées.
  - **Option B** : le worker interroge une file (table `DocumentExtraction` au statut `QUEUED`) et renvoie ses résultats via une route Next.js protégée par un secret HMAC.
- **Accès S3 minimal** : clé IAM en lecture seule, limitée au bucket, voire au préfixe des documents d'intake.
- **Écriture du résultat** : via une route Next.js (`/api/ai/extraction-result`, signature HMAC) plutôt qu'un accès direct du GPU à la base. Un seul point d'écriture, plus simple à sécuriser.
- **Idempotence** : un document retraité remplace l'extraction précédente, clé `documentId + pipelineVersion`.
- **Mode dégradé** : si le serveur IA ne répond pas, le parcours bascule en saisie manuelle, sans erreur visible pour le client.

### 6.3 Contrat d'échange (proposition)

Job envoyé au worker :
```json
{
  "jobId": "ext_...",
  "documentId": "doc_...",
  "declaredKind": "ID_IDENTITY",
  "fileKey": "intakes/<token>/<uuid>.pdf",
  "mimeType": "application/pdf",
  "context": { "expectedPersons": 2, "declaredLegalStatus": "UNKNOWN" }
}
```

Résultat renvoyé :
```json
{
  "jobId": "ext_...",
  "documentId": "doc_...",
  "status": "SUCCEEDED",
  "detectedKind": "ID_IDENTITY",
  "kindConfidence": 0.98,
  "quality": { "readable": true, "issues": [] },
  "fields": {
    "lastName":   { "value": "DUPONT", "confidence": 0.99, "source": "mrz" },
    "firstName":  { "value": "Marie",  "confidence": 0.99, "source": "mrz" },
    "birthDate":  { "value": "1985-04-12", "confidence": 0.99, "source": "mrz" },
    "birthPlace": { "value": "Lyon",   "confidence": 0.82, "source": "vlm" }
  },
  "model": "qwen2.5-vl-7b-awq",
  "pipelineVersion": "2026.10.1",
  "durationMs": 8400
}
```

Les schémas de `fields` par type de document sont à définir **en Zod côté Next.js** (`lib/zod/extraction.ts`), puis exportés en JSON Schema pour contraindre la sortie du modèle (décodage guidé vLLM).

---

## 7. Choix du modèle et pipeline d'extraction

### 7.1 Pipeline par document

```
1. Téléchargement depuis S3 (en mémoire ou disque chiffré temporaire)
2. Normalisation : HEIC/JPG/PNG → image ; PDF → texte natif si présent, sinon rendu en images
3. Contrôle qualité : netteté, rotation, recadrage, taille minimale
4. Classification du type (vérifie le type déclaré)
5. Sélection des pages utiles (documents longs)
6. Extraction :
     - CNI/passeport → MRZ (déterministe) puis modèle vision pour le reste
     - RIB → modèle vision + checksum IBAN
     - autres → modèle vision ou LLM texte, sortie JSON contrainte
7. Post-validation : formats, dates, checksums, normalisation (majuscules, accents)
8. Envoi du résultat + suppression des fichiers temporaires
```

### 7.2 Documents longs : sélection des pages (indispensable)

| Document | Taille typique | Pages envoyées au modèle | Méthode |
|---|---|---|---|
| Diagnostics (DDT) | 50-150 pages | 3-4 | Texte PDF (gratuit, CPU) + mots-clés : « performance énergétique », « surface habitable », « année de construction », « étiquette » |
| Titre de propriété | 20-40 pages | ~5 | Mots-clés : « DÉSIGNATION », « copropriété », « lot », « lotissement », « cadastre », « ORIGINE DE PROPRIÉTÉ » |
| Règlement de copro | 50-200 pages | 2-3 | Première page + sommaire (classification seulement) |

Si le PDF est **scanné** (aucun texte natif), on passe d'abord un OCR rapide sur toutes les pages (~0,5 s/page sur GPU), puis on applique la même sélection.

### 7.3 Modèles à évaluer (open-weight, exécutables en local)

| Famille | Tailles | Points forts | Licence (à vérifier) |
|---|---|---|---|
| **Qwen2.5-VL / Qwen3-VL** | 3B, 7B, 32B, 72B | Très bons sur les documents et le JSON | Apache 2.0 (selon taille) |
| **Mistral Small (vision) / Pixtral** | 12B-24B | Éditeur français, bon en français | Apache 2.0 |
| **Gemma 3** | 4B, 12B, 27B | Vision, léger | Gemma license |
| **Outils OCR / parsing** | — | Docling, PaddleOCR, olmOCR, lecteurs MRZ (`PassportEye`, `fastmrz`) | Open source |

> Le domaine évolue vite : **la décision doit venir d'un benchmark sur nos propres documents**
> (30 à 50 par type, anonymisés ou avec consentement), en mesurant l'exactitude champ par champ,
> la latence et la mémoire GPU.

### 7.4 Serveur d'inférence

- **vLLM** : API compatible OpenAI, batching, **sortie JSON guidée par schéma**, quantification AWQ/GPTQ.
- Alternative légère pour le prototypage : **Ollama** (plus simple, moins performant en charge).
- Tout reste sur notre serveur : l'« API compatible OpenAI » n'est qu'un protocole local, sans appel vers OpenAI.

---

## 8. Hébergement et coûts GPU

> Prix indicatifs HT (Scaleway / OVHcloud, France), **à vérifier** avant décision.

### 8.1 Temps GPU par dossier (cas lourd : 2 propriétaires mariés, copropriété)

| Fichier | Pages envoyées au modèle | Temps GPU (L4, modèle 7-12B) |
|---|---|---|
| CNI × 2 (recto/verso) | 4 (0 si lecture MRZ sur CPU) | ~20 s |
| Livret de famille | 2 | ~10 s |
| Titre de propriété (30 p.) | ~5 | ~25 s |
| Diagnostics (100 p.) | ~4 | ~20 s (+ ~50 s si scanné) |
| Règlement de copropriété | 2-3 | ~15 s |
| RIB | 1 | ~5 s |
| Assurance | 1-2 | ~10 s |
| **Total** | **~20 pages** | **~2 à 3 min** |

- **Coût calcul pur** : ~3 min × ~0,80 €/h ≈ **0,04 € par dossier**
- **Sans tri des pages** (150 pages envoyées) : ~0,20 € (L4), ~0,60 € (modèle 32B sur L40S)

### 8.2 Coût fixe selon le mode d'hébergement

| Mode | Coût mensuel | Délai pour le client |
|---|---|---|
| A. GPU L4 allumé 24h/24 | ~580 € | 2-3 min |
| B. L4 en heures ouvrées (8h-20h, 7j/7) | ~290 € | Instantané le jour, différé la nuit |
| C. L4 **à la demande** (démarre au 1er job, s'arrête après 15 min d'inactivité) | ~50-200 € selon volume | +3 à 5 min au démarrage |
| D. L40S 24h/24 (modèle 32B, plus précis) | ~1 000 € | 3-5 min |
| E. Matériel en propre (RTX 24-32 Go) en baie | ~200-230 € (amorti sur 3 ans + hébergement) | Instantané, mais maintenance à notre charge |

Frais communs : serveur CPU pour le worker et l'extraction de texte (~20-50 €/mois).

### 8.3 Coût GPU par dossier selon le volume

| Dossiers / mois | A. 24h/24 | B. Heures ouvrées | C. À la demande |
|---|---|---|---|
| 50 | ~11,60 € | ~5,80 € | **~1-2 €** |
| 100 | ~5,80 € | ~2,90 € | **~0,80-1,50 €** |
| 300 | ~1,90 € | **~0,95 €** | ~0,50 € |
| 1 000 | **~0,58 €** | ~0,29 € | ~0,20 € |

Capacité : un seul L4 traite ~20 dossiers/heure, bien au-delà du besoin.

### 8.4 Recommandation

1. **Moins de 200 dossiers/mois** : mode **C (à la demande)**. Le temps de démarrage est masqué par l'étape « Compléments ».
2. **Au-delà de 300 dossiers/mois** : mode **B ou A**.
3. **Toujours** : tri des pages et lecture MRZ/IBAN sur CPU.
4. **Souveraineté** : les fichiers sont aujourd'hui sur **AWS** (société américaine, soumise au Cloud Act). Pour un argument « données 100 % maîtrisées », envisager de migrer le stockage vers **Scaleway ou OVH Object Storage** (compatibles S3, peu de code à changer dans `lib/utils/s3-client.ts`).

---

## 9. Base de données (Prisma)

### 9.1 Nouveaux modèles proposés

```prisma
enum ExtractionStatus {
  QUEUED
  PROCESSING
  SUCCEEDED
  FAILED
  SKIPPED      // IA indisponible → saisie manuelle
}

enum FieldSource {
  USER         // saisi par le client
  AI           // proposé par l'IA, non confirmé
  AI_CONFIRMED // proposé par l'IA, confirmé par le client
  ADMIN        // corrigé par l'équipe
}

model DocumentExtraction {
  id              String           @id @default(cuid())
  documentId      String
  document        Document         @relation(fields: [documentId], references: [id], onDelete: Cascade)
  status          ExtractionStatus @default(QUEUED)
  detectedKind    DocumentKind?
  kindConfidence  Float?
  qualityIssues   String[]         @default([])
  fields          Json?            // { champ: { value, confidence, source } }
  model           String?
  pipelineVersion String?
  durationMs      Int?
  error           String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@unique([documentId, pipelineVersion])
  @@index([status])
}

model FieldProvenance {
  id           String      @id @default(cuid())
  entityType   String      // PERSON | ENTREPRISE | PROPERTY | BAIL
  entityId     String
  field        String
  source       FieldSource
  extractionId String?
  confidence   Float?
  confirmedAt  DateTime?
  confirmedById String?
  createdAt    DateTime    @default(now())

  @@unique([entityType, entityId, field])
  @@index([entityType, entityId])
}
```

`Document` reçoit la relation inverse `extractions DocumentExtraction[]`.

### 9.2 Champs manquants utiles au notaire et au bail

| Modèle | Champ proposé | Source |
|---|---|---|
| `Person` | `birthName` (nom de naissance), `idDocumentNumber`, `idDocumentExpiry`, `gender` | CNI / passeport |
| `Property` | `dpeClass`, `gesClass`, `dpeNumber` (n° ADEME), `constructionYear` ou `constructionPeriod` | Diagnostics |
| `Property` | `lotNumbers String[]`, `cadastralReference` | Titre de propriété |

Enum à compléter : `DocumentKind` → ajouter `CONTRAT_DE_MARIAGE` (utile quand le régime est « je ne sais pas »).

---

## 10. Impact sur le code existant

| Élément | Action | Commentaire |
|---|---|---|
| `components/intakes/owner-intake-form.tsx` | **Ne pas modifier** au début | Monolithe de 4 880 lignes. Construire le nouveau parcours **à côté**, derrière un flag ou une route (`/commencer/proprietaire/[token]/v2`), et basculer une fois validé. |
| `lib/utils/required-fields.ts` | **Réutiliser** | Source unique de « quelles pièces ». Ajouter une fonction `getRequiredDocumentsFromAnswers(answers)`. |
| `lib/actions/intakes.ts` (`savePartialIntake`, `submitIntake`) | **Réutiliser** | Le nouveau parcours envoie le même payload `ownerFormSchema`. |
| `lib/zod/client.ts` (`ownerFormSchema`) | Réutiliser, ajouter `lib/zod/extraction.ts` | Schémas par type de document. |
| `app/api/intakes/create-documents/route.ts` | **Ajouter** l'envoi de l'event Inngest `document/uploaded` | Une ligne après la création de chaque `Document`. |
| `lib/inngest/functions/` | **Ajouter** `document-extraction.ts` | Fonction qui orchestre le job, gère les tentatives et le mode dégradé. |
| `app/api/inngest/route.ts` | Enregistrer la nouvelle fonction | |
| `lib/pusher.ts` | Réutiliser | Canal `private-intake-<token>`, events `extraction-updated`. |
| `lib/utils/completion-status.ts` | **Adapter** | Un champ `AI` non confirmé ne compte pas comme complet. |
| `components/intakes/payment-step.tsx` | Réutiliser | Inchangé. |
| `app/interface/...` (admin) | **Ajouter** | Onglet « Extraction IA » sur un dossier : valeurs, confiance, écarts entre documents. |
| `components/intakes/tenant-intake-form.tsx` | Phase 4 | Même approche (CNI, assurance, RIB). |
| Nouveau dépôt ou dossier `ai-worker/` | **Créer** | Service Python : Inngest SDK, pré-traitement, vLLM, Dockerfile. |

### Variables d'environnement à prévoir

```
AI_EXTRACTION_ENABLED=true|false        # feature flag global
AI_RESULT_HMAC_SECRET=...               # signature des résultats
AI_WORKER_S3_READONLY_KEY / SECRET      # côté worker uniquement
```

---

## 11. UX : écrans du nouveau parcours

1. **Questions** : une question par écran, gros boutons, barre de progression, retour possible. Toujours une option « Je ne sais pas » quand c'est pertinent (Q4b, Q5).
2. **Documents** : liste générée (« 2 pièces d'identité, livret de famille, titre de propriété… »), chaque case indique son état : *à déposer* → *envoyé* → *analyse…* → *lu ✓* / *à revoir ⚠*. Envoi depuis le téléphone (appareil photo) et dépôt multiple. Bouton « Je n'ai pas ce document maintenant » → le dossier est sauvegardé et un rappel envoyé (la page `reminder` existe déjà).
3. **Compléments** : loyer, charges, dépôt, date d'effet, durée, téléphone, mobilier, locataire. Les contrôles existants sont conservés (`rent-validation.ts`, zone tendue, `bail-duration.ts`).
4. **Vérification** : récapitulatif groupé (Vous, Le bien, Le bail). Les champs lus par l'IA portent un badge « lu sur votre pièce d'identité ». Les champs à faible confiance sont **surlignés et doivent être confirmés**. Une case finale à cocher : « Je certifie l'exactitude de ces informations. »
5. **Paiement** : inchangé.

Mention d'information visible à l'étape Documents : *« Vos documents sont analysés automatiquement sur nos serveurs, en France, pour pré-remplir votre dossier. Aucune donnée n'est transmise à un service tiers. »*

---

## 12. Sécurité, RGPD, juridique

### RGPD
- **AIPD (analyse d'impact) très probablement requise** : traitement de pièces d'identité, à grande échelle, avec une technologie nouvelle.
- Mettre à jour le **registre des traitements** et `app/politique-confidentialite`.
- **Minimisation** : n'extraire que les champs utiles ; ne pas conserver les images intermédiaires ; purger le JSON brut d'extraction après validation (ne garder que les valeurs retenues et leur provenance).
- **Durées de conservation** définies pour les pièces et les extractions.

### Transparence / AI Act
- Informer clairement que les documents sont lus automatiquement.
- **Pas de décision automatisée** : l'IA ne refuse et n'accepte aucun dossier, elle pré-remplit et signale.

### Sécurité du serveur IA
- Aucun port public en dehors de l'endpoint Inngest signé (ou aucun port du tout en mode « pull »).
- Disque chiffré ; fichiers temporaires en mémoire (`tmpfs`) supprimés après traitement.
- **Pas de contenu dans les logs** (uniquement les identifiants, durées, statuts).
- Clé S3 en lecture seule, rotation régulière.
- Résultats signés (HMAC) et vérifiés côté Next.js.
- **Injection de prompt via document** : risque faible (sortie contrainte en JSON, validation Zod, confirmation humaine), mais les valeurs extraites ne doivent jamais être interprétées comme des instructions.

### Responsabilité notariale
- Traçabilité de chaque champ (`FieldProvenance`) : qui l'a saisi, proposé, confirmé ou corrigé.
- Validation humaine par l'équipe avant `READY_FOR_NOTARY`, comme aujourd'hui.

---

## 13. Risques et parades

| Risque | Parade |
|---|---|
| Photos de mauvaise qualité (reflets, flou, HEIC, document coupé) | Contrôle qualité et demande de nouvel envoi immédiate ; conseils de prise de vue |
| Erreur silencieuse (nom ou date mal lus) | MRZ / checksums, seuils de confiance, surlignage, confirmation obligatoire, validation admin |
| Latence (10-30 s par document, démarrage à froid) | Traitement asynchrone, étape Compléments en parallèle, statut en temps réel |
| Serveur IA en panne | Mode dégradé : saisie manuelle, retraitement automatique plus tard |
| Coût d'un GPU inoccupé | Mode à la demande tant que le volume est faible |
| Charge d'exploitation (mises à jour, supervision) | Conteneur Docker unique, supervision simple (healthcheck + alerte), versionnage du pipeline |
| Documents longs très coûteux | Sélection des pages obligatoire |
| Dérive de qualité après changement de modèle | Jeu de test figé et benchmark rejoué à chaque changement de modèle ou de prompt |
| Client sans ses documents sous la main | Sauvegarde et rappel ; rien de bloquant avant le paiement |

---

## 14. Plan de mise en œuvre par phases

### Phase 0 — Cadrage (1-2 semaines)
- [ ] Décisions de la section 15
- [ ] AIPD, mise à jour de la politique de confidentialité
- [ ] Constituer le jeu de test : 30-50 documents par type, anonymisés ou avec consentement, **stockés hors du dépôt Git**
- [ ] Benchmark de 2-3 modèles sur une machine locale ou un GPU loué à l'heure : exactitude par champ, latence, mémoire

### Phase 1 — Nouveau parcours sans IA (2-4 semaines)
- [ ] Route `v2` + feature flag
- [ ] Écrans Questions → Documents → Compléments → Vérification → Paiement
- [ ] `getRequiredDocumentsFromAnswers()` dans `required-fields.ts`
- [ ] Réutilisation de `savePartialIntake` / `submitIntake` / upload S3 / `PaymentStep`
- [ ] Test A/B ou bascule progressive ; mesure du taux d'abandon et du temps de complétion

### Phase 2 — IA sur les documents simples (3-5 semaines)
- [ ] Migrations Prisma : `DocumentExtraction`, `FieldProvenance`, nouveaux champs `Person`
- [ ] Service `ai-worker` (Docker) : pré-traitement, MRZ, IBAN, modèle vision, JSON contraint
- [ ] Fonction Inngest `document-extraction` + route de résultat signée HMAC
- [ ] Pusher : statut en temps réel sur l'écran Documents
- [ ] Pré-remplissage de l'écran Vérification pour **CNI/passeport, RIB, KBIS**
- [ ] Mode dégradé testé (worker arrêté)

### Phase 3 — Documents du bien et contrôles (3-4 semaines)
- [ ] Sélection des pages pour les diagnostics et le titre de propriété
- [ ] Extraction : surface, DPE/GES, année de construction, copropriété/lotissement, lots
- [ ] Q5 « Je ne sais pas » résolu automatiquement par l'IA
- [ ] Contrôles de cohérence entre documents + alertes (DPE G, pièce expirée, assurance hors période)
- [ ] Vue admin « Extraction IA »

### Phase 4 — Généralisation (2-3 semaines)
- [ ] Parcours locataire (CNI, assurance, RIB)
- [ ] Assistant de vérification côté admin (liste des écarts avant `READY_FOR_NOTARY`)
- [ ] Choix définitif du mode d'hébergement selon le volume réel ; éventuelle migration du stockage vers un hébergeur français

> Les durées supposent une personne à temps plein et sont indicatives.

---

## 15. Décisions à prendre

1. **Volume** : nombre de dossiers par mois aujourd'hui et objectif à 12 mois (détermine le mode d'hébergement).
2. **Hébergeur GPU** : Scaleway, OVHcloud, matériel en propre ?
3. **Stockage** : rester sur AWS S3 ou migrer vers un hébergeur français ?
4. **Modèle** : décidé après le benchmark de la phase 0.
5. **Régime matrimonial** « je ne sais pas » : demander le contrat de mariage, ou laisser le notaire le traiter ?
6. **Seuils de confiance** en dessous desquels un champ doit être confirmé explicitement.
7. **Durées de conservation** des pièces et des extractions.
