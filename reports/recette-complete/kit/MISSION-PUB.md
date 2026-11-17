# Mission PUB — Site public, connexions, droits d'accès, tous appareils

Appareils : `ordinateur`, `tablette`, `telephone`, `iphone`, `petit`. Rôles : Visiteur, puis chaque rôle pour les
connexions et les redirections.
Données : `donnees-PUB.json` — un compte équipe, un notaire, deux propriétaires et deux locataires ayant un compte.

## A. Site public (chaque page sur ordinateur, téléphone et iPhone)

- Accueil (nouveau design) : barre de navigation et ancres (Comment ça marche, Visite guidée, Avantages, Tarif,
  FAQ), menu mobile, champ « Ouvrez votre dossier » (e-mail vide, mal formé, valide → `/commencer`), badges
  bail d'habitation / bail commercial (ouvrent « Commencer » avec le bon bail ; **connecté**, ils mènent à l'espace
  client), sections animées (visite guidée qui défile, visio de signature, tarif), FAQ dépliable, pied de page
  (liens, téléphone), rechargement qui repart du haut.
- Simulateur (`/simulateur-prix-bail-notarie`) : chaque champ, résultats cohérents, valeurs limites.
- Blog : liste, chaque article s'ouvre (parcours tous les liens de la liste), images présentes, outils interactifs
  des guides (calculateurs), liens internes, articles bail commercial.
- Pages légales : CGU, CGV, mentions légales, politique de confidentialité.
- `/commencer` et ses variantes (`/commencer/suivi`, `/commencer/reminder`, `/commencer/deja-soumis`), `/register`,
  `/login`, `/testFiches` (page de test : accessible au public ? signale-le).
- Bulle « Support » : présente partout sauf `/interface`, ouverture, déplacement, aimantation au bord, position
  retenue après rechargement, ne masque pas les boutons principaux sur téléphone.
- Formulaire de contact s'il existe : envoi capturé, champs obligatoires.
- Référencement : `<title>`, description, balises Open Graph, `robots.txt`, `sitemap.xml`, pas de page publique
  en `noindex` par erreur, pas de page privée indexable. Images : aucune cassée (statut 200).
- Page inexistante → 404 propre. Liens morts : visite tous les liens internes des pages publiques.

## B. Connexions

- `/client/login` : compte inexistant (pas de création publique : message), code faux, code expiré si testable,
  renvoi, code juste ; propriétaire → `/client/proprietaire`, locataire → `/client/locataire`.
- `/notaire/login` et `/login` (équipe) : mêmes vérifications ; un client qui tente la connexion notaire ou équipe.
- Déconnexion de chaque espace ; session expirée ou cookie invalide → retour à la connexion.
- E-mail du code : objet, contenu, validité annoncée.

## C. Droits d'accès croisés (important)

Pour chaque rôle (visiteur, propriétaire A, locataire, notaire, équipe), ouvre les pages des autres espaces et
appelle les routes d'API avec sa session : `/api/client/bails/<id>`, `/api/client/properties/<id>`,
`/api/properties/<id>`, `/api/bail/<id>/messages`, `/api/bail/<id>/party/<partyId>/…`, `/api/blob/get-signed-url`
(clé d'une pièce d'un autre dossier), `/api/notaire/dossiers/<id>/zip`, `/api/user/current`, `/api/user/role`,
`/api/clients/check-email`, `/api/intakes/<jeton>/otp`, `/api/intakes/<jeton>/company-lookup`,
`/api/zone-tendue/check`, `/api/stripe/create-payment-intent` (sans dossier à soi), `/api/stripe/webhook` (sans
signature), `/api/documents/create`, `/api/comments`. Attendu : refus (401/403/404 ou redirection) pour tout ce
qui n'appartient pas au rôle ; jamais de donnée d'un autre client dans la réponse. Utilise uniquement des
identifiants de **tes** dossiers fictifs et de ceux d'un autre compte fictif de tes données.

## D. Qualité générale

Sur chaque page publique et chaque écran de connexion : erreurs JavaScript, réponses 5xx, débordement horizontal
sur téléphone, temps d'affichage ressenti (note les pages très lentes), contraste et lisibilité évidents,
navigation au clavier (ordre de tabulation, focus visible) sur l'accueil et les connexions.
