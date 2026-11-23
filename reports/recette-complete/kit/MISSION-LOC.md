# Mission LOC — Locataire, ordinateur et téléphone

Appareils : `ordinateur`, `telephone`, `iphone` (écrans clés). Rôle : Locataire.
Données : `donnees-LOC.json` — quatre dossiers où le locataire est invité mais n'a rien rempli (un par variante
ci-dessous), un dossier en vérification, un chez le notaire et un signé (locataires ayant déjà un compte), un
compte équipe et un notaire pour les rôles d'appui.

## A. Formulaire locataire (`/intakes/<jeton>`, lien dans `dossiers[i].locataire.formulaire`)

1. Barrière d'accès : sans session, puis connecté avec un **autre** compte → le formulaire exige le code envoyé à
   l'adresse du locataire (code faux refusé, renvoi, code juste). Jeton inexistant → page d'erreur propre.
2. Dossier 1, `ordinateur`, **particulier seul** : récapitulatif du bien et du bail (loyer, charges, dépôt, dates,
   jour de paiement exacts), profil, identité (chaque champ obligatoire, téléphone avec indicatif, nationalité
   avec recherche, date de naissance au clavier et au calendrier, date future ou mineur refusés si la règle
   existe), situation familiale (chaque statut et régime : pièces exigées), pièces, case de confirmation des
   conditions (envoi refusé sans elle, puis sans pièces), envoi, page de succès, lien rouvert → déjà soumis.
3. Dossier 2, `telephone`, **deux locataires** (« Une autre personne est locataire ») : ajout, suppression,
   pièces par personne ; tout le parcours au doigt (voir règlement § 3.3).
4. Dossier 3, `ordinateur`, **entreprise** locataire : recherche SIREN, représentant, Kbis, statuts.
5. Dossier 4, `iphone`, particulier **marié** : contrat de mariage selon le régime.
6. Enregistrement en cours de route (« Enregistrer »), rechargement, reprise à la bonne étape, retour arrière.

## B. Espace locataire (`/client/locataire`), comptes des dossiers 5 à 7, sur ordinateur **et** téléphone

- Connexion réelle par code sur `/client/login` (une fois par appareil), redirection vers l'espace locataire.
- Tableau de bord : synthèse, compteurs, « À faire maintenant », ligne de bail dépliable, parcours en trois étapes.
- Mes baux, page d'un bail dans chaque statut : conditions, bien, interlocuteurs, notaire, messagerie.
- **Reconfirmation** : avec le compte équipe, change le loyer du dossier 5 → le locataire voit « Confirmation à
  renouveler » dans « À faire », sur la ligne du bail et sur la page ; bouton inactif sans la case ; confirmation ;
  vérifie en base l'historique (`BailTenantAgreementHistory`) et le nouvel accord. Un changement du seul jour de
  paiement ne doit pas redemander l'accord.
- **Demandes de complément** : fais créer par l'équipe (dossier 5) puis par le notaire (dossier 6) une demande
  avec une pièce à refaire et deux informations (dont la situation familiale → pièce ajoutée d'elle-même) ;
  réponds côté locataire ; envoi bloqué tant que tout n'est pas prêt ; après envoi, plus de modification possible.
- Mes informations : lecture et modification.
- Messagerie avec le notaire (dossier 6) : message, fichier joint.
- Droits : le locataire ne peut ouvrir ni le bail d'un autre (`/client/locataire/baux/<autre id>`), ni la demande
  d'un autre, ni une pièce archivée, ni `/client/proprietaire`, ni `/interface`, ni `/notaire`.

## C. Contrôles transverses

E-mails reçus par le locataire (invitation, code, demande) : contenu, liens, aucune valeur vide. Erreurs
JavaScript, réponses 5xx, débordement sur téléphone, formats de dates et de montants.
