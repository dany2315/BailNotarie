# Recette au navigateur — résultats du 16/11/2026

Branche locale `codex/prep-pr-main`. Rien n'a été poussé, aucune PR, aucune écriture en production ni sur staging.

## Conditions

| Élément | Ce qui a servi |
| --- | --- |
| Base de données | La copie de test (`DATABASE_MIGRATE_TEST`), jamais staging ni la production |
| Serveur | Build de production de la branche, lancé en local sur le port 3210 |
| Paiements | Stripe en **mode test** (clés `sk_test_`), deux paiements fictifs de 39,90 € et 59,90 € |
| E-mails | Doublure locale : 5 e-mails écrits dans un fichier, **aucun envoyé** |
| Tâches de fond | Doublure locale : 23 événements écrits dans un fichier, aucun exécuté |
| Fichiers | Doublure locale : 10 fichiers de test déposés sur la machine. Le vrai stockage S3 n'a jamais été contacté : aucune lecture, aucun dépôt, **aucune suppression** |
| Messagerie en direct | Clés factices |
| Comptes | Uniquement des comptes fictifs en `@example.invalid` (propriétaire, deux locataires, notaire, administrateur) |

La saisie de la carte dans le cadre Stripe n'est pas accessible au navigateur de recette : le paiement a été
confirmé côté Stripe test avec une carte de test, puis le webhook signé a été envoyé au serveur local.

## Résultat

Deux dossiers fictifs menés à l'écran : un bail d'habitation, de la page d'accueil jusqu'à « Signé », et un
bail commercial, de l'espace client jusqu'à l'attente du locataire. **Deux défauts trouvés et corrigés**, que
les tests serveur ne voyaient pas. Après nettoyage, les 41 tables de la copie sont identiques à l'empreinte
prise avant la campagne (nombre de lignes et valeurs).

Tests serveur relancés après les corrections : 111 tests, 0 échec (30 + 11 + 18 + 26 + 19 + 7).

## Parcours vérifiés à l'écran

### Propriétaire

| Parcours | Constat |
| --- | --- |
| Démarrage depuis le site, connexion par code reçu par e-mail | Code lu dans l'e-mail capturé, connexion faite |
| Formulaire d'habitation | 12 étapes, plus d'étape « Dates du bail » seule |
| Étape « Locataire » sans locataire | Seul l'e-mail est demandé ; « Continuer sans locataire » |
| Étape « Locataire » avec un e-mail | La date de prise d'effet et le jour de paiement apparaissent ; refus sans eux |
| Étape « Documents » | Paiement refusé tant que les pièces obligatoires manquent |
| Paiement refusé puis accepté | Même ordre de paiement réutilisé : un seul par dossier |
| Webhook Stripe | Signature fausse refusée (400), bonne signature acceptée, rejeu reconnu comme doublon |
| Page fermée après le paiement | Au retour, le formulaire se termine sans repayer |
| Ajout du locataire depuis l'espace client | Dates exigées ; date de fin calculée par le serveur (01/02/2027 → 01/02/2030) |
| Bail commercial depuis l'espace client | 15 étapes, identité reprise ; dates demandées à l'étape « Locataire » ; fin calculée (01/03/2027 → 01/03/2036) ; frais de 59,90 € |
| Demande de l'équipe (une pièce, le loyer) | Visible dans « À faire » ; la réponse part à l'équipe sans modifier le dossier |

### Locataire

| Parcours | Constat |
| --- | --- |
| Ouverture du formulaire par un autre compte | Refusée : code envoyé à l'adresse du locataire exigé |
| Récapitulatif du bail | Loyer, charges, dépôt, dates et jour de paiement affichés |
| Marié, séparation de biens | Contrat de mariage exigé |
| Envoi sans confirmation, puis sans pièces | Refusé deux fois, avec le bon message |
| Envoi complet | Accord enregistré avec les conditions vues (loyer 600 €, charges, dépôt, dates) |
| Loyer modifié par l'équipe (600 → 620 €) | Accord retiré et gardé dans l'historique ; carte « Votre confirmation est à renouveler » ; nouvelle confirmation enregistrée à 620 € |
| Demande du notaire | Réponse à une information, à une pièce ; en passant « Pacsé(e) », la convention de PACS s'ajoute d'elle-même à la demande |
| Pièce archivée | Accès refusé au locataire |

### Équipe

| Parcours | Constat |
| --- | --- |
| Fiche du dossier | Paiement Stripe, accord du locataire, pièces obligatoires affichés |
| Envoi au notaire avec des points non validés | Bouton bloqué (« Encore 15 points à valider ») |
| Envoi au notaire d'un ancien dossier non payé | Bouton bloqué (« Les frais de dossier ne sont pas payés ») |
| Encart « Ancien dossier : paiement à vérifier » | Affiché sur un des six dossiers concernés (consulté sans rien modifier) |
| Création d'un notaire, envoi du dossier | Statut « Prêt pour notaire », notaire prévenu par e-mail |
| Demande au propriétaire, acceptation | Loyer écrit à l'acceptation seulement (1 500 → 1 600 €) ; ancienne pièce archivée au choix de l'équipe |
| Pièces archivées | Bloc visible, avec l'auteur et la pièce de remplacement |

### Notaire

