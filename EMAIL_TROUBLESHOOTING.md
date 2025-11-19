# Guide de dépannage des emails

Ce document explique comment diagnostiquer et résoudre les problèmes d'envoi d'emails.

## Architecture

Le système d'envoi d'emails utilise deux services :
1. **Inngest** : Gère la file d'attente et l'exécution asynchrone des tâches d'envoi d'emails
2. **Resend** : Service d'envoi d'emails réel

## Vérifications de base

### 1. Variables d'environnement

#### En développement local

**Option A : Utiliser Inngest Dev Server (recommandé)**
```bash
# Démarrer Inngest Dev Server dans un terminal séparé
npx inngest-cli@latest dev
```

Variables d'environnement requises :
- `RESEND_API_KEY` : Clé API Resend (obligatoire)

**Option B : Utiliser Inngest Cloud**
Variables d'environnement requises :
- `INNGEST_EVENT_KEY` : Clé API Inngest
- `RESEND_API_KEY` : Clé API Resend

#### En production

Variables d'environnement requises :
- `INNGEST_EVENT_KEY` : Clé API Inngest (obligatoire)
- `RESEND_API_KEY` : Clé API Resend (obligatoire)

### 2. Vérifier les logs

Les logs suivants vous aideront à diagnostiquer les problèmes :

#### Logs de déclenchement (helpers.ts)
- `📧 Déclenchement de l'email...` : L'événement Inngest est en cours d'envoi
- `✅ Événement Inngest envoyé avec succès` : L'événement a été envoyé à Inngest
- `⚠️  Envoi d'email annulé: Inngest n'est pas configuré` : Inngest n'est pas configuré
- `❌ Erreur lors de l'envoi de l'événement Inngest` : Erreur lors de l'envoi à Inngest

#### Logs d'exécution (functions)
- `📧 Envoi de l'email...` : L'email est en cours d'envoi via Resend
- `✅ Email envoyé avec succès` : L'email a été envoyé avec succès
- `❌ Erreur Resend` : Erreur lors de l'envoi via Resend

## Problèmes courants et solutions

### Problème 1 : Les emails ne sont pas déclenchés

**Symptômes :**
- Aucun log `📧 Déclenchement de l'email...`
- Aucun log d'erreur

**Solutions :**
1. Vérifier que les fonctions helper sont bien appelées dans le code
2. Vérifier que `isInngestConfigured()` retourne `true`
3. En développement, s'assurer qu'Inngest Dev Server est démarré

### Problème 2 : Les événements Inngest sont envoyés mais les emails ne partent pas

**Symptômes :**
- Logs `✅ Événement Inngest envoyé avec succès` présents
- Logs Inngest montrent `INF received event` mais pas d'exécution de fonction
- Aucun log `📧 Envoi de l'email...` dans les fonctions

**Solutions :**
1. **Vérifier que le client Inngest pointe vers le Dev Server** :
   - En développement, le client doit pointer vers `http://localhost:8288`
   - Vérifier que `INNGEST_BASE_URL` n'est pas définie ou pointe vers le Dev Server
   - Redémarrer l'application après modification

2. **Vérifier que l'endpoint `/api/inngest` est accessible** :
   ```bash
   curl http://localhost:3000/api/inngest
   ```
   - Devrait retourner des informations sur les fonctions Inngest

3. **Vérifier que Inngest Dev Server peut atteindre votre application** :
   - Inngest Dev Server doit pouvoir accéder à `http://localhost:3000/api/inngest`
   - Par défaut, il détecte automatiquement `http://localhost:3000`
   - Si votre application tourne sur un autre port, configurer l'URL dans Inngest Dev Server

4. **Vérifier les logs Inngest Dev Server** :
   - Chercher les erreurs de connexion à l'endpoint
   - Vérifier que les fonctions sont bien enregistrées (log `🔧 Fonctions Inngest enregistrées`)

5. **En production** : L'URL de votre application doit être configurée dans Inngest Dashboard

