# Mission PRO-D — Propriétaire sur ordinateur

Appareils : `ordinateur` (principal) et `portable`. Rôle : Propriétaire (plus Visiteur avant connexion).
Données : `donnees-PRO-D.json` — un propriétaire (`dossiers[0].proprietaire.email`) qui a déjà quatre dossiers
(signé, en attente de locataire, en vérification, formulaire locataire en attente), un compte équipe et un notaire
pour jouer les autres rôles quand un parcours l'exige.

## A. Création d'un dossier depuis le site, de bout en bout (compte neuf)

Avec une adresse neuve `recette-prod-nouveau1@example.invalid` :
1. Page d'accueil → champ « Ouvrez votre dossier » → `/commencer` ; choix bail d'habitation ; connexion par code
   reçu par e-mail (code faux refusé, renvoi du code, code juste accepté).
2. Formulaire propriétaire **habitation, personne physique**, toutes les étapes : type de client, identité (une
   puis deux personnes : ajout, suppression d'une personne), situation familiale (célibataire, marié avec chaque
   régime, pacsé : pièces exigées qui changent), bien (adresse avec suggestions, type par cartes, surface, pièces
   principales, époque de construction, régime juridique : monopropriété / copropriété / lotissement et pièces
   associées), équipements si meublé, type de bail (nu 3 ans, nu 6 ans, meublé 1 an, meublé 9 mois), étape
   « Le loyer » guidée (une question à la fois, zone tendue / encadrement : essaie une adresse à Paris et une
   hors zone), charges, dépôt de garantie (plafond légal : dépassement refusé), locataire (sans locataire ; avec
   e-mail → date de prise d'effet et jour de paiement exigés, date de fin annoncée), documents (refus sans pièce
   obligatoire, plusieurs fichiers pour une pièce, suppression d'un fichier), paiement.
3. Sur chaque étape : champs obligatoires vides refusés avec message clair, bouton « Enregistrer », retour
   arrière sans perte, rechargement de la page (reprise à la bonne étape), repère d'avancement juste.
4. Paiement : estimation des honoraires du notaire affichée, conditions générales à accepter, carte refusée puis
   carte acceptée dans le vrai cadre Stripe, un seul ordre de paiement (vérifie en base), page de succès, reçu.
   Rouvrir le lien du formulaire après envoi → page « déjà soumis ».
5. Variante : un second dossier **sans locataire**, puis ajout du locataire depuis l'espace client.

## B. Espace client propriétaire (`/client/proprietaire`), avec le compte déjà fourni

- Tableau de bord : phrase de synthèse, compteurs, « À faire maintenant », cartes de dossiers selon le statut.
- Mes dossiers : liste, filtres, détail d'un bail dans chaque statut (dates, loyer, parties, étapes, notaire).
- Ajouter le locataire à un dossier en attente (dates exigées, e-mail invalide refusé, e-mail du propriétaire refusé).
- Nouveau dossier depuis l'espace : bien existant (un seul bail à la fois par bien : blocage expliqué), nouveau
  bien, étapes, paiement dans l'espace client (un seul ordre de paiement même en rouvrant l'écran).
- Renouveler un bail (`/baux/[id]/renouveler`) sur le dossier signé.
- Mes biens : liste, fiche, ajout d'un bien, pièces du bien.
- Mes informations : lecture, modification, pièces.
- Demandes de l'équipe : fais créer par le compte équipe une demande (une pièce + une information) sur un de tes
  dossiers, réponds-y côté propriétaire (réponse partielle refusée, envoi), puis fais-la accepter côté équipe.
- Messagerie avec le notaire sur le dossier signé / chez le notaire (envoi d'un message, d'un fichier).
- Bulle « Support », menu de l'avatar, déconnexion, redirection si on ouvre `/client/locataire` ou `/interface`.

## C. Contrôles transverses

Erreurs JavaScript et réponses 5xx (`s.journal`), liens morts, textes tronqués, fautes visibles, montants et dates
au format français, cohérence entre l'écran et la base.
