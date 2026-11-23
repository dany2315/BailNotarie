# Mission PRO-M — Propriétaire sur téléphone

Appareils : `telephone` (Android, principal), `iphone` (moteur Safari) sur les écrans clés, `petit` (375 px) pour
les écrans denses. Rôle : Propriétaire (plus Visiteur avant connexion).
Données : `donnees-PRO-M.json` — un propriétaire avec trois dossiers (chez le notaire, en attente de locataire,
bail commercial en vérification), un compte équipe et un notaire pour les rôles d'appui.

Ta mission double celle de l'agent PRO-D sur téléphone, avec d'autres variantes pour élargir la couverture.

## A. Création d'un dossier depuis le site sur téléphone (compte neuf)

Adresse neuve `recette-prom-nouveau1@example.invalid`.
1. Accueil mobile : barre de navigation, menu, champ « Ouvrez votre dossier », badges des deux baux → `/commencer`.
2. Connexion par code sur téléphone (clavier numérique, collage du code, renvoi).
3. Formulaire propriétaire **personne morale** (société / SCI) : recherche par SIREN (essaie un SIREN inexistant
   et un numéro mal formé ; la recherche réelle peut échouer sans réseau : note-le), représentant légal, Kbis,
   statuts ; bien en **copropriété** (règlement de copropriété, syndic) ; bail **meublé 1 an** (liste des
   équipements du meublé) ; étape loyer ; locataire avec e-mail + dates ; documents ; paiement.
4. Spécifique téléphone, à chaque étape : pas de défilement horizontal, bouton « Continuer » toujours visible,
   champs date (saisie JJ/MM/AAAA et calendrier), listes déroulantes et recherche de nationalité utilisables,
   dépôt de fichier, geste « retour » (bouton retour du navigateur : revient à l'étape précédente, ne quitte pas
   le formulaire), rotation paysage sur une étape, clavier qui ne masque pas le bouton.
5. Paiement sur téléphone : résumé, conditions, cadre Stripe, carte refusée puis acceptée, page de succès.
6. Refais les étapes clés (identité, bien, locataire, documents, paiement) sur `iphone`.

## B. Espace client propriétaire sur téléphone, avec le compte fourni

Tableau de bord, barre de navigation mobile, « Mes dossiers » et détail de chaque statut, ajout du locataire
(fenêtre qui tient dans l'écran), nouveau dossier depuis l'espace (habitation **et** ouverture du questionnaire
commercial), mes biens (liste, fiche, ajout), mes informations (modification), demandes de l'équipe (réponse à
une pièce et à une information), messagerie avec le notaire, aperçu d'une pièce (fenêtre à la largeur de l'écran,
nom de fichier long tronqué), bulle « Support » (déplaçable, ne masque pas les boutons), déconnexion.

## C. Contrôles transverses

Sur chaque écran : `R.debordement`, capture `telephone` (et `iphone` pour les écrans clés), erreurs JavaScript,
réponses 5xx, lisibilité (texte coupé, boutons superposés, fenêtres plus hautes que l'écran sans défilement).
