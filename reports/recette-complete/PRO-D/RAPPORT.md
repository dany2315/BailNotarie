# Recette PRO-D — Propriétaire sur ordinateur

_Mis à jour le 17/11/2026 08:33:17 — rapport final._

## 1. Synthèse

**Ce qui marche.** Le parcours complet d'un propriétaire sur ordinateur aboutit, deux fois de bout en bout : arrivée par la page d'accueil (champ « Ouvrez votre dossier » ou pastille « Bail d'habitation »), connexion par code reçu par e-mail, formulaire d'habitation en 12 ou 13 étapes (une ou deux personnes, situations familiales, adresse avec suggestions, copropriété ou lotissement, étape « Le loyer » guidée à Paris et libre à Guéret, plafond légal du dépôt, mobilier du meublé, locataire ou non, pièces exigées selon la situation), paiement réel dans le cadre Stripe en mode test (carte refusée puis acceptée, un seul ordre de paiement), page de succès, reçu, lien « déjà soumis ». L'espace client fonctionne : tableau de bord, dossiers dans chaque statut, ajout du locataire, nouveau bien et nouveau bail payé dans l'espace, messagerie avec le notaire, droits d'accès, déconnexion. Ce que l'écran annonce est retrouvé en base à chaque vérification, les montants et les dates sont au format français.

**Ce qui ne marche pas.** (1) Quand le serveur refuse quelque chose (adresse e-mail déjà prise, propriétaire saisi comme son propre locataire, jour de paiement 0), l'utilisateur voit un message technique en anglais au lieu de l'explication prévue — constaté à quatre endroits, formulaire et espace client. (2) Dans le formulaire, un e-mail de locataire mal formé (« pas-un-mail ») est accepté, enregistré, et une invitation part vers cette adresse. (3) Contrôles manquants ou incohérents : jour de paiement 31 et date d'effet passée acceptés, e-mail du syndic non contrôlé. (4) À la reprise du formulaire, l'étape « Type de contrat » est sautée (bail nu 3 ans retenu d'office). (5) Libellés : codes bruts dans « Statut familial », « Bail nue », « Plein propriété ».

**Verdict.** Aucun défaut bloquant : un propriétaire va au bout, paie et retrouve son dossier. Deux défauts majeurs, tous deux déjà présents sur staging (messages d'erreur illisibles ; e-mail de locataire non contrôlé), et un défaut mineur apporté par la branche (bornes du jour de paiement à l'étape « Locataire »). Non couverts : les demandes de l'équipe (parcours à deux rôles), le renouvellement (aucun bail terminé), les variantes société / commercial.

**Totaux : 101 cas — 81 OK, 11 KO, 5 partiels, 4 non testés.**

| Rôle | Appareil | Cas | OK | KO | Partiel | Non testé |
|---|---|---|---|---|---|---|
| Propriétaire | ordinateur | 90 | 70 | 11 | 5 | 4 |
| Propriétaire | portable | 2 | 2 | 0 | 0 | 0 |
| Visiteur | ordinateur | 8 | 8 | 0 | 0 | 0 |
| Visiteur | portable | 1 | 1 | 0 | 0 | 0 |

## 2. Défauts (du plus grave au plus bénin)

### D1. Les refus du serveur s'affichent sous la forme d'un message technique en anglais

- **Gravité** : majeur — **Origine** : staging (le mécanisme est identique sur staging ; il n'apparaît qu'avec un build de production, donc aussi en ligne) — **Appareil(s)** : ordinateur — **Cas** : PRO-D-023, PRO-D-027, PRO-D-049, PRO-D-082 (et le jour de paiement 0 du cas PRO-D-051)
- **Reproduire** : Au choix : (a) formulaire, étape « Informations client », seconde personne avec le même e-mail que la première (couple qui partage une adresse) ou avec l'e-mail d'un autre client, « Continuer » ; (b) formulaire, étape « Locataire », saisir l'e-mail du propriétaire, dates remplies, « Continuer » ; (c) espace client, « Ajouter le locataire », saisir sa propre adresse, « Ajouter le locataire ».
- **Attendu** : Un refus en français qui dit quoi corriger (le code prévoit par exemple « L'email … est déjà utilisé… Veuillez contacter le service client »).
- **Constaté** : Réponse 500 du serveur et notification : « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details… » (précédée de « Erreur » dans l'espace client). Rien n'est enregistré, l'utilisateur reste sur l'écran sans savoir pourquoi.
- **Capture** : captures/prod-026-personne2-meme-email.png, captures/prod-026b-personne2-email-autre-client.png, captures/prod-050-locataire-email-proprietaire.png, captures/prod-082-ajout-locataire-email-proprietaire.png
- **Code soupçonné** : Les actions serveur lèvent des exceptions (`throw new Error("…")`) : lib/actions/intake-handlers.ts (lignes ≈ 816, 1009, 1060, 1092, 1156 et le nouveau `throw new Error(DATES_REQUIRED_WITH_TENANT)` de la branche), lib/actions/intakes.ts, l'action d'ajout du locataire ; contrainte d'unicité de Person.email (prisma/schema.prisma). Côté écran : components/intakes/owner-intake-form.tsx (≈ 989-1007 et 2154-2172, qui teste `message.includes("déjà utilisé")`) et components/client-v2/add-tenant-dialog.tsx (ligne 68). En production, Next.js masque le message de toute exception levée par une action serveur : il faut renvoyer `{ error: "…" }` comme le prévoit le modèle du projet.
- **Confirmation** : reproduit six fois, sur quatre écrans et deux comptes

### D2. Formulaire : un e-mail de locataire mal formé est accepté et l'invitation part vers cette adresse

- **Gravité** : majeur — **Origine** : staging (l'enregistrement d'étape n'applique pas le contrôle d'adresse du schéma ; à confirmer par l'orchestrateur) — **Appareil(s)** : ordinateur — **Cas** : PRO-D-048
- **Reproduire** : Formulaire propriétaire, étape « Locataire » : e-mail « pas-un-mail », jour de paiement 5, date de prise d'effet valide, « Continuer ».
- **Attendu** : Refus « Email du locataire invalide » (message présent dans lib/zod/client.ts).
- **Constaté** : Étape franchie, « Données enregistrées avec succès ». En base, le locataire du bail porte l'adresse « pas-un-mail » et la tâche d'envoi du formulaire locataire est déclenchée vers cette adresse. Le propriétaire croit son locataire prévenu ; il ne le sera jamais. L'espace client, lui, refuse la même saisie (« Email invalide »).
- **Capture** : captures/prod-049-locataire-email-invalide.png
- **Code soupçonné** : lib/actions/intake-handlers.ts (traitement de l'étape « tenant », ≈ lignes 640-710, appel à triggerTenantFormEmail ligne 699) : aucune validation de forme avant création ; le contrôle `.email()` n'existe que dans le schéma complet (lib/zod/client.ts lignes 594 et 1279) ; pas de contrôle côté écran dans components/intakes/owner-intake-form.tsx (TenantStep, ≈ ligne 4770).
- **Confirmation** : reproduit deux fois, vérifié en base et dans les tâches de fond capturées

### D3. Étape « Locataire » : jour de paiement 31 accepté, jour 0 en erreur technique, date d'effet passée acceptée

- **Gravité** : mineur — **Origine** : branche (les dates saisies avec le locataire sont enregistrées par du code ajouté par la branche) — **Appareil(s)** : ordinateur — **Cas** : PRO-D-051
- **Reproduire** : Formulaire, étape « Locataire » avec un e-mail valide : jour 31 puis « Continuer » ; jour 0 ; date de prise d'effet 01/01/2020.
- **Attendu** : Jour limité à 1–28 comme l'annonce le champ (min 1, max 28) avec un message ; date vieille de six ans refusée ou signalée.
- **Constaté** : Jour 31 : accepté, paymentDay = 31 en base. Jour 0 : réponse 500 et message technique en anglais (défaut D1). Date 01/01/2020 : acceptée, bail enregistré du 01/01/2020 au 01/01/2021.
- **Capture** : captures/prod-051-locataire-limites.png
- **Code soupçonné** : lib/bail/dates.ts ligne 41 (`paymentDay < 1 || paymentDay > 31`), lib/actions/intake-handlers.ts (bloc « Locataire indiqué », `parsedDay` non borné), lib/zod/client.ts lignes 454-467 (1 à 31, déjà sur staging) ; champ `max={28}` dans components/intakes/owner-intake-form.tsx (≈ ligne 4630) sans contrôle à la validation.
- **Confirmation** : reproduit deux fois, vérifié en base

### D4. Reprise du formulaire : l'étape « Type de contrat » est sautée

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : PRO-D-039
- **Reproduire** : Valider l'étape 6 « Caractéristiques du bien », fermer le navigateur, rouvrir le formulaire.
- **Attendu** : Reprise sur l'étape 7 « Type de contrat », jamais vue.
- **Constaté** : Reprise sur l'étape 8 « Le loyer ». Le type « bail nu 3 ans », valeur par défaut, est considéré comme une réponse. Un propriétaire qui loue en meublé doit penser à revenir en arrière ; sinon plafond du dépôt, étape « Mobilier » et acte sont ceux d'un bail nu.
- **Capture** : captures/prod-038-reprise-saute-type-contrat.png
- **Code soupçonné** : components/intakes/owner-intake-form.tsx ligne 458 (valeur par défaut `BailType.BAIL_NU_3_ANS`) et findFirstIncompleteStep (≈ ligne 767) ; lib/rules/dossier-rules.ts ligne 527.
- **Confirmation** : constaté une fois à l'écran, confirmé par la lecture du code ; sur le second dossier l'étape a été vue car le parcours n'a pas été interrompu

### D5. E-mail et téléphone du syndic enregistrés sans contrôle

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : PRO-D-035
- **Reproduire** : Étape « Caractéristiques du bien », régime « Copropriété », nom du syndic rempli, e-mail « pas-un-mail », téléphone « abc », « Continuer ».
- **Attendu** : Refus de l'e-mail mal formé (le notaire doit pouvoir écrire au syndic).
- **Constaté** : Étape franchie ; en base syndicEmail = « pas-un-mail », syndicPhone = « abc ».
- **Capture** : captures/prod-037-syndic-invalide.png
- **Code soupçonné** : lib/zod/client.ts ligne 237 (`z.string().max(200).trim().optional()`, sans `.email()`) ; lib/rules/dossier-rules.ts ligne 515 (présence seulement). Le contrôle existe pour les demandes de complément (lib/rules/complement-questions.ts ligne 473) mais pas ici.
- **Confirmation** : une exécution, vérifiée en base

### D6. Erreur React #418 à l'ouverture d'une fiche de bail, d'une fiche de bien et de « Mes informations »

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : PRO-D-079
- **Reproduire** : Espace client, ouvrir la fiche d'un bail (les quatre statuts), la fiche d'un bien ou « Mes informations » ; regarder la console du navigateur.
- **Attendu** : Aucune erreur JavaScript.
- **Constaté** : « Minified React error #418 » à chaque ouverture : le texte calculé par le serveur n'est pas celui du navigateur, React redessine la page. Les trois pages ont en commun la ligne « Ajouté le 16/11/2026 20:18 » sous chaque pièce. Pas d'effet fonctionnel constaté, mais l'heure affichée dépend du fuseau de la machine qui calcule (en ligne, le serveur est en temps universel).
- **Capture** : captures/prod-072-bail-1-signed.png
- **Code soupçonné** : components/client/bail-document-preview.tsx ligne 156 (`formatDateTime(document.createdAt)`) et lib/utils/formatters.ts ligne 13 (`format(d, "dd/MM/yyyy HH:mm")`, fuseau local de l'exécution).
- **Confirmation** : reproduit sur six pages, deux passages

### D7. La liste « Statut familial » affiche les codes internes

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : PRO-D-018
- **Reproduire** : Formulaire propriétaire, étape « Informations client », ouvrir la liste « Statut familial ».
- **Attendu** : Célibataire, Marié(e), Divorcé(e), Veuf / Veuve, Pacsé(e).
- **Constaté** : CELIBATAIRE, MARIE, DIVORCE, VEUF, PACS. Les régimes matrimoniaux sont en clair, et l'espace client affiche « Célibataire ».
- **Capture** : captures/prod-018-statut-familial-liste.png
- **Code soupçonné** : components/intakes/owner-intake-form.tsx ligne 3435 : `{status.replace(/_/g, " ")}`.
- **Confirmation** : vu sur trois personnes et deux dossiers

### D8. Fautes dans des libellés : « Bail nue », « Plein propriété », « Co-propriété »

- **Gravité** : cosmétique — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : PRO-D-038
- **Reproduire** : Formulaire, étape « Type de contrat », ouvrir la liste ; espace client, « Ajouter un nouveau bien », liste « Statut juridique ».
- **Attendu** : « Bail nu 3 ans », « Bail nu 6 ans » ; « Pleine propriété », « Copropriété ».
- **Constaté** : Formulaire : « Bail nue 3 ans », « Bail nue 6 ans (SCI) » — ce dernier proposé à un particulier. Espace client : « Plein propriété », « Co-propriété » (le formulaire dit « Monopropriété », « Copropriété » ; l'assistant de l'espace client dit correctement « Bail nu 3 ans »). Trois vocabulaires pour les mêmes notions.
- **Capture** : captures/prod-039-types-de-bail.png
- **Code soupçonné** : components/intakes/owner-intake-form.tsx lignes 4566-4569 ; components/client/create-property-form.tsx lignes 542-543.
- **Confirmation** : vu à chaque passage

## 3. Parcours vérifiés

### Accueil et connexion

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-001 | ordinateur | Accueil : adresse e-mail invalide dans « Ouvrez votre dossier » | Bouton inactif dans les deux cas (true, true) | OK |
| PRO-D-002 | ordinateur | Accueil → /commencer : arrivée directe à l'étape du code | URL /commencer, adresse rappelée : true, repère 1/2 : true | OK |
| PRO-D-003 | ordinateur | E-mail du code de connexion | 1 e-mail, objet « [TEST] 646294 – votre code de connexion BailNotarie », code à 6 chiffres présent | OK |
| PRO-D-004 | ordinateur | Code de connexion incomplet refusé | Message affiché sous le champ, pas de connexion | OK |
| PRO-D-005 | ordinateur | Code de connexion faux refusé | Message : « Code invalide Too many requests. Please try again later. » ; on reste sur /commencer | OK |
| PRO-D-006 | ordinateur | Renvoi du code de connexion | Premier essai (ordinateur) : réponse 429 du service de connexion, message « Impossible de renvoyer le code. Veuillez réessayer. ». Nouveaux essais : après 20 s : « Nouveau code envoyé Vérifiez votre boîte de réception », 1 nouvel e-mail, temporisation affichée : true. La limite (3 demandes de code par minute et par adresse IP) est celle de la bibliothèque de connexion ; tous les agents partagent ici la même adresse. | OK |
| PRO-D-007 | ordinateur | Code juste accepté → connexion du nouveau propriétaire | Arrivée sur /client/proprietaire ; en base : rôle UTILISATEUR, profil PROPRIETAIRE | OK |
| PRO-D-008 | ordinateur | /commencer : adresse e-mail invalide refusée | On reste à l'étape 1 (true). Texte : Propriétaires / Votre bail notarié commence ici / ÉTAPE 1 / 3 / Votre adresse e-mail / Email invalide / Un code vous sera envoyé. Aucun mot de passe à créer. / Continuer / Connexion sécurisée | OK |
| PRO-D-101 | portable | Accueil → pastille « Bail d'habitation » → /commencer?bail=habitation | Accueil : débordement horizontal non ; /commencer : « Propriétaires / Votre bail notarié d'habitation commence ici / ÉTAPE 1 / 3 / Votre adresse e-mail / Un code vous sera envoyé. Aucun mot de passe à cré » ; écran du code : repère « ÉTAPE 2 / 3 », adresse rappelée : true ; compte déjà existant avant ce test : false | OK |

### Formulaire propriétaire

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-010 | ordinateur | Étape « Type de bail » : Habitation présélectionné | La carte « Habitation » est présélectionnée (coche bleue) ; « Continuer » enregistre (« Données enregistrées avec succès ») et passe à « Type de client · Étape 2/12 » | OK |
| PRO-D-102 | portable | Formulaire propriétaire en 1280 × 720 (compte neuf arrivé par « Bail d'habitation ») | Arrivée sur /commencer/proprietaire/<jeton> ; « Type de bail · Étape 1/12 » ; débordement horizontal : non ; bouton « Continuer » visible sans défilement ; code renvoyé accepté | OK |
| PRO-D-111 | ordinateur | Variantes non parcourues du formulaire : propriétaire société, bail commercial, bail nu 6 ans, bail étudiant 9 mois, marié sous communauté, divorcé, veuf | Non exécuté. Vérifié à l'écran : particulier marié sous séparation de biens (contrat de mariage exigé), pacsé (convention de PACS exigée), meublé 1 an, nu 3 ans. Les quatre types de bail sont proposés et font varier le nombre d'étapes (cas PRO-D-037) mais seuls deux ont été menés jusqu'au paiement. | Non testé |

### Formulaire — navigation

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-011 | ordinateur | Rechargement : reprise à la première étape incomplète | Reprise sur « Le bien · Étape 5/12 ». À noter : tant que l'identité n'est pas enregistrée, le rechargement revient à l'étape 1 (le choix Habitation/Particulier reste coché, deux clics pour revenir). | OK |
| PRO-D-021 | ordinateur | Retour arrière sans perte (flèche en haut à gauche) | « Récapitulatif · Étape 4/12 » puis « Informations client · Étape 3/12 » ; prénom « Camille », régime « Séparation de biens » toujours affichés | OK |
| PRO-D-039 | ordinateur | Reprise après « Caractéristiques du bien » : l'étape « Type de contrat » n'est pas présentée | Reprise sur « Le loyer · Étape 8/12 » : l'étape 7 est sautée car le type « bail nu 3 ans » est une valeur par défaut que le formulaire considère comme une réponse. Un propriétaire qui loue en meublé doit penser à revenir en arrière. | KO (mineur) |

### Formulaire — identité

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-014 | ordinateur | Identité : champs obligatoires vides refusés | Étape inchangée ; 9 messages : Le prénom est requis ; Le nom est requis ; Le numéro de téléphone est requis ; L'adresse est requise ; La profession est requise ; La nationalité est requise ; La situation familiale est requise ; Le lieu de naissance est requis ; La date de naissance est requise | OK |
| PRO-D-015 | ordinateur | Identité : téléphone trop court et date de naissance future refusés | Téléphone : Numéro de téléphone invalide ; date : La date de naissance est requise | OK |
| PRO-D-016 | ordinateur | Identité : propriétaire mineur (né en 2015) | Aucun message sur la date : une date de naissance d'enfant est acceptée | PARTIEL (cosmetique) |
| PRO-D-018 | ordinateur | Identité : libellés de la liste « Statut familial » | Options affichées : CELIBATAIRE, MARIE, DIVORCE, VEUF, PACS (codes internes, majuscules, sans accent). Vu pour la personne 1, la personne 2 et le second dossier. Dans « Mes informations » de l'espace client, la même valeur s'affiche correctement (« Célibataire »). | KO (mineur) |
| PRO-D-019 | ordinateur | Identité : marié → régime matrimonial exigé | Sans régime : Le régime matrimonial est requis lorsque le statut familial est marié ; régimes : Communauté réduite aux acquêts, Séparation de biens, Participation aux acquêts, Communauté universelle | OK |
| PRO-D-020 | ordinateur | Bouton « Enregistrer » à l'étape identité | Message(s) : Données enregistrées avec succès ; en base : Camille Recette-Prod, MARIE, régime SEPARATION_DE_BIENS, tél. +33612345678, née le 1980-03-15 | OK |
| PRO-D-022 | ordinateur | Deuxième propriétaire : ajout et champs obligatoires | Écran « Propriétaire 2 sur 2 » affiché ; 11 messages : Erreurs détectées. ; Le prénom est requis ; Le nom est requis ; Email invalide ; Le numéro de téléphone est requis ; L'adresse est requise ; La profession est requise ; La nationalité est requise ; La situation familiale est requise ; Le lieu de naissance est requis ; La date de naissance est requise | OK |
| PRO-D-023 | ordinateur | Deuxième propriétaire : même e-mail que le premier | On reste sur l'étape ; le serveur répond 500 (1 réponse(s) 5xx) ; message affiché : « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error. » | KO (majeur) |
| PRO-D-024 | ordinateur | Deuxième propriétaire : suppression | Confirmation demandée (« Confirmer la suppression — Êtes-vous sûr de vouloir supprimer Dominique Recette-Prod ? Cette personne sera supprimée de vos données. ») ; fenêtre refermée en 4,9 s avec le message « Personne supprimée » ; une seule personne à l'écran ; en base : 1 personne. Pendant l'opération, la question devient « …supprimer Cette personne ? » (majuscule). | OK |
| PRO-D-025 | ordinateur | Deux propriétaires : récapitulatif et enregistrement | « Récapitulatif · Étape 4/12 » ; récapitulatif cite Camille : true, Dominique : true ; en base : Camille (principale), Dominique | OK |
| PRO-D-027 | ordinateur | Deuxième propriétaire : e-mail déjà utilisé par un autre client | On reste sur « Informations client · Étape 3/12 » ; message affiché : « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error. » | KO (majeur) |

### Formulaire — bien

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-026 | ordinateur | Le bien : champs obligatoires vides refusés | Étape inchangée : true ; messages : L'adresse du bien est requise ; Le type de bien est requis ; La surface est requise | OK |
| PRO-D-028 | ordinateur | Le bien : adresse tapée sans choisir de suggestion | Étape inchangée : true ; messages : Choisissez l'adresse dans la liste proposée pour que le bien soit localisé. | OK |
| PRO-D-029 | ordinateur | Le bien : suggestions d'adresse | Suggestions affichées (« 12 Rue de Rivoli 75004 Paris — Paris 4e Arrondissement »…), adresse retenue : « 12 Rue de Rivoli 75004 Paris » | OK |
| PRO-D-030 | ordinateur | Le bien : surfaces invalides (0, négative, démesurée) | 0 et -5 : « La surface doit être un nombre positif ». 100 000 m² : accepté sans avertissement (en base : 100000 m² avant correction) | PARTIEL (cosmetique) |
| PRO-D-031 | ordinateur | Le bien : enregistrement et correction (adresse, type par cartes, surface) | « Caractéristiques du bien · Étape 6/12 » ; en base : 12 Rue de Rivoli 75004 Paris, 75004 Paris, INSEE 75104, 45.5 m², type APPARTEMENT, libellé « Recette PROD Rivoli », zone tendue : true | OK |
| PRO-D-032 | ordinateur | Caractéristiques : champs obligatoires vides refusés | Étape inchangée ; messages : Indiquez le nombre de pièces principales ; Indiquez l'époque de construction ; Indiquez la classe énergétique du logement ; Le statut légal est requis | OK |
| PRO-D-033 | ordinateur | Caractéristiques : le régime juridique fait varier les questions | Lotissement : Régime juridique * / Lotissement / Le statut légal est requis / Le lotissement a-t-il été créé il y a plus de 10 ans ? * / La date figure dans votre acte d'achat (arrêté de lotissement ou permis d'aménager). / Oui, il y  … Copropriété : Régime juridique * / Copropriété / Le statut légal est requis / Syndic de copropriété / Le notaire peut lui demander directement certains documents de l'immeuble. / Nom  | OK |
| PRO-D-034 | ordinateur | Caractéristiques : classe énergétique G ou F | Classe G : Classe énergétique (DPE) * / Classe G / Depuis le 1er janvier 2025, un logement classé G ne peut plus être loué : notre équipe vous contactera. /  / Classe F : Classe énergétique (DPE) * / Classe F / Logement classé F : loyer gelé, et location interdite à partir du 1er janvier 2028. /  | OK |
| PRO-D-035 | ordinateur | Copropriété : nom du syndic exigé, e-mail du syndic contrôlé | Sans nom : refus (« Indiquez le nom du syndic », « Indiquez l'e-mail ou le téléphone du syndic »). Avec le nom, l'e-mail « pas-un-mail » et le téléphone « abc » : étape franchie ; en base syndicEmail = « pas-un-mail », syndicPhone = « abc » (vérifié par requête). | KO (mineur) |

### Formulaire — bail et loyer

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-037 | ordinateur | Type de contrat : quatre types proposés, repère d'avancement adapté | Valeur présélectionnée à l'arrivée : « Bail nue 3 ans » ; options : Bail nue 3 ans, Bail nue 6 ans (SCI), Bail meublé 1 an, Bail étudiant (9 mois) ; repère selon le type : Bail nue 3 ans → 7/12 ; Bail nue 6 ans (SCI) → 7/12 ; Bail meublé 1 an → 7/13 ; Bail étudiant (9 mois) → 7/13 | OK |
| PRO-D-038 | ordinateur | Type de contrat : orthographe des libellés | Libellés affichés : Bail nue 3 ans, Bail nue 6 ans (SCI), Bail meublé 1 an, Bail étudiant (9 mois). Le « bail nu 6 ans (SCI) » est proposé alors que le propriétaire est un particulier. | KO (cosmetique) |
| PRO-D-040 | ordinateur | Le loyer : question sans réponse refusée | Étape inchangée ; message : Choisissez une réponse | OK |
| PRO-D-041 | ordinateur | Le loyer (Paris, zone tendue) : questions une à une et loyer trop élevé signalé | Questions posées : Le logement a-t-il déjà été loué ? → Combien payait le dernier locataire ? → Quel loyer souhaitez-vous demander ? → Quand le dernier locataire est-il parti ? → Son loyer a-t-il été augmenté dans les 12 derniers mois ? → Pourquoi augmenter le loyer par rapport à l'ancien ? → Combien ont coûté les travaux ? → (aucune question ouverte). Verdict : Ce loyer est un peu trop élevé / Pour ce logement, vous | OK |
| PRO-D-042 | ordinateur | Le loyer : « Modifier » une réponse et loyer sous le maximum | Après « Modifier » : la question se rouvre avec le rappel du maximum et les boutons « Mettre 1 218 € » et « Annuler » ; verdict « C’est tout bon pour le loyer — 1 210 € hors charges, pour un maximum de 1 218,85 € ». Parcours direct : C'est tout bon pour le loyer / 1 210 € hors charges, pour un maximum de 1 218,85 €. / Voir le calcul / . À noter : les réponses ne sont enregistrées qu’à la validation de l’étape ; ferme | OK |
| PRO-D-043 | ordinateur | Le loyer : réponses réaffichées quand on revient sur l'étape, « Voir le calcul » | Réponses et verdict réaffichés : true. Calcul affiché : Loyer du dernier locataire : 1 200 €. Avec la hausse annuelle autorisée (+ 1,57 %) : 1 218,85 €. Plafond fixé par la ville pour 45.5 m² : 1 751,75 €. Le montant le plus bas s'applique. Loyer du dernier locataire : 1 200 €. Avec la hausse annuelle autorisée (+ 1,57 %) : 1 218,85 €. Plafond fixé par la ville pour 45.5 m² : 1 751,7 | OK |
| PRO-D-044 | ordinateur | Charges et dépôt : champs vidés | Étape inchangée ; messages : Les charges mensuelles sont requises | OK |
| PRO-D-045 | ordinateur | Dépôt de garantie : plafond légal (meublé : 2 mois de loyer hors charges) | Étape inchangée : true ; à l'écran : Maximum : 2 420 € (2 mois de loyer) | OK |
| PRO-D-046 | ordinateur | Charges et dépôt : enregistrement au plafond exact | « Mobilier · Étape 10/13 » ; en base : loyer 1210 €, charges 80 €, dépôt 2420 €, type BAIL_MEUBLE_1_ANS, statut DRAFT | OK |
| PRO-D-047 | ordinateur | Mobilier (bail meublé) : tous les équipements obligatoires exigés | 13 équipements (Literie avec couette ou couverture, Volets ou rideaux dans les chambres, Plaques de cuisson, Four ou four à micro-ondes, Réfrigérateur, Congélateur ou compartiment à congélation (-6° max), Vaisselle en nombre suffisant, Ustensiles de cuisine, Table, Sièges, Étagères de rangement, Luminaires, Matériel d'entretien ménager adapté). Rien coché : 0 messages, étape inchangée (true). Un manquant : bloqué ; b | OK |
| PRO-D-053 | ordinateur | Le loyer : revenir sur l'étape validée puis « Continuer » à nouveau | Passage à « Charges & dépôt · Étape 9/13 » ; messages : Données enregistrées avec succès | OK |

### Formulaire — locataire

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-048 | ordinateur | Locataire : e-mail invalide | Étape franchie sans aucun message ; en base, le locataire du bail est enregistré avec l'adresse « pas-un-mail », et une invitation « formulaire locataire » est déclenchée vers cette adresse (tâche de fond capturée). Reproduit deux fois. Dans l'espace client, la fenêtre « Ajouter un locataire » refuse bien cette adresse (« Email invalide »). | KO (majeur) |
| PRO-D-049 | ordinateur | Locataire : e-mail du propriétaire refusé | Étape inchangée ; 1 réponse(s) 500 ; message : « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error. » | KO (majeur) |
| PRO-D-050 | ordinateur | Locataire indiqué : date de prise d'effet et jour de paiement exigés | Étape inchangée : true ; messages : Le jour de paiement est requis / La date de prise d'effet est requise | OK |
| PRO-D-051 | ordinateur | Locataire : jour de paiement et date de prise d'effet hors limites | Jour 31 : ACCEPTÉ, en base paymentDay = 31 ; jour 0 : refusé (An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.) ; date 01/01/2020 : ACCEPTÉE, en base 2020-01-01 | KO (mineur) |
| PRO-D-052 | ordinateur | Locataire : date de fin annoncée et enregistrement | Annonce : « Le bail se terminera le 1 janvier 2028. » ; en base : prise d'effet 2027-01-01, fin 2028-01-01, jour 5, parties : recette-prod-nouveau1@example.invalid:PROPRIETAIRE, recette-prod-nouveau1-loc@example.invalid:LOCATAIRE | OK |

### Formulaire — documents

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-054 | ordinateur | Documents : envoi refusé sans les pièces obligatoires | Étape inchangée : true ; messages : Veuillez joindre tous les documents requis Pièce d'identité de Camille Recette-Prod, Pièce d'identité de Dominique Recette-Prod, Contrat de mariage, Diagnostics du bien, Titre de propriété, Règlement de copropriété | OK |
| PRO-D-055 | ordinateur | Documents : plusieurs fichiers pour une même pièce | À l'écran : Documents client * / Documents de Camille Recette-Prod (Principale) * / Pièce d'identité * / Ajouter un fichier / Pièce d'identité / recette-identite-camille-verso.png - 70 B / 17/11/2026 / Pièce d'identité / recette-identite-camille-recto.pdf - 120 B / 17/11/2026 / Pièce d'identité / recette-identi ; en base : 3 pièce(s) d'identité (recette-identite-camille-recto.pdf, recette-identite-camille-recto.pdf,  | OK |
| PRO-D-056 | ordinateur | Documents : suppression d'un fichier déposé | Essai unique et non concluant : un clic sur l’icône corbeille du premier fichier de la pile n’a produit ni message ni suppression en base (3 pièces avant, 3 après, 20 s d’attente). Le code prévoit une suppression immédiate avec le message « Document supprimé avec succès ». Le dossier ayant été envoyé ensuite, l’essai n’a pas pu être rejoué : à vérifier à la main (artefact de pilotage possible, comme pour la case des  | PARTIEL (mineur) |
| PRO-D-057 | ordinateur | Documents : toutes les pièces obligatoires déposées (deux propriétaires mariés sous contrat, copropriété, Paris) | « Paiement · Étape 13/13 » ; en base : ID_IDENTITY→personne, ID_IDENTITY→personne, ID_IDENTITY→personne, ID_IDENTITY→personne, CONTRAT_DE_MARIAGE→client, DIAGNOSTICS→bien, TITLE_DEED→bien, REGLEMENT_COPROPRIETE→bien ; messages : Données enregistrées avec succès | OK |
| PRO-D-107 | ordinateur | Pièces exigées selon la situation : pacsé, lotissement récent, hors zone tendue | Pièces demandées : Pièce d'identité *, Convention de PACS *, Diagnostics *, Titre de propriété *, Règlement du lotissement * | OK |

### Formulaire — paiement

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-058 | ordinateur | Paiement : frais de dossier et estimation des honoraires du notaire | Frais de dossier : 39,90 € TTC ; honoraires du notaire estimés : 762 €, avec la formule affichée « Paiement unique · 50% du loyer HT + 10 €/personne · TVA 20% · estimation indicative » (soit (605 + 3 × 10) × 1,2 pour un loyer de 1 210 € et trois personnes). | OK |
| PRO-D-059 | ordinateur | Paiement : conditions générales à accepter | Bouton inactif : true ; rappel : true ; liens : 2 vers /cgv, 1 vers /cgu | OK |
| PRO-D-060 | ordinateur | Paiement : carte refusée (4000 0000 0000 0002) | Message : « Votre carte a été refusée. » ; formulaire en base : PENDING ; ordre de paiement : requires_payment_method | OK |
| PRO-D-061 | ordinateur | Paiement : carte acceptée (4242…) et envoi du dossier | Arrivée sur /commencer/success?token=<jeton> ; texte : « Merci Camille Recette-Prod. Votre dossier est entre nos mains — vous n'avez plus rien à faire pour l'instant. / LA SUITE / 1 / Vos informations ont bien été enregistrées. / 2 / Le locataire reçoit un lien pour compléter son formulaire. / 3 / Notre équipe vérif » ; en base : formulaire SUBMITTED, bail AWAITING_TENANT_FORM, ordre de paiement succeeded (39.9 € reç | OK |
| PRO-D-062 | ordinateur | Paiement : un seul ordre de paiement | Même ordre de paiement avant/après : true ; 1 ligne(s) de paiement en base (SUCCEEDED 3990) | OK |
| PRO-D-063 | ordinateur | Lien du formulaire rouvert après envoi | Formulaire déjà soumis / Ce formulaire a déjà été soumis et est en cours de traitement. / Vous recevrez une notification une fois le traitement terminé. / Votre demande est en cours d'examen par notre équipe. / Retour à  | OK |
| PRO-D-064 | ordinateur | Page de succès et reçu de paiement | Page « C'est envoyé — Merci Camille Recette-Prod », les quatre étapes de la suite, reçu « Frais de dossier BailNotarie 39,90 € TTC » avec référence. « Télécharger » ouvre le reçu officiel de Stripe dans un nouvel onglet (page pay.stripe.com/receipts, mode test). | OK |
| PRO-D-065 | ordinateur | Après l'envoi : confirmation au propriétaire et invitation du locataire | À l'envoi : tâches de fond capturées « e-mail de confirmation au propriétaire », « notification à l'équipe », « recalcul de la complétude » ; le lien de formulaire du locataire existe en base (en attente). L'invitation du locataire, elle, part dès la validation de l'étape « Locataire » du formulaire, donc avant le paiement (voir observations), et rien n'est renvoyé au moment de l'envoi. | OK |
| PRO-D-097 | ordinateur | Paiement : la case des conditions générales se coche au premier clic | Premier clic : case cochée ; Lors des deux paiements précédents, le robot cliquait sans attendre la fin du défilement et avait dû cliquer deux fois : artefact de pilotage probable si la case se coche ici du premier coup. | OK |

### Espace client — tableau de bord

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-066 | ordinateur | Espace client du nouveau propriétaire après l'envoi | ESPACE PROPRIÉTAIRE / Votre espace / 1 chose vous attend / Nouveau dossier / 1 / En cours / 1 / À faire / 0 / Signés / À faire maintenant / 1 / À FAIRE · JUSTIFICATIF DU LOYER / Recette PROD Rivoli / À envoyer : dernier loyer du locataire précédent. / Envoyer / Vos dossiers / Voir tout / Recette PROD Rivoli / 1 210 €/mois · Bail meublé 1 an · recette-prod-nouveau1-loc@example.invalid / En attente du locataire / LE PA | OK |
| PRO-D-070 | ordinateur | Tableau de bord : phrase de synthèse, compteurs, « À faire maintenant », cartes des dossiers | « Bonjour Camille / 1 chose vous attend / Nouveau dossier / 3  » ; compteurs En cours/À faire/Signés : 3/1/1 ; base : PENDING_VALIDATION=1, SIGNED=1, AWAITING_TENANT=1, AWAITING_TENANT_FORM=1 ; tâche : true ; statuts des cartes : En attente du locataire, En vérification, Locataire à ajouter, Signé | OK |

### Espace client — dossiers

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-071 | ordinateur | Mes dossiers : liste par bien, bail de chaque bien, dépliage | En-tête : « 4 biens · 4 baux » ; 4/4 adresses listées ; dates au format « 01/02/2027 → 01/02/2030 » : true ; filtres ou recherche trouvés : 0 ; après « Déplier » : 207 caractères de détail en plus. /client/proprietaire/baux et /biens renvoient vers cette page. | PARTIEL (cosmetique) |
| PRO-D-072 | ordinateur | Détail d'un bail — statut SIGNED | Statut : conforme (« Signé / Votre bail a été signé ») ; montants = base (600,00 €, 50,00 €, 600,00 €) : true ; date de début 01/02/2027 : true ; notaire : affiché ; locataire : LE LOCATAIRE / NOM / Louis LocatairePROD1  ; pièces : PIÈCES DU DOSSIER · 2 ; erreur de rendu React (#418) à l'ouverture : 1 | OK |
| PRO-D-073 | ordinateur | Détail d'un bail — statut AWAITING_TENANT | Statut : conforme (« Locataire à ajouter ») ; montants = base (600,00 €, 50,00 €, 600,00 €) : true ; date de début vide : true ; notaire : non affiché ; locataire : LE LOCATAIRE / NOM / Non renseigné  ; pièces : PIÈCES DU DOSSIER · 2 ; erreur de rendu React (#418) à l'ouverture : 1 | OK |
| PRO-D-074 | ordinateur | Détail d'un bail — statut PENDING_VALIDATION | Statut : conforme (« En vérification / Votre dossier est entre nos mains ») ; montants = base (600,00 €, 50,00 €, 600,00 €) : true ; date de début 01/02/2027 : true ; notaire : non affiché ; locataire : LE LOCATAIRE / NOM / Inès LocatairePROD3  ; pièces : PIÈCES DU DOSSIER · 2 ; erreur de rendu React (#418) à l'ouverture : 1 | OK |
| PRO-D-075 | ordinateur | Détail d'un bail — statut AWAITING_TENANT_FORM | Statut : conforme (« En attente du locataire / Le lien lui a bien été envoyé ») ; montants = base (600,00 €, 50,00 €, 600,00 €) : true ; date de début 01/02/2027 : true ; notaire : non affiché ; locataire : non affiché ; pièces : PIÈCES DU DOSSIER · 2 ; erreur de rendu React (#418) à l'ouverture : 1 | OK |
| PRO-D-084 | ordinateur | Renouveler un bail sur le dossier signé | Le renouvellement n'est ouvert qu'aux baux au statut « terminé » : sur le dossier signé, /renouveler renvoie silencieusement à la fiche du bail et aucun bouton « Renouveler » n'y figure (la fiche du bien annonce « un nouveau bail sera possible à partir du 1 janvier 2030 »). Aucun bail terminé dans le jeu de données : le formulaire de renouvellement n'a pas pu être exercé. | Non testé |

### Espace client — biens

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-076 | ordinateur | Fiche d'un bien et ses pièces | LE BIEN / Logement recette PRO-D 1 / En vérification / 1 Place Bonnyaud 23000 Guéret / Bail en cours jusqu'au 1 février 2030 : un nouveau bail sera possible à partir du 1 janvier 2030. / SURFACE / 42 m² / TYPE / Appartement / BAUX / 1 / PIÈCES / 2 / INFORMATIONS / ADRESSE / 1 Place Bonnyaud 23000 Guéret / STATUT DU BIEN / Pleine propriété / CRÉÉ LE / 16/11/2026 / MODIFIÉ LE / 16/11/2026 / BAUX · 1 / Signé / À partir  | OK |
| PRO-D-092 | ordinateur | Ajouter un bien depuis l'espace client (avec ses pièces) | Listes proposées — type : Appartement, Maison ; statut : Plein propriété, Co-propriété, Lotissement. Messages : aucun ; en base : 8 Avenue de la République 23000 Guéret, 60 m², MAISON, PLEIN_PROPRIETE, zone tendue false, 2 pièce(s) | OK |

### Espace client — informations

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-078 | ordinateur | Mes informations : lecture, pièces, modification | Lecture : identité, situation « Célibataire » (en clair, contrairement au formulaire), coordonnées, « DOCUMENTS · 1 » avec la pièce d'identité. Modification : aucun bouton — la page indique « Une correction à apporter ? Écrivez-nous, on s'en occupe. » (lien e-mail) | PARTIEL (mineur) |

### Contrôles transverses

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-079 | ordinateur | Erreurs JavaScript dans l'espace client | Aucune réponse 5xx. Erreur « Minified React error #418 » (le texte produit par le serveur diffère de celui du navigateur ; React redessine la page) à chaque ouverture de : la fiche d'un bail, la fiche d'un bien, « Mes informations » — les trois pages qui affichent « Ajouté le JJ/MM/AAAA HH:mm » sous une pièce. L'heure est calculée dans le fuseau du serveur puis dans celui du navigateur. | KO (mineur) |

### Espace client — locataire

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-080 | ordinateur | Ajouter le locataire : e-mail vide ou invalide refusé | Sans e-mail : bouton inactif (true) ; « pas-un-mail » : Email invalide, fenêtre restée ouverte : true | OK |
| PRO-D-081 | ordinateur | Ajouter le locataire : date de prise d'effet et jour de paiement exigés | Indiquez la date de prise d'effet du bail ; fenêtre restée ouverte : true ; rien en base (recette-prod-proprio1@example.invalid:PROPRIETAIRE) | OK |
| PRO-D-082 | ordinateur | Ajouter le locataire : e-mail du propriétaire refusé | Fenêtre restée ouverte : true ; 1 réponse(s) 500 ; message : « Erreur An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error. » ; parties en base : recette-prod-proprio1@example.invalid:PROPRIETAIRE | KO (majeur) |
| PRO-D-083 | ordinateur | Ajouter le locataire à un dossier en attente | Message : Locataire ajouté — un email lui a été envoyé ; statut à l'écran : En attente du locataire / Le lien lui a bien été envoyé par email.  ; en base : AWAITING_TENANT_FORM, prise d'effet 2027-03-01, jour 5, parties recette-prod-proprio1@example.invalid:PROPRIETAIRE, recette-prod-loc2@example.invalid:LOCATAIRE ; lien locataire : PENDING ; invitation (tâche de fond capturée) : 1 | OK |

### Espace client — messagerie

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-085 | ordinateur | Messagerie avec le notaire : envoi d'un message | Message visible dans le fil : true ; en base : 1 message(s) | OK |
| PRO-D-086 | ordinateur | Messagerie avec le notaire : envoi d'un fichier | Fichier listé après sélection : true ; visible dans le fil après envoi : true ; messages en base : 1 → 2 | OK |

### Espace client — navigation

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-087 | ordinateur | Bulle « Support » | Après clic : / Contacter le support / Une question ? Notre équipe est à votre écoute du lundi au vendredi. / Appeler / 07 68 09 86 24 / Envoyer un email / contact@bailnotarie.fr / Astuce : glisse la bulle de haut en bas et elle se rabat sur le bord le plus proche. Le × la réduit à un petit point discret. / Close | OK |
| PRO-D-088 | ordinateur | Droits d'accès : pages d'un autre rôle ou d'un autre propriétaire | /client/locataire → /client/proprietaire ; /interface → /client/proprietaire ; /notaire → /client/proprietaire ; /client/proprietaire/baux/<dossier d'un autre propriétaire> → /client/proprietaire/baux/cmwjncmg6000nx19433 (page introuvable) | OK |
| PRO-D-089 | ordinateur | Menu de l'avatar et déconnexion | Menu : « CP Camille ProprioPROD1 recette-prod-proprio1@example.invalid Propriétaire Se déconnecter » ; après déconnexion : / ; /client/proprietaire rouvert → /client/login | OK |
| PRO-D-112 | ordinateur | Filtres de « Mes dossiers » | Aucun filtre ni champ de recherche n'est présent sur cette page pour un propriétaire qui a cinq biens : rien à tester. La liste est groupée par bien, chaque bien se déplie. | Non testé |

### Espace client — nouveau dossier

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-090 | ordinateur | Nouveau dossier : un seul bail à la fois par bien (blocage expliqué) | Mentions affichées : Un dossier est déjà en cours sur ce bien ; Bail en cours jusqu'au 1 février 2030 : un nouveau bail sera possible à partir du 1 janvier 2030.  (4 sur 4 biens) ; carte du bien 4 inactive : true ; « Continuer » inactif après clic : false ; messages : aucun ; écran après tentative : toujours « Quel bien ? » | OK |
| PRO-D-091 | ordinateur | Nouveau bien : champs obligatoires vides refusés | Messages : L'adresse est requise ; Le type de bien est requis ; Le statut juridique est requis ; bien créé en base : 0 | OK |
| PRO-D-093 | ordinateur | Nouveau bail dans l'espace : type de bail et loyer hors zone tendue | Types proposés : Bail nu 3 ans, Bail nu 6 ans, Bail meublé 1 an, Bail meublé 9 mois ; écran du loyer : Type de bail * / Bail nu 3 ans / Location meublée indisponible — le bien ne possède pas tous les équipements obligatoires. / Quel loyer souhaitez-vous demander ? / € / Continuer / Support ; ensuite « Charges & dépôt · Étape 3/4 » | OK |
| PRO-D-094 | ordinateur | Nouveau bail dans l'espace : plafond légal du dépôt de garantie (bail nu : 1 mois) | Étape inchangée : true ; messages : Maximum : 700 € (1 mois de loyer hors charges) / Le dépôt ne peut pas dépasser 1 mois de loyer. | OK |
| PRO-D-095 | ordinateur | Paiement dans l’espace client : un seul ordre de paiement, même en rouvrant l’écran | Un ordre de paiement est créé à la première arrivée sur l'écran de paiement ; rouvert trois fois (rechargement, puis deux nouveaux passages), l'écran réutilise le même ordre, qui est celui finalement payé : 1 seul ordre pour ce dossier en base, aucun ordre orphelin. À noter : recharger la page à l'étape « Paiement » fait repartir l'assistant de l'étape 1 et perd les réponses (le bail n'est créé qu'au paiement, sauf c | OK |
| PRO-D-096 | ordinateur | Paiement dans l'espace client (carte de test acceptée) : dossier sans locataire créé | Arrivée sur /client/proprietaire/demandes?selected=<id> ; en base : statut AWAITING_TENANT, payé true, loyer 700 €, charges 40 €, dépôt 700 €, 1 paiement(s) ; case des conditions cochée dès le premier clic : false | OK |

### Espace client — portable

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-100 | portable | Espace client en 1280 × 720 : mise en page des pages clés | Tableau de bord, « Mes dossiers », bail signé, « Mes informations », « Nouveau dossier » : aucun défilement horizontal, bouton principal visible sans défilement, aucun texte visible coupé (les seuls libellés signalés par la mesure sont ceux, invisibles, des boutons en icône destinés aux lecteurs d'écran — vérifié sur capture). | OK |

### Second dossier sans locataire

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-103 | ordinateur | Lotissement : question sur l'ancienneté obligatoire, bien hors zone tendue | Sans réponse : Répondez à la question sur le lotissement ; avec réponse : « Type de contrat · Étape 7/12 » ; en base : régime LOTISSEMENT, lotissement de plus de 10 ans = NO, zone tendue = false | OK |
| PRO-D-104 | ordinateur | Le loyer hors zone tendue (Guéret) | Une seule question : « Quel loyer souhaitez-vous demander ? » ; 650 € accepté sans plafond ni justificatif ; passage à « Charges & dépôt ». (À Paris, le même écran pose jusqu'à sept questions.) | OK |
| PRO-D-105 | ordinateur | Dépôt de garantie : plafond d'un bail nu (1 mois) ; pas d'étape « Mobilier » | 1 000 € : Maximum : 650 € (1 mois de loyer) ; 650 € : « Locataire · Étape 10/12 » | OK |
| PRO-D-106 | ordinateur | Étape « Locataire » : continuer sans locataire | « Documents · Étape 11/12 » ; messages : Données enregistrées avec succès | OK |
| PRO-D-108 | ordinateur | Second dossier sans locataire : paiement et envoi | Honoraires estimés : 414 € (soit (325 + 2 × 10) × 1,2 : le locataire à venir est compté) ; arrivée sur /commencer/success?token=<jeton> ; en base : formulaire SUBMITTED, bail AWAITING_TENANT (BAIL_NU_3_ANS, loyer 650 €, dépôt 650 €), paiement succeeded | OK |
| PRO-D-109 | ordinateur | Second dossier : ajout du locataire depuis l'espace client | Message : Locataire ajouté — un email lui a été envoyé ; à l'écran : En attente du locataire  ; en base : bail AWAITING_TENANT_FORM, lien locataire PENDING | OK |

### Espace client — demandes de l'équipe

| Cas | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|
| PRO-D-110 | ordinateur | Demande de l'équipe (une pièce + une information) : création côté équipe, réponse du propriétaire, acceptation | Non exécuté : parcours à trois temps sur deux rôles, dont l'écran de composition côté équipe n'a pas pu être exploré dans le temps imparti (interruptions répétées de la campagne). Le compte équipe et le notaire fournis n'ont pas été utilisés. | Non testé |

## 4. Observations (pas des défauts)

- **À vérifier à la main** — suppression d'un fichier déposé à l'étape « Documents » (cas PRO-D-056) : l'unique essai automatisé n'a rien supprimé et n'a affiché aucun message ; non rejouable après l'envoi du dossier. Les icônes œil / téléchargement / corbeille des pièces n'ont pas de libellé accessible.
- L'invitation du locataire part dès la validation de l'étape « Locataire » du formulaire, avant le paiement du propriétaire, et repart à chaque changement d'adresse ; la page de succès annonce pourtant « Le locataire reçoit un lien » comme une suite de l'envoi. À arbitrer.
- Le formulaire s'affiche d'abord sur « Étape 1/12 » puis saute à l'étape de reprise une à deux secondes plus tard. Tant que l'identité n'est pas enregistrée, rouvrir le formulaire ramène à l'étape 1.
- Les messages d'erreur restent affichés après correction (nationalité, régime juridique, adresse choisie dans la liste) jusqu'au « Continuer » suivant.
- Étape « Le loyer » : les réponses ne sont enregistrées qu'à la validation de l'étape ; fermer le navigateur au milieu des questions les efface. « Voir le calcul » ne s'affiche qu'au survol (rien au clic), et écrit « 45.5 m² » au lieu de « 45,5 m² ».
- Assistant « Nouveau bail » de l'espace client : recharger la page à l'étape « Paiement » fait repartir de l'étape 1 et perd les réponses (sauf clic sur « Sauvegarder »). L'ordre de paiement, lui, est bien réutilisé.
- Nouveau bien dans l'espace client : les pièces sont marquées obligatoires (« Diagnostics * * », astérisque doublé) alors qu'une phrase dit « Les documents pourront être ajoutés après la création du bien ».
- « Mes informations » est en lecture seule (« Une correction à apporter ? Écrivez-nous ») ; « Mes dossiers » n'a ni filtre ni recherche ; /client/proprietaire/baux et /biens renvoient vers « Mes dossiers ».
- Dates : « Le bail se terminera le 1 janvier 2028 », « Bail en cours jusqu'au 1 février 2030 » (on attend « 1er »). Un bail d'un an débutant le 01/01/2027 est annoncé et enregistré avec une fin au 01/01/2028.
- Textes : « 2 fichiers uploadés avec succès », état « Uploadé » ; e-mail du code adressé à « Bonjour Client, » pour un compte sans nom ; sélecteur de pays du téléphone en anglais (« Germany ») ; « Êtes-vous sûr de vouloir supprimer Cette personne ? » pendant la suppression.
- Contrôles absents sans conséquence grave : date de naissance d'un enfant (2015) acceptée pour un propriétaire ; surface de 100 000 m² acceptée.
- La bulle « Support » recouvre l'icône du calendrier du champ « Date de naissance » en 1440 × 900 (masquable par la croix).
- Renvoi du code de connexion : refusé (429) lors du premier essai parce que tous les agents partagent la même adresse IP (limite de 3 demandes par minute) ; réussi au second essai. Le message « Impossible de renvoyer le code. Veuillez réessayer. » ne dit pas d'attendre.
- Pilotage : dans le formulaire et l'assistant, un clic donné avant la fin du défilement vers la case des conditions générales ne la coche pas ; avec deux secondes d'attente elle se coche du premier coup (cas PRO-D-097). Une coupure de la base de test a aussi provoqué une erreur 500 passagère, non reproduite (cas PRO-D-053).
- Lenteurs : 2 à 5 s par étape du formulaire (« Enregistrement en cours… »), jusqu'à 10 s d'attente « Un instant… » avant une question de l'étape « Le loyer ».

## 5. Non testé

- **Demandes de l'équipe** (création par le compte équipe, réponse du propriétaire avec refus de la réponse partielle, acceptation) : non exécuté faute de temps après les interruptions de la campagne ; le compte équipe et le notaire fournis n'ont pas été utilisés (cas PRO-D-110).
- **Renouvellement d'un bail** : la page n'accepte que les baux terminés ; aucun dans le jeu de données (cas PRO-D-084).
- **Variantes du formulaire** : propriétaire société, bail commercial, bail nu 6 ans, bail étudiant 9 mois, marié sous communauté, divorcé, veuf (cas PRO-D-111).
- **Filtres de « Mes dossiers »** : il n'y en a pas (cas PRO-D-112). **Modification de « Mes informations »** : non proposée par l'écran (cas PRO-D-078).
- Appareil « portable » : limité aux pages clés de l'espace client, à l'accueil, à la connexion et à l'ouverture du formulaire ; les étapes du formulaire n'ont pas été rejouées une à une en 1280 × 720.
- E-mails déclenchés en tâche de fond (confirmation, invitation du locataire) : seuls les déclenchements ont été vérifiés, pas leur contenu, le montage ne les exécutant pas.

## 6. Données créées (pour le nettoyage)

- Comptes créés : `recette-prod-nouveau1@example.invalid` (deux personnes, la seconde `recette-prod-nouveau1b@example.invalid`) et `recette-prod-nouveau2@example.invalid`.
- Locataires créés : `recette-prod-nouveau1-loc@example.invalid`, `recette-prod-nouveau2-loc@example.invalid`, `recette-prod-loc2@example.invalid` (ajouté au dossier fourni n° 2, passé de « locataire à ajouter » à « en attente du locataire », prise d'effet 01/03/2027, jour 5).
- Biens et baux créés : « Recette PROD Rivoli » (12 Rue de Rivoli 75004 Paris, meublé 1 an, 1 210 €, envoyé et payé) ; « Recette PROD lotissement » (15 Avenue de la République 23000 Guéret, nu 3 ans, 650 €, envoyé et payé) ; « Recette PROD espace » (8 Avenue de la République 23000 Guéret, nu 3 ans, 700 €, créé et payé depuis l'espace client du propriétaire fourni).
- Trois paiements Stripe en mode test de 39,90 € (cartes de test), plus une tentative refusée.
- Fichiers déposés : uniquement des fichiers `recette-…` (pièces d'identité, contrat de mariage, convention de PACS, diagnostics, titres, règlements) ; un doublon `recette-identite-camille-recto.pdf` sur le premier dossier.
- Messagerie du dossier fourni n° 1 : un message « Message de recette PRO-D … » et un fichier `recette-message-notaire.pdf`.
- Fichiers de travail : `scripts/_etat-nouveau1.json` et `scripts/_etat-nouveau2.json` contiennent les jetons des deux formulaires (désormais soumis).
