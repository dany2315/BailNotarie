# Mission ADM-2 — Équipe : la fiche dossier en profondeur

Appareils : `ordinateur` (principal), `portable` ; passage rapide sur `tablette`. Rôle : Équipe (administrateur).
Données : `donnees-ADM-2.json` — neuf dossiers fictifs : cinq en vérification (dont un locataire marié, un bien à
**Paris** pour l'encadrement des loyers), un en vérification **non payé**, un formulaire locataire en attente, un
en attente de locataire, un déjà chez le notaire ; deux notaires. Utilise un dossier différent pour chaque famille
de tests destructifs, afin qu'un test ne fausse pas le suivant.

Tout se passe sur `/interface/baux/<bailId>` de tes dossiers fictifs. N'ouvre un dossier réel qu'en lecture.

## A. Lecture de la fiche

En-tête (étape, paiement, statut, parties), frise des étapes, bloc « Avancement », « Suivi » (notaire, formulaires,
demandes, relances), notes internes (ajout, affichage), historique / audit, détails techniques.

## B. Conformité légale

Plafond de loyer (commune hors encadrement ; **Paris** : zone, loyer de référence, dépassement, complément de
loyer et sa justification, logement exclu de l'encadrement), évolution du loyer en zone tendue (relocation :
ancien loyer, travaux), dépôt de garantie (nu 1 mois, meublé 2 mois : essaie un dépassement), diagnostics (lignes
par diagnostic, aide-mémoire des validités, saisie manuelle du DPE, classes F/G et interdictions), pièces
obligatoires selon la situation familiale et la copropriété, règles manuelles validées par la pastille.

## C. Vérification point par point

Valider / retirer la validation d'un point, « Tout valider » par bloc, compteur global, bouton « Valider et
envoyer au notaire » bloqué tant qu'il reste un point, et bloqué sur le dossier **non payé**.

## D. Modifications depuis la fiche

Type et durée (nu 3 ans → meublé 1 an : date de fin recalculée ; dépôt à ajuster), dates, loyer, charges, jour de
paiement, dépôt ; identité, coordonnées, situation familiale du propriétaire et du locataire ; adresse et
description du bien, équipements du meublé, statut du bail (sélecteur). Valeurs invalides refusées (loyer 0 ou
négatif, jour 32, date impossible, e-mail mal formé). Effet sur l'accord du locataire : un changement de loyer, de
charges, de dépôt, de type ou de date retire l'accord (mention « à renouveler », ligne d'historique en base) ; un
changement de jour de paiement ou une sauvegarde sans changement ne le retire pas.

## E. Pièces

Voir, télécharger (nom de fichier lisible), ajouter, ajouter un second fichier à la même pièce (empilés),
remplacer, supprimer (pièce `recette-…` uniquement), « Redemander ».

## F. Demandes de complément (équipe → propriétaire ou locataire)

Fenêtre unique : pièces (motifs illisible / expirée / mauvais document / incomplète, autre pièce, pièces
facultatives) et informations (à corriger / à confirmer), aperçu de l'e-mail modifiable, envoi (e-mail capturé),
relance, annulation. Réponds avec le compte client concerné, puis côté équipe : accepter une information (écrite
à ce moment seulement, journal avant/après), **conflit** si la fiche a changé entre-temps (essaie une information
à un champ et une à plusieurs champs, ex. « nom et prénom » ou « loyer »), redemander avec motif, accepter une
pièce en archivant l'ancienne ou sans rien retirer, « Tout accepter », bloc « Pièces archivées » (voir le fichier).

## G. Locataire

Ajouter un locataire au dossier en attente (dates exigées), relancer le locataire pour son formulaire, **changer
de locataire** sur un dossier en vérification (ancien accord historisé, nouvelle invitation, ancien locataire
sans accès), supprimer un dossier fictif (fenêtre de confirmation, sort du locataire).

## H. Paiement

Dossier payé (date, référence), dossier non payé (bandeau, blocages). Sur les dossiers réels à « ancien paiement
à vérifier » : lecture seule de l'encart, aucun clic.

## I. Envoi au notaire et suite

Choix du notaire, note, envoi (statut, e-mail au notaire capturé, événements vers les clients), dossier vu chez
le notaire, réassignation à l'autre notaire si l'écran le permet, changement de statut depuis la fiche, dossier
déjà chez le notaire : ce qui reste modifiable.
