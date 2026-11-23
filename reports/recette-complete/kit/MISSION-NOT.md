# Mission NOT — Notaire, ordinateur et téléphone

Appareils : `ordinateur`, `portable`, `telephone`, `iphone` (écrans clés). Rôle : Notaire.
Données : `donnees-NOT.json` — notaire n° 1 (`comptes.notaires[0]`) avec six dossiers (trois prêts habitation dont
un locataire marié, un commercial, un « en traitement », un signé) ; notaire n° 2 avec un dossier (pour vérifier le
cloisonnement) ; un compte équipe ; propriétaires et locataires ayant un compte, pour répondre aux demandes.

## A. Connexion

`/notaire/login` : code par e-mail (adresse inconnue, adresse d'un client, code faux, renvoi, code juste),
redirection, déconnexion. Un notaire sur `/interface` ou `/client` est redirigé.

## B. Tableau de bord et liste

Tableau de bord (`/notaire`), menu latéral unique, liste des dossiers (`/notaire/dossiers`) : onglets « En cours /
Signés / Classés » et leurs compteurs, recherche par nom ou adresse, tri, sélection d'un dossier, lien direct
`?dossierId=…`. Sur téléphone : liste puis détail (vue mobile), retour à la liste.

## C. Fiche du dossier

Conditions du bail (habitation et commercial : conditions commerciales, loyer hors taxes), bien, propriétaire,
locataire (personne physique, mariée avec régime, société), mention de l'accord du locataire, **icône de copie**
sur chaque ligne (le presse-papiers reçoit la bonne valeur), pièces groupées par partie, aperçu d'une pièce,
téléchargement d'une pièce (nom lisible), « Tout télécharger » et « Zip » (archive valide, bon nombre de fichiers).

## D. Demandes du notaire

« Demander » au propriétaire et au locataire : pièces (chaque motif), autre pièce, informations (à corriger / à
confirmer), aperçu de l'e-mail, envoi (e-mail capturé). Fais répondre le client avec son compte. Puis côté
notaire : accepter une information, **conflit** quand l'équipe a modifié la fiche entre-temps (une information à
un champ, une à plusieurs champs), redemander, accepter une pièce **en archivant l'ancienne** (le notaire en a le
droit sur ses propres demandes), rouvrir la pièce archivée, « Tout accepter », demande « Terminée ». Le notaire
ne voit pas les demandes de l'équipe ni les pièces archivées par l'équipe.

## E. Messagerie (« Discuter »)

Avec le propriétaire et avec le locataire : envoi d'un message, d'un fichier, lecture côté client (recharger),
réponse du client visible côté notaire. Le temps réel est désactivé dans ce montage : recharge la page.

## F. Statuts

« À contacter → En traitement → Signé », « Désisté », « Classé sans suite » (sur des dossiers différents), effet
sur les onglets, sur l'espace client et sur la fiche de l'équipe. Retour en arrière possible ou non : note-le.

## G. Cloisonnement

Le notaire n° 1 ne voit pas le dossier du notaire n° 2 : ni dans la liste, ni par `?dossierId=`, ni le zip
(`/api/notaire/dossiers/<id>/zip` → refus), ni une pièce, ni la messagerie.

## H. Téléphone

Tout le parcours B à F sur `telephone`, écrans clés sur `iphone` : débordement, menu, fenêtre « Demander »,
aperçu de pièce, boutons de statut, copie.