### Problème 3 : Erreur "RESEND_API_KEY n'est pas configurée"

**Symptômes :**
- Logs `❌ RESEND_API_KEY n'est pas configurée`
- Erreur `RESEND_API_KEY n'est pas configurée. Impossible d'envoyer l'email.`

**Solutions :**
1. Vérifier que `RESEND_API_KEY` est définie dans votre fichier `.env`
2. Redémarrer l'application après avoir ajouté la variable
3. Vérifier que la clé API est valide sur [Resend Dashboard](https://resend.com/api-keys)

### Problème 4 : Erreur "INNGEST_EVENT_KEY n'est pas configurée" (production uniquement)

**Symptômes :**
- Logs `❌ INNGEST_EVENT_KEY n'est pas configurée` (en production)
- Logs `⚠️  INNGEST_EVENT_KEY n'est pas configurée` (en développement)

**Solutions :**
1. **En production** : Ajouter `INNGEST_EVENT_KEY` dans vos variables d'environnement
2. **En développement** : Soit démarrer Inngest Dev Server, soit ajouter `INNGEST_EVENT_KEY`

### Problème 5 : Erreur Resend lors de l'envoi

**Symptômes :**
- Logs `❌ Erreur Resend lors de l'envoi de l'email`
- Message d'erreur détaillé dans les logs

**Solutions :**
1. Vérifier que la clé API Resend est valide
2. Vérifier que le domaine `bailnotarie.fr` est vérifié dans Resend
3. Vérifier les limites de votre compte Resend
4. Consulter les logs Resend dans le dashboard

### Problème 6 : Inngest Dev Server ne peut pas atteindre l'application

**Symptômes :**
- Les événements sont envoyés mais jamais traités
- Erreurs de connexion dans Inngest Dev Server

**Solutions :**
1. Vérifier que l'application Next.js est bien démarrée
2. Vérifier que l'endpoint `/api/inngest` est accessible
3. En cas de problème de réseau, configurer l'URL manuellement dans Inngest Dev Server

## Tests de diagnostic

### Test 1 : Vérifier la configuration

```bash
# Vérifier les variables d'environnement
echo $RESEND_API_KEY
echo $INNGEST_EVENT_KEY  # Optionnel en développement
```

### Test 2 : Tester l'endpoint Inngest

```bash
# En développement local
curl http://localhost:3000/api/inngest

# Devrait retourner des informations sur les fonctions Inngest
# Si vous voyez une erreur, vérifier que l'application Next.js est démarrée
```

### Test 3 : Vérifier la configuration du client Inngest

```bash
# Vérifier les variables d'environnement
echo $INNGEST_EVENT_KEY  # Optionnel en développement
echo $INNGEST_BASE_URL   # Devrait être vide ou http://localhost:8288 en développement

# En développement, le client doit pointer vers Inngest Dev Server
# Vérifier dans les logs de l'application au démarrage
```

### Test 3 : Vérifier les logs en temps réel

```bash
# Surveiller les logs de l'application
# Chercher les logs avec 📧, ✅, ⚠️, ❌
```

## Checklist de vérification

Avant de signaler un problème, vérifiez :

- [ ] `RESEND_API_KEY` est définie et valide
- [ ] `INNGEST_EVENT_KEY` est définie (production) ou Inngest Dev Server est démarré (développement)
- [ ] L'application Next.js est démarrée
- [ ] L'endpoint `/api/inngest` est accessible
- [ ] Les logs montrent le déclenchement des événements
- [ ] Le domaine d'envoi est vérifié dans Resend
- [ ] Les limites du compte Resend ne sont pas dépassées

## Support

Si le problème persiste après avoir suivi ce guide :
1. Collecter tous les logs pertinents
2. Vérifier le dashboard Inngest pour voir l'état des fonctions
3. Vérifier le dashboard Resend pour voir l'état des envois
4. Documenter les étapes de reproduction

