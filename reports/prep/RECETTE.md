# Recette manuelle — à faire sur staging, puis contrôles sur main

> Cette liste a été déroulée le 16/11/2026 sur un serveur local isolé (copie de test, Stripe en mode test,
> e-mails et fichiers capturés en local). Résultats dans `RECETTE_RESULTATS.md`. Restent à faire par vous sur
> staging : ce qui passe par les vrais services (points A) et la section 8 après la mise en production.

Niveaux : **A** = indispensable (mes tests ne peuvent pas le vérifier) · **B** = recommandé (règle testée côté
serveur, écran non vu) · **C** = facultatif (déjà testé et vu à l'écran).

Conditions : sur staging, une fois la branche fusionnée, les migrations passées, les barèmes importés et le
webhook Stripe de test déclaré. Stripe en mode test (carte 4242 4242 4242 4242). Adresses e-mail de test.

## Ce que mes 111 tests prouvent déjà

Les règles côté serveur des lots 1 à 5, y compris les cas qu'on ne peut presque pas provoquer à la main :
mauvais montant ou mauvaise devise, paiement réutilisé pour un autre dossier, deux requêtes simultanées,
événements Stripe en double ou dans le désordre, action serveur appelée directement, accès d'un client aux
données d'un autre, conflit sur une réponse de complément, pièce archivée non supprimable, conservation des
données existantes après migration.

## Ce qu'ils ne prouvent pas

1. Rien de ce qui passe par un vrai service : paiement Stripe réel, webhook réel, e-mails, envoi et
   téléchargement de fichiers, messagerie en direct, tâches de fond.
2. Sur les vrais services, aucun écran : la recette au navigateur du 16/11/2026 a utilisé des doublures locales.
3. Les fonctionnalités de staging que je n'ai pas écrites (178 commits absents de main) : bail commercial,
   lecture des diagnostics, espace notaire refait, écrans des demandes de complément, contrôle du loyer à
   l'écran, connexion par code. Mes tests ne les touchent qu'en passant.
4. L'affichage sur téléphone.

## 1. Propriétaire — formulaire rempli depuis le site (`/commencer`) ou par un lien de l'équipe (`/intakes/…`)

| Niv. | Test | Résultat attendu |
| --- | --- | --- |
| A | Ouvrir le lien, recevoir le code par e-mail, le saisir | Accès au formulaire |
| A | Bail d'habitation, **sans** locataire, jusqu'au bout | Aucune date demandée ; étape Documents présente ; paiement 39,90 € ; page de succès ; dossier « en attente du locataire », payé |
| A | Même parcours **avec** un e-mail de locataire | La date de prise d'effet et le jour de paiement apparaissent dans l'étape Locataire ; impossible de continuer sans eux ; date de fin affichée ; le locataire reçoit son e-mail |
| A | Envoyer chaque pièce (identité, diagnostics, titre de propriété…), puis la rouvrir | Fichier lisible ; sans pièce obligatoire, impossible d'aller au paiement |
| A | Bail commercial jusqu'au bout | Étape « Durée du bail » sans dates ; frais de 59,90 € |
| A | Payer, puis fermer l'onglet avant la page de succès ; rouvrir le lien | Pas de second paiement demandé ; le formulaire se termine ; un seul paiement dans Stripe |
| A | Carte refusée (4000 0000 0000 0002), puis bonne carte | Message clair ; un seul paiement réussi dans Stripe |
| A | Carte avec authentification 3D Secure (4000 0027 6000 3184) | Paiement confirmé après validation |
| B | Quitter au milieu, reprendre plus tard sur un autre appareil | Reprise à la bonne étape, réponses conservées |
| B | Adresse à Paris avec un loyer trop élevé | Blocage ou demande de justification ; questions de zone tendue |
| B | Un lien envoyé avant la mise à jour | S'ouvre et demande le code |
| B | Tout le parcours sur téléphone | Lisible, boutons accessibles |

## 2. Propriétaire — espace client (`/client/proprietaire`)

| Niv. | Test | Résultat attendu |
| --- | --- | --- |
| A | Connexion par code reçu par e-mail | Accès au tableau de bord |
| A | Nouveau bail **sans** locataire, payé | 4 étapes, pas d'étape Dates ; le bail apparaît dans les dossiers |
| A | Sur ce bail, « Ajouter le locataire » | La fenêtre demande la date de prise d'effet et le jour de paiement ; refus sans eux ; le locataire reçoit son e-mail ; date de fin affichée |
| A | Nouveau bail **avec** locataire, payé | Étape Dates présente et obligatoire |
| A | Répondre à une demande de complément (une information + une pièce) et l'envoyer | Réponse visible côté client ; **le dossier ne change pas** tant que l'équipe n'a pas accepté |
| B | Ouvrir deux fois l'écran de paiement, double clic sur Payer | Un seul ordre de paiement dans Stripe |
| B | Brouillon : enregistrer, quitter, reprendre | Valeurs conservées, pas de date inventée |
| B | Page d'un bail sans date | « Date de début » et « Date de fin » vides (pas 01/01/1973) |
| B | Biens (liste, fiche, nouveau), informations, demandes, renouvellement d'un bail terminé | Pages sans erreur |
| B | Messagerie avec le notaire | Message reçu en direct des deux côtés |

## 3. Locataire (`/intakes/…`, `/client/locataire`)

| Niv. | Test | Résultat attendu |
| --- | --- | --- |
| A | Formulaire locataire par lien : code, saisie, pièces, case de confirmation, envoi | La case rappelle le loyer, les charges et la date ; envoi réussi |
| A | L'équipe modifie ensuite le loyer | Espace locataire : encart « Votre confirmation est à renouveler » ; après confirmation, l'équipe la voit |
| B | Demande de complément adressée au locataire | Même comportement que côté propriétaire |
| B | Après remplacement du locataire par l'équipe, l'ancien se connecte | Il ne voit plus le bail |
| B | Tableau de bord, baux, informations | Pages sans erreur |

## 4. Équipe (`/interface`)

| Niv. | Test | Résultat attendu |
| --- | --- | --- |
| A | Ouvrir la fiche d'un brouillon, d'un dossier en vérification, d'un dossier chez le notaire, d'un dossier signé, d'un bail commercial | Toutes les sections s'affichent, sans erreur |
| A | Dossier complet et payé : « Valider et envoyer au notaire » | Notaire assigné, statut « prêt pour notaire », e-mail au notaire |
| A | Même bouton sur un dossier non payé, puis sur un dossier avec une pièce manquante, puis sans date d'effet | Refus avec un message clair à chaque fois |
| A | Demande de complément : choisir pièces et informations, aperçu de l'e-mail, envoyer | E-mail reçu par le client |
| A | Réponse reçue : accepter une information | La valeur n'entre dans le dossier qu'à ce moment-là |
| A | Modifier la même valeur dans le dossier **avant** d'accepter la réponse | Avertissement « le dossier a été modifié » ; rien n'est écrasé sans confirmation |
| A | Accepter une pièce en cochant une ancienne pièce | L'ancienne passe dans « Pièces archivées », reste consultable par l'équipe, disparaît pour le client et le notaire |
| A | Accepter une pièce sans rien cocher ; « Tout accepter » ; redemander ; annuler ; relancer | Anciennes pièces conservées ; e-mails de relance reçus |
| A | Modifier le loyer d'un dossier confirmé par le locataire ; changer de locataire | « Confirmation du locataire à renouveler » affiché |
| A | Ancien dossier sans paiement : confirmer avec une preuve, sans date | « Paiement historique confirmé — date du paiement inconnue » ; le dossier compte parmi les payés |
| B | Liste des dossiers : onglets d'étape, filtre payés / non payés, recherche, compteurs | Chiffres cohérents avec la liste |
| B | Tableau de bord « À traiter », relances, notifications, recherche globale | Sans erreur |
| B | Clients : liste, fiche, modification, création ; biens : liste, fiche, modification | Sans erreur |
| B | Liens de formulaire : liste, création, renvoi | E-mail reçu |
| B | Notaires : liste, dossiers d'un notaire, assignation | Sans erreur |
| B | Bloc loyer : zone, catégorie, logement exclu, complément de loyer | Enregistrement et affichage corrects |
| B | Conditions du bail commercial, points de vérification, notes internes | Enregistrement correct |
| B | Lecture des diagnostics (si la clé OpenAI est posée sur staging) | Résultat affiché ; vérifier ce qu'elle modifie sur le bien |
| B | Comptes opérateur et relecteur | Accès limités comme prévu |

## 5. Notaire (`/notaire`)

| Niv. | Test | Résultat attendu |
| --- | --- | --- |
| A | Connexion, liste des dossiers, ouverture d'un dossier | Données et pièces affichées ; aucune pièce archivée |
| A | Télécharger le dossier complet (zip) | Archive lisible, pièces actives seulement |
| A | Demander un complément, suivre la réponse, l'accepter | Le client reçoit l'e-mail ; la valeur entre dans le dossier à l'acceptation |
| A | Passer le dossier à « client contacté », puis « signé » | Statuts mis à jour côté équipe et côté client |
| B | Messagerie avec le client | Message reçu en direct |
| B | Un notaire non assigné tente d'ouvrir le dossier | Refus |

## 6. E-mails

Niveau A : pour chaque e-mail déclenché ci-dessus, vérifier qu'il arrive, qu'il se lit bien sur téléphone et que
son bouton mène à la bonne page : code de connexion, formulaire propriétaire, formulaire locataire, demande de
complément et relance, assignation du notaire, changement d'état, message de la messagerie, confirmation d'envoi.

## 7. Site public

Niveau B : accueil et badges des deux baux, `/commencer`, simulateur de prix, blog, formulaire de contact,
pied de page (numéro de téléphone 07 68 09 86 24, deux fichiers en conflit de fusion).

## 8. Sur main, juste après la mise en production

| Niv. | Contrôle | Résultat attendu |
| --- | --- | --- |
| A | Journal du déploiement Vercel | 23 migrations appliquées, aucune erreur |
| A | Import des barèmes, puis vérification | « la base correspond aux fichiers » |
| A | Événement de test envoyé depuis le tableau de bord Stripe | Réponse 200 du webhook |
| A | Ouvrir un dossier signé, un dossier en cours, un bail commercial | Données identiques à avant |
| A | Liste des dossiers et compteurs | Mêmes totaux qu'avant la bascule, hors « payés » historiques |
| A | Ouvrir un lien de formulaire encore en attente | Il demande le code et s'ouvre |
| A | Lister les six anciens paiements, puis les vérifier un par un | Aucun confirmé sans preuve |
| B | Un vrai paiement de bout en bout, remboursé ensuite | Dossier payé, reçu Stripe envoyé |
