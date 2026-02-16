# Flux de Connexion Client - Documentation Complète

## Problème Identifié

Lorsqu'un locataire (Client) existe dans la base de données mais n'a pas encore de compte `User`, la connexion échoue car :
1. Better Auth avec `disableSignUp: true` vérifie l'existence d'un `User` AVANT d'appeler `sendVerificationOTP`
2. Si aucun `User` n'existe, Better Auth rejette la demande avant même d'appeler `sendVerificationOTP`
3. Le code dans `sendVerificationOTP` qui crée le `User` n'est jamais exécuté

## Flux Actuel (Problématique)

```
1. Client saisit son email sur /client/login
   ↓
2. Page appelle authClient.emailOtp.sendVerificationOtp()
   ↓
3. Better Auth vérifie si User existe (avec disableSignUp: true)
   ❌ Si User n'existe pas → REJET IMMÉDIAT (ne passe jamais à l'étape 4)
   ↓
4. Better Auth appelle sendVerificationOTP() dans lib/auth.ts
   ↓
5. sendVerificationOTP() crée le User et envoie l'email
   ❌ Cette étape n'est jamais atteinte si User n'existe pas
```

## Solution : Créer le User AVANT Better Auth

Il faut créer le `User` AVANT que Better Auth ne vérifie son existence. Deux approches possibles :

### Approche 1 : Hook `onBeforeSignIn` (si disponible)
Créer le User dans un hook avant la vérification Better Auth.

### Approche 2 : Créer le User dans `sendVerificationOTP` AVANT la vérification
Modifier `sendVerificationOTP` pour créer le User en premier, puis laisser Better Auth vérifier.

### Approche 3 : Route API personnalisée (Recommandée)
Créer une route API qui crée le User avant d'appeler Better Auth.

## Structure de la Base de Données

```
Client (existe déjà pour les locataires)
  ├── Person (avec email)
  │   └── clientId → Client.id
  └── Entreprise (avec email)
      └── clientId → Client.id

User (doit être créé pour la connexion)
  ├── email (même que Person.email ou Entreprise.email)
  ├── role: UTILISATEUR
  └── clientId → Client.id
```

## Flux Corrigé (Solution)

```
1. Client saisit son email sur /client/login
   ↓
2. Page appelle une route API personnalisée /api/auth/client/prepare-login
   ↓
3. Route API vérifie si User existe
   ├── Si User existe → OK, continue
   └── Si User n'existe pas :
       ├── Cherche Person avec cet email
       ├── Si trouvé → Crée User lié au Client
       └── Si pas trouvé → Cherche Entreprise avec cet email
           └── Si trouvé → Crée User lié au Client
   ↓
4. Route API retourne success
   ↓
5. Page appelle authClient.emailOtp.sendVerificationOtp()
   ↓
6. Better Auth vérifie si User existe
   ✅ User existe maintenant → Continue
   ↓
7. Better Auth appelle sendVerificationOTP() dans lib/auth.ts
   ↓
8. sendVerificationOTP() envoie l'email avec le code OTP
   ↓
9. Client saisit le code OTP
   ↓
10. Page appelle authClient.signIn.emailOtp()
   ↓
11. Better Auth vérifie le code et crée la session
   ↓
12. Client est connecté et redirigé vers /client
```

## Implémentation

### Étape 1 : Créer la route API `/api/auth/client/prepare-login`

Cette route crée le User si nécessaire avant que Better Auth ne vérifie.

### Étape 2 : Modifier la page de connexion

Appeler cette route API avant `authClient.emailOtp.sendVerificationOtp()`.

### Étape 3 : Simplifier `sendVerificationOTP`

Puisque le User existe maintenant, on peut simplifier la logique dans `sendVerificationOTP`.








