# Explication Complète du Flux de Connexion Client

## 🎯 Problème Résolu

**Avant** : Lorsqu'un locataire (Client) existait dans la base de données mais n'avait pas encore de compte `User`, la connexion échouait car Better Auth avec `disableSignUp: true` vérifie l'existence d'un `User` AVANT d'appeler `sendVerificationOTP`.

**Maintenant** : Le système crée automatiquement le `User` AVANT que Better Auth ne vérifie, permettant ainsi la connexion des locataires existants.

---

## 📋 Flux Complet de Connexion (Étape par Étape)

### **Étape 1 : Client saisit son email**
```
Page: /client/login
Action: Client saisit son email dans le formulaire
```

### **Étape 2 : Préparation de la connexion**
```
Route API: POST /api/auth/client/prepare-login
Action: 
  - Vérifie si un User existe avec cet email
  - Si User existe et est UTILISATEUR → OK, continue
  - Si User n'existe pas :
    ├── Cherche Person avec cet email
    ├── Si trouvé → Crée User lié au Client
    └── Si pas trouvé → Cherche Entreprise avec cet email
        └── Si trouvé → Crée User lié au Client
```

**Code de la route** : `app/api/auth/client/prepare-login/route.ts`

### **Étape 3 : Demande d'OTP via Better Auth**
```
Client: authClient.emailOtp.sendVerificationOtp()
Action:
  - Better Auth vérifie si User existe
  - ✅ User existe maintenant (créé à l'étape 2) → Continue
  - Better Auth appelle sendVerificationOTP() dans lib/auth.ts
```

### **Étape 4 : Envoi de l'email OTP**
```
Fonction: sendVerificationOTP() dans lib/auth.ts
Action:
  - Récupère le User (qui existe maintenant)
  - Récupère le nom du Client
  - Envoie l'email avec le code OTP via Resend
```

**Code** : `lib/auth.ts` lignes 29-170

### **Étape 5 : Client saisit le code OTP**
```
Page: /client/login (étape "otp")
Action: Client saisit le code à 6 chiffres reçu par email
```

### **Étape 6 : Vérification de l'OTP et connexion**
```
Client: authClient.signIn.emailOtp()
Action:
  - Better Auth vérifie le code OTP
  - Si valide → Crée la session
  - Redirige vers /client
```

---

## 🔄 Diagramme du Flux

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Client saisit email sur /client/login                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. POST /api/auth/client/prepare-login                      │
│    - Vérifie si User existe                                │
│    - Si non → Cherche Person/Entreprise                    │
│    - Crée User si Client trouvé                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. authClient.emailOtp.sendVerificationOtp()               │
│    - Better Auth vérifie User (existe maintenant ✅)        │
│    - Appelle sendVerificationOTP()                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. sendVerificationOTP() dans lib/auth.ts                  │
│    - Récupère User                                          │
│    - Envoie email OTP via Resend                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Client reçoit email et saisit le code OTP               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. authClient.signIn.emailOtp()                            │
│    - Better Auth vérifie le code                           │
│    - Crée la session                                       │
│    - Redirige vers /client                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Structure de la Base de Données

### Modèles impliqués :

```
Client (existe déjà pour les locataires)
  ├── id: string
  ├── type: PERSONNE_PHYSIQUE | PERSONNE_MORALE
  ├── profilType: LOCATAIRE
  │
  ├── Person (si type = PERSONNE_PHYSIQUE)
  │   ├── email: string (unique)
  │   ├── firstName: string?
  │   ├── lastName: string?
  │   └── clientId → Client.id
  │
  └── Entreprise (si type = PERSONNE_MORALE)
      ├── email: string (unique)
      ├── legalName: string
      ├── name: string
      └── clientId → Client.id

User (créé automatiquement lors de la connexion)
  ├── id: string
  ├── email: string (unique) → même que Person.email ou Entreprise.email
  ├── role: UTILISATEUR
  ├── name: string? → nom du Client
  ├── clientId → Client.id
  └── emailVerified: false
```

