# Implémentation Inngest pour les envois d'emails

## Vue d'ensemble

Tous les envois d'emails ont été migrés vers Inngest pour éviter d'encombrer le rendu des pages. Les emails sont maintenant traités de manière asynchrone en arrière-plan.

## Structure

### Fichiers créés

- `lib/inngest/client.ts` - Client Inngest
- `app/api/inngest/route.ts` - Route API pour servir les fonctions Inngest
- `lib/inngest/helpers.ts` - Fonctions helper pour déclencher les emails
- `lib/inngest/functions/contact.ts` - Fonctions pour les emails de contact
- `lib/inngest/functions/notifications.ts` - Fonctions pour les emails de notification
- `lib/inngest/functions/intake-forms.ts` - Fonctions pour les formulaires d'intake
- `lib/inngest/functions/leads.ts` - Fonctions pour les emails de conversion de leads

## Types d'emails migrés

### 1. Emails de contact (`app/action.ts`)
- Confirmation de contact client
- Notification d'équipe pour nouvelle demande de contact

### 2. Emails de notification (`lib/utils/notifications.ts`)
- Notifications pour tous les utilisateurs
- Notifications pour un utilisateur spécifique
- Notifications pour plusieurs utilisateurs

### 3. Emails de formulaires (`lib/actions/clients.ts`)
- Formulaire propriétaire
- Formulaire locataire

### 4. Emails de leads (`lib/actions/leads.ts`)
- Email de conversion de lead
- Emails de formulaires après conversion

### 5. Emails de baux (`lib/actions/leases.ts`)
- Email de formulaire locataire pour un bail

## Configuration

### Variables d'environnement

Pour utiliser Inngest, vous devez configurer la variable d'environnement suivante :

- `INNGEST_EVENT_KEY` : Clé API Inngest pour envoyer des événements (requis pour la production)

**Développement local :**
- Option 1 : Utiliser Inngest Dev Server (recommandé) - aucune clé API requise
  ```bash
  npx inngest-cli@latest dev
  ```
- Option 2 : Utiliser Inngest Cloud - définir `INNGEST_EVENT_KEY` dans votre fichier `.env`

**Production :**
- Définir `INNGEST_EVENT_KEY` dans vos variables d'environnement de production
- Obtenez votre clé depuis le [dashboard Inngest](https://app.inngest.com)

### Installation

```bash
npm install inngest
```

Le package a été ajouté à `package.json`.

## Utilisation

### Déclencher un email

Au lieu d'appeler directement `resend.emails.send()`, utilisez les fonctions helper :

```typescript
import { triggerOwnerFormEmail } from "@/lib/inngest/helpers";

await triggerOwnerFormEmail({
  to: "client@example.com",
  firstName: "John",
  lastName: "Doe",
  formUrl: "https://example.com/form",
});
```

### Fonctions disponibles

- `triggerContactConfirmationEmail()` - Confirmation de contact
- `triggerContactNotificationEmail()` - Notification équipe pour contact
- `triggerNotificationEmail()` - Notification utilisateur
- `triggerOwnerFormEmail()` - Formulaire propriétaire
- `triggerTenantFormEmail()` - Formulaire locataire
- `triggerLeadConversionEmail()` - Conversion de lead

## Avantages

1. **Performance** : Les emails ne bloquent plus le rendu des pages
2. **Fiabilité** : Inngest gère automatiquement les retries en cas d'échec
3. **Observabilité** : Suivi des emails dans le dashboard Inngest
4. **Scalabilité** : Traitement asynchrone des emails

## Migration complétée

Tous les appels directs à `resend.emails.send()` ont été remplacés par des appels aux fonctions Inngest. Les emails sont maintenant traités de manière asynchrone sans bloquer les requêtes utilisateur.