| Parcours | Constat |
| --- | --- |
| Liste et fiche | Il ne voit que son dossier, complet |
| Téléchargement de toutes les pièces | Archive zip valide |
| Dossier d'un confrère | Refusé (403), rien n'apparaît |
| Espaces équipe et client | Redirigé |
| Demande au locataire | Aperçu de l'e-mail, envoi |
| Dossier modifié entre-temps par l'équipe | Averti avant d'accepter : « lors de la réponse : Testeur / aujourd'hui : Analyste » |
| Archivage par le notaire | Il retire lui-même l'ancienne pièce d'identité, et peut la rouvrir |
| Statuts | « En traitement » puis « Signé » |

### E-mails capturés

Cinq e-mails (deux codes de connexion, dossier assigné au notaire, deux demandes de complément) : destinataire
fictif, aucun texte manquant (`undefined`, `null`), liens vers le serveur local. Le lien de la demande ouvre la
bonne page pour son destinataire, et rien pour l'autre partie.

## Défauts trouvés et corrigés

1. **Le locataire ne voyait pas qu'il devait reconfirmer.** Après un changement de loyer, son tableau de bord
   affichait « rien à faire de votre côté » ; seule la page du bail montrait la carte. La confirmation à
   renouveler apparaît maintenant dans « À faire » et sur la ligne du bail. Revu à l'écran après correction.
2. **Faux conflit sur une information à plusieurs champs.** À l'acceptation du loyer d'un bail commercial,
   l'équipe voyait « Le dossier a été modifié depuis la réponse du client » alors que rien n'avait changé. La
   comparaison dépendait de l'ordre des champs, que la base réordonne. « Nom et prénom » était touché aussi.
   Corrigé, avec un test qui échouait avant et réussit après. Revu à l'écran après correction.

## Observations laissées en l'état

Aucune ne vient de cette branche, sauf la première, qui est un choix du plan.

1. **L'envoi au notaire n'est pas bloqué quand la confirmation du locataire est à renouveler.** La fiche
   l'indique, mais l'équipe peut envoyer. Le plan demandait d'afficher l'état, pas de bloquer. À décider.
2. Le locataire reçoit son lien dès que le propriétaire valide l'étape « Locataire », donc avant le paiement
   (déjà le cas sur staging).
3. À l'envoi au notaire, deux événements « statut du dossier » partent vers le propriétaire.
4. Le notaire passe un dossier à « Signé » en un clic, sans confirmation.
5. Après le passage de « Marié » à « Pacsé », le contrat de mariage reste dans les pièces actives.
6. Formulaire propriétaire : cliquer sur le libellé « Jour de paiement » ne place pas le curseur dans le champ.
7. Fenêtre de demande, bail commercial : la ligne « Emplacement du local » affiche « Emplacement : non ».
8. Page de fin du formulaire propriétaire : « Le locataire reçoit un lien » s'affiche même sans locataire.
9. Fiche de l'équipe, bloc « Suivi » : « Demandes du notaire : Aucune » alors qu'une demande de complément du
   notaire est en cours (ce bloc ne compte que les messages).
10. Un double clic sur « Accepter » affiche « Le client n'a pas encore répondu pour cette ligne ».
11. Les notifications internes visent les trois adresses réelles de l'équipe. Elles ont été capturées, pas
    envoyées ; en réel, elles partiront.

Dans cet environnement (serveur local, base distante), la fiche de l'équipe met 6 à 7 secondes à se mettre à
jour après une action. Ce délai tient au montage de test, pas au code.

## Non vérifié à l'écran

- La saisie de la carte dans le cadre Stripe, et un webhook envoyé par Stripe lui-même.
- La réception réelle des e-mails, le vrai stockage S3, la messagerie en direct, les tâches de fond réelles.
- Le changement de locataire par l'équipe, la confirmation d'un paiement ancien, le blocage « barèmes non
  importés », le paiement « en cours » : couverts par les tests serveur seulement.
- Le formulaire propriétaire ouvert par un lien créé par l'équipe (même formulaire que depuis le site).
- La lecture automatique des diagnostics (clé OpenAI absente du serveur de recette).
- L'affichage sur téléphone, sauf le formulaire locataire, rempli dans une fenêtre étroite.
- Les écrans de staging que cette branche ne modifie pas (blog, simulateur, recherche, relances).

## Nettoyage

- Copie de test : 109 lignes fictives supprimées dans 19 tables, en une transaction validée seulement si chaque
  table retrouvait son nombre de lignes de départ. Empreinte finale identique à celle de départ
  (`empreinte-avant-recette.json` et `empreinte-apres-recette.json`).
- Serveur de recette et doublures arrêtés ; fichiers locaux de recette supprimés ; entrée temporaire de
  lancement retirée.
- Restent dans le compte Stripe **de test** : deux paiements fictifs (39,90 € et 59,90 €). Stripe ne permet pas
  de les supprimer ; ils n'existent pas en mode réel.

## Outils ajoutés (dossier `scripts/prep/`)

`mock-services.cjs` (doublures locales), `serve-recette.cjs`, `stripe-test.cjs` (paiement et webhook en mode
test), `session-recette.cjs` (session pour un compte fictif), `nettoyage-recette.cjs` (nettoyage contrôlé).
