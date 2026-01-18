# Configuration Pusher pour le Chat en Temps Réel

Ce document explique comment configurer Pusher pour activer les WebSockets dans le chat entre notaire et client.

## Étapes de configuration

### 1. Créer un compte Pusher

1. Allez sur [pusher.com](https://pusher.com)
2. Créez un compte gratuit (plan gratuit disponible)
3. Créez une nouvelle application
4. Notez vos identifiants :
   - **App ID**
   - **Key**
   - **Secret**
   - **Cluster** (par exemple: `eu`, `us2`, etc.)

### 2. Configurer les variables d'environnement

Ajoutez les variables suivantes à votre fichier `.env.local` :

```env
# Pusher Configuration (Serveur)
PUSHER_APP_ID=votre_app_id
PUSHER_KEY=votre_key
PUSHER_SECRET=votre_secret
PUSHER_CLUSTER=votre_cluster

# Pusher Configuration (Client - Public)
NEXT_PUBLIC_PUSHER_KEY=votre_key
NEXT_PUBLIC_PUSHER_CLUSTER=votre_cluster
```

### 3. Activer les channels Presence

Dans votre tableau de bord Pusher :
1. Allez dans l'onglet "Channels"
2. Activez les "Private Channels" et "Presence Channels" pour votre application
3. Assurez-vous que l'authentification est activée

**Important** : Les Presence Channels sont nécessaires pour tracker la présence des utilisateurs en ligne.

### 4. Tester la configuration

Une fois configuré, le chat utilisera automatiquement les WebSockets. Les messages apparaîtront en temps réel pour tous les utilisateurs connectés au même bail.

## Fonctionnalités

- ✅ Messages en temps réel via WebSockets
- ✅ Suppression de messages en temps réel
- ✅ Mise à jour des demandes de notaire en temps réel
- ✅ Authentification sécurisée des channels
- ✅ Vérification des permissions d'accès au bail
- ✅ **Détection de présence en ligne** (Presence Channels)
- ✅ **Notifications par email si le destinataire est hors ligne** (via Inngest)

## Architecture

- **Channels de présence** : Format `presence-bail-{bailId}`
  - Permettent de savoir qui est connecté au chat en temps réel
  - Gèrent automatiquement les événements `member_added` et `member_removed`
  
- **Événements** :
  - `pusher:member_added` : Un utilisateur se connecte au chat
  - `pusher:member_removed` : Un utilisateur quitte le chat
  - `new-message` : Nouveau message créé
  - `message-deleted` : Message supprimé
  - `request-updated` : Demande de notaire mise à jour
  - `client-typing` : Indicateur de frappe

## Notifications hors ligne

Quand un message est envoyé et que le destinataire n'est pas connecté au chat :

1. Le serveur vérifie via l'API Pusher REST si le destinataire est présent dans le presence channel
2. Si le destinataire est hors ligne, un email de notification est envoyé via Inngest
3. L'email contient un aperçu du message et un lien direct vers le chat
4. Un throttle de 5 minutes évite le spam si plusieurs messages sont envoyés rapidement

## Dépannage

Si les WebSockets ne fonctionnent pas :
- Vérifiez que toutes les variables d'environnement sont correctement configurées
- Vérifiez la console du navigateur pour les erreurs
- Le système reviendra automatiquement au polling en cas d'erreur Pusher

Si les notifications hors ligne ne fonctionnent pas :
- Vérifiez que Inngest est correctement configuré
- Consultez le tableau de bord Inngest pour les logs d'exécution
- Vérifiez les logs serveur pour les erreurs de l'API Pusher REST


