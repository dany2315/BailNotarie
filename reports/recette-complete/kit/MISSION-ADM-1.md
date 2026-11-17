# Mission ADM-1 — Équipe : pilotage, listes et créations

Appareils : `ordinateur` (principal), `portable`, puis `tablette` et `telephone` pour vérifier que l'espace reste
utilisable. Rôle : Équipe (compte `comptes.admin`, rôle administrateur).
Données : `donnees-ADM-1.json` — neuf dossiers fictifs, un par statut (brouillon non payé, attente locataire,
formulaire locataire en attente, vérification habitation et commercial, prêt pour notaire, chez le notaire,
signé, brouillon commercial), deux notaires.

Attention : les listes de l'équipe affichent aussi des dossiers **réels**. Tu les lis, tu ne les touches pas, tu ne
les captures pas (filtre ou recherche « recette » avant toute capture). L'agent ADM-2 teste la fiche dossier en
profondeur : toi, tu couvres tout le reste de `/interface`.

## A. « À traiter » (`/interface`)

Compteurs par étape et « Frais non payés », onglets « À faire par nous / En attente du client / Chez le notaire »,
ordre (plus anciens d'abord), pastilles d'ancienneté, boutons d'action d'une ligne (sur tes dossiers seulement) :
« Relancer le propriétaire / le locataire » → fenêtre qui montre l'e-mail et dit à qui, envoi, trace de la relance,
délai avant la relance suivante. Boutons « Nouveau dossier », « Ajouter un lead », « Inviter le propriétaire »,
« Rechercher ».

## B. Dossiers (`/interface/baux`)

Liste, recherche, filtres (étape, statut, payé / non payé, habitation / commercial, notaire), tri, pagination,
libellés de statut, badge de paiement ; vérifie chaque compteur et chaque filtre contre la base (`R.sql`).
Ouverture d'une fiche, retour à la liste avec les filtres conservés.

## C. Créations

- Nouveau dossier (`/interface/baux/new`) de bout en bout sur des données fictives.
- Ajouter un lead ; convertir un lead (`/intakes/<jeton>/convert`).
- Inviter le propriétaire : e-mail capturé (nom, lien), le lien ouvre le formulaire après le code.
- Nouveau lien de formulaire (`/interface/intakes/new`) pour un de tes biens fictifs ; liste « Formulaires
  envoyés » (statuts, relance, révocation sur tes liens seulement).
- Nouveau client (`/interface/clients/new`), modification (`/clients/[id]/edit`).

## D. Clients, biens, notaires, notifications, recherche

- Clients : liste (type, profil, complétude), fiche d'un client fictif (identité, pièces, dossiers liés), édition.
- Biens : liste, fiche d'un bien fictif, modification (`/properties/[id]/edit`), DPE, pièces.
- Notaires : liste, création d'un notaire fictif (e-mail de bienvenue capturé), dossiers d'un notaire.
- Notifications : liste, lecture, « tout marquer comme lu » (elles ne concernent que ton compte fictif).
- Recherche (`/interface/recherche`) : par nom, e-mail, adresse ; résultats cliquables ; recherche vide.
- Menu latéral (repli), fil d'Ariane, déconnexion.

## E. Droits et rôles

Un compte propriétaire, locataire ou notaire qui ouvre `/interface/...` est redirigé. Les actions serveur de
l'équipe refusent un appel sans session.

## F. Petits écrans

Sur `tablette` et `telephone` : menu latéral, tableaux (défilement interne plutôt que page entière), fenêtres de
relance et de création, fiche dossier lisible. Note ce qui devient inutilisable.
