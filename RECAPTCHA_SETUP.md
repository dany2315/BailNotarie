# 🔒 Configuration reCAPTCHA

## 📋 Étapes de Configuration

### 1. **Obtenir les Clés reCAPTCHA**
1. Allez sur [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Cliquez sur "+" pour créer un nouveau site
3. Choisissez "reCAPTCHA v2" → "Je ne suis pas un robot"
4. Ajoutez votre domaine (ex: `bailnotarie.fr`, `localhost` pour le développement)
5. Copiez la **Site Key** et la **Secret Key**

### 2. **Configuration des Variables d'Environnement**
Créez un fichier `.env.local` à la racine du projet avec :

```env
# reCAPTCHA Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=votre_site_key_ici
RECAPTCHA_SECRET_KEY=votre_secret_key_ici
```

### 3. **Clés de Test (Développement)**
Pour le développement, vous pouvez utiliser les clés de test de Google :
- **Site Key**: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- **Secret Key**: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

⚠️ **Important**: Ces clés de test ne fonctionnent que sur `localhost` et ne doivent jamais être utilisées en production.

## 🚀 Fonctionnalités Implémentées

### ✅ **Interface Utilisateur**
- Composant reCAPTCHA intégré dans le modal de commentaires
- Validation en temps réel
- Messages d'erreur clairs
- Réinitialisation automatique en cas d'erreur

### ✅ **Validation Côté Client**
- Vérification du token reCAPTCHA avant soumission
- Désactivation du bouton de soumission si reCAPTCHA non validé
- Gestion des erreurs et expiration du token

### ✅ **Validation Côté Serveur**
- Vérification du token avec l'API Google reCAPTCHA
- Validation de la clé secrète
- Gestion des erreurs de vérification

### ✅ **Sécurité**
- Token reCAPTCHA obligatoire pour publier un commentaire
- Validation double (client + serveur)
- Approubation automatique si reCAPTCHA valide

## 🔧 Utilisation

1. **Ouverture du modal** : Le reCAPTCHA se charge automatiquement
2. **Validation** : L'utilisateur coche la case "Je ne suis pas un robot"
3. **Soumission** : Le formulaire n'est soumis que si le reCAPTCHA est validé
4. **Publication** : Le commentaire est automatiquement approuvé et visible

## 🐛 Dépannage

### Erreur "Configuration reCAPTCHA manquante"
- Vérifiez que `RECAPTCHA_SECRET_KEY` est définie dans `.env.local`
- Redémarrez le serveur de développement

### Erreur "Vérification reCAPTCHA échouée"
- Vérifiez que `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` est correcte
- Vérifiez que le domaine est autorisé dans la console reCAPTCHA
- Vérifiez que `RECAPTCHA_SECRET_KEY` correspond à la Site Key

### reCAPTCHA ne s'affiche pas
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` est définie
- Vérifiez la connexion internet