---

## 🔧 Fichiers Modifiés

### 1. **Nouveau fichier** : `app/api/auth/client/prepare-login/route.ts`
- Route API qui crée le User si nécessaire AVANT Better Auth
- Vérifie Person et Entreprise pour trouver le Client
- Crée le User avec le bon `clientId`

### 2. **Modifié** : `app/client/login/page.tsx`
- Appelle `/api/auth/client/prepare-login` avant `sendVerificationOtp()`
- Assure que le User existe avant que Better Auth ne vérifie

### 3. **Modifié** : `lib/auth.ts`
- Ajout de gestion d'erreurs pour les race conditions
- Commentaires expliquant pourquoi cette partie ne devrait normalement jamais être atteinte

---

## ✅ Cas d'Usage

### Cas 1 : Locataire avec Person (Personne Physique)
```
1. Client existe avec Person.email = "jean@example.com"
2. User n'existe pas encore
3. Client saisit "jean@example.com"
4. Système crée User avec:
   - email: "jean@example.com"
   - role: UTILISATEUR
   - clientId: Client.id
   - name: "Jean Dupont" (si firstName/lastName remplis)
5. Email OTP envoyé
6. Client se connecte
```

### Cas 2 : Locataire avec Entreprise (Personne Morale)
```
1. Client existe avec Entreprise.email = "contact@societe.fr"
2. User n'existe pas encore
3. Client saisit "contact@societe.fr"
4. Système crée User avec:
   - email: "contact@societe.fr"
   - role: UTILISATEUR
   - clientId: Client.id
   - name: "Société ABC" (legalName ou name)
5. Email OTP envoyé
6. Client se connecte
```

### Cas 3 : User existe déjà
```
1. User existe déjà avec email = "jean@example.com"
2. Client saisit "jean@example.com"
3. Système détecte que User existe
4. Continue directement à l'envoi de l'OTP
5. Email OTP envoyé
6. Client se connecte
```

---

## 🛡️ Sécurité

1. **Rate Limiting** : Better Auth gère le rate limiting pour les OTP
2. **Expiration** : Codes OTP expirent après 10 minutes
3. **Usage unique** : Codes OTP sont marqués comme utilisés après vérification
4. **Pas de révélation** : Si l'email n'existe pas, le système ne révèle pas cette information

---

## 🐛 Gestion des Erreurs

### Erreur : "Aucun compte trouvé pour cet email"
- L'email n'existe ni dans Person, ni dans Entreprise
- Le Client n'existe pas dans le système

### Erreur : "Cet email n'est pas associé à un compte client"
- Un User existe mais avec un rôle différent de UTILISATEUR
- Peut être un NOTAIRE ou autre rôle

### Erreur : "Code invalide ou expiré"
- Le code OTP est incorrect ou a expiré
- Le client doit demander un nouveau code

---

## 📝 Notes Techniques

1. **Better Auth avec `disableSignUp: true`** :
   - Vérifie l'existence du User AVANT d'appeler `sendVerificationOTP`
   - C'est pourquoi on doit créer le User AVANT via `/api/auth/client/prepare-login`

2. **Race Conditions** :
   - Si deux requêtes simultanées tentent de créer le même User
   - Géré avec `try/catch` et vérification de l'erreur `P2002` (contrainte unique)

3. **Normalisation des emails** :
   - Tous les emails sont normalisés en lowercase et trim
   - Assure la cohérence dans la base de données

---

## 🧪 Test du Flux

Pour tester le flux complet :

1. Créer un Client avec Person ou Entreprise (sans User)
2. Aller sur `/client/login`
3. Saisir l'email du Client
4. Vérifier que :
   - Le User est créé automatiquement
   - L'email OTP est envoyé
   - La connexion fonctionne

---

## 📚 Références

- Better Auth Documentation : https://www.better-auth.com/docs
- Route API : `app/api/auth/client/prepare-login/route.ts`
- Page de connexion : `app/client/login/page.tsx`
- Configuration Auth : `lib/auth.ts`







