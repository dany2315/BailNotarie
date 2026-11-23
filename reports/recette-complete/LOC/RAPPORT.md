# Recette LOC — Locataire, ordinateur et téléphone

Rapport mis à jour le 17/11/2026 08:07:15 — mission terminée (parties A, B et C).

## 1. Synthèse

**Ce qui marche.** Le formulaire locataire d'un particulier fonctionne de bout en bout sur les trois appareils (seul sur ordinateur, à deux sur téléphone Android, marié sur iPhone) : barrière par code, récapitulatif exact, pièces exigées selon la situation familiale, refus d'envoi sans confirmation ou sans pièce, envoi, lien refermé. L'espace locataire est juste dans chaque statut de bail et sans débordement sur téléphone. La reconfirmation des conditions (nouveauté de la branche) est correcte : le jour de paiement seul ne redemande rien ; loyer, charges ou dépôt redemandent l'accord, l'historique est écrit, une confirmation sur des conditions périmées est refusée. Les demandes de complément de l'équipe et du notaire vont jusqu'au bout (pièce à refaire, informations, pièce ajoutée d'elle-même, envoi bloqué puis verrouillé, acceptation). Les droits d'accès tiennent.
**Ce qui ne marche pas.** Un locataire « entreprise » ne peut pas terminer son formulaire : le champ Email se grise à la première lettre et, même en collant l'adresse, « Continuer » reste sans effet à l'étape 3 (deux défauts bloquants, déjà présents sur `staging`). Les refus du serveur s'affichent en anglais technique. La reconfirmation ne prévient le locataire par aucun e-mail (seul défaut imputable à la branche, à arbitrer). S'y ajoutent des contrôles de saisie trop lâches et des libellés techniques.
**Origine.** Tous les défauts sauf un viennent de code identique à `staging` ; la branche n'en introduit aucun dans le formulaire.
**Verdict.** Rien, côté locataire, ne s'oppose à la fusion du point de vue de la branche elle-même ; en revanche le parcours « locataire entreprise » est inutilisable en l'état et mérite une correction avant ou juste après la mise en production.

### Totaux par rôle et par appareil

| Rôle | Appareil | Cas | OK | KO | Partiels | Non testés |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Locataire | iphone | 22 | 18 | 3 | 1 | 0 |
| Locataire | ordinateur | 78 | 63 | 8 | 5 | 2 |
| Locataire | telephone | 36 | 33 | 1 | 2 | 0 |
| Notaire | ordinateur | 2 | 2 | 0 | 0 | 0 |
| Visiteur | ordinateur | 2 | 2 | 0 | 0 | 0 |
| Équipe | ordinateur | 3 | 3 | 0 | 0 | 0 |
| **Total** |  | **143** | **121** | **12** | **8** | **2** |

## 2. Défauts

### D1. Locataire « entreprise » : « Continuer » ne fait rien à l'étape 3, le formulaire ne peut pas être terminé

- **Gravité** : bloquant — **Origine** : staging — **Appareil(s)** : ordinateur (même écran sur téléphone) — **Cas** : LOC-056, LOC-057
- **Reproduire** : Formulaire locataire d'un dossier d'habitation, étape 2 « Entreprise ». Étape 3 : saisir un SIREN, confirmer la société (ou « Compléter les informations moi-même » et remplir raison sociale et siège), téléphone valide, adresse e-mail collée d'un seul coup, « Continuer ».
- **Attendu** : Enregistrement de la société et passage à l'étape 4 (Kbis, statuts).
- **Constaté** : Rien ne se passe : pas de message, pas d'erreur réseau, rien en base. Le locataire reste à l'étape 3 sans savoir pourquoi. Les pièces de la société et l'envoi n'ont donc pas pu être testés.
- **Confirmation** : Reproduit deux fois, par les deux chemins (saisie manuelle, puis société retrouvée au registre).
- **Capture** : captures/diag-form3-essai2-registre-colle.png
- **Code soupçonné** : `lib/zod/client.ts`, `tenantFormSchema` : `entreprise.name` (« nom commercial ») est obligatoire ; `components/intakes/tenant-intake-form.tsx` appelle `CompanyRegistryLookup` avec `syncTradeName={false}` et n'affiche aucun champ « nom commercial » : la valeur reste vide et l'erreur porte sur un champ invisible (même contrôle dans `tenantFieldIssues`, `lib/rules/dossier-rules.ts`). Le formulaire propriétaire, lui, passe `syncTradeName`. Lignes identiques à `staging`. Cause déduite de la lecture du code, non vérifiée en corrigeant.

### D2. Locataire « entreprise » : le champ Email se grise dès la première lettre tapée

- **Gravité** : bloquant — **Origine** : staging — **Appareil(s)** : ordinateur (même écran sur téléphone) — **Cas** : LOC-055
- **Reproduire** : Étape 3 « Informations de l'entreprise » : cliquer dans « Email » et taper une adresse au clavier.
- **Attendu** : L'adresse se saisit normalement.
- **Constaté** : Après le premier caractère le champ devient grisé et garde une seule lettre ; « Continuer » répond « Email invalide » et il faut recharger la page. Seul un collage de l'adresse entière fonctionne.
- **Confirmation** : Reproduit deux fois (exécutions t09 et t09b).
- **Capture** : captures/loc-055-email-societe-grise.png
- **Code soupçonné** : `components/intakes/tenant-intake-form.tsx`, `renderClientInfoStep` : `isEmailLocked = !!rootEmail` où `rootEmail` lit la valeur en cours de saisie (`entrepriseWatch?.email`) ; le champ est donc verrouillé dès qu'il n'est plus vide. Identique à `staging`.

### D3. Refus du serveur affichés en anglais technique (« An error occurred in the Server Components render… »)

- **Gravité** : majeur — **Origine** : staging — **Appareil(s)** : téléphone (tout appareil) — **Cas** : LOC-045
- **Reproduire** : Formulaire à deux locataires : donner à la seconde personne l'adresse e-mail du premier locataire (ou celle d'un autre compte), « Continuer ».
- **Attendu** : Un message en français expliquant que cette adresse est déjà utilisée.
- **Constaté** : L'enregistrement est bien refusé (rien en base), mais le message flottant est : « An error occurred in the Server Components render. The specific message is omitted in production builds… ». Le serveur répond 500. Tout refus levé par une action du formulaire (adresse déjà utilisée, formulaire déjà soumis, lien révoqué…) arrive ainsi à l'écran sur un serveur de production.
- **Confirmation** : Reproduit deux fois (deux exécutions, deux adresses différentes à chaque fois).
- **Capture** : captures/loc-045-adresse-autre-compte.png
- **Code soupçonné** : `lib/actions/intakes.ts` (`savePartialIntake` et les fonctions appelées lèvent `throw new Error("…")`) : en production Next.js masque le texte des erreurs levées par une action serveur. `components/intakes/tenant-intake-form.tsx`, `handleNext`, affiche tel quel `error.message`. Code identique à `staging`.

### D4. Reconfirmation : le locataire n'est prévenu par aucun e-mail

- **Gravité** : majeur — **Origine** : branche — **Appareil(s)** : tous — **Cas** : LOC-122
- **Reproduire** : Équipe : fiche d'un dossier dont le locataire a déjà donné son accord, « Modifier : Loyer et charges », changer le loyer, « Enregistrer ».
- **Attendu** : Le locataire reçoit un e-mail (ou une tâche d'e-mail est créée) l'invitant à relire et confirmer les nouvelles conditions.
- **Constaté** : L'accord est bien invalidé et archivé, et l'espace locataire affiche « Confirmation à renouveler », mais aucun e-mail ni aucune tâche de fond n'est émis : le locataire ne l'apprend que s'il se connecte de lui-même. À arbitrer : oubli ou choix de conception.
- **Confirmation** : Vérifié sur les quatre modifications successives du dossier 5 (loyer, charges, loyer, dépôt) : aucun e-mail ni événement pour le locataire.
- **Capture** : captures/loc-123-a-faire-ordinateur.png
- **Code soupçonné** : `lib/bail/tenant-agreement.ts` (nouveau fichier de la branche) : l'invalidation de l'accord écrit l'historique et `tenantReconfirmationRequestedAt`, sans envoi ni `inngest.send`.

### D5. L'adresse e-mail du locataire principal reste modifiable dans le formulaire

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur (même écran sur téléphone) — **Cas** : LOC-012
- **Reproduire** : Formulaire locataire, étape 3 « Informations client » : remplacer l'adresse préremplie du locataire principal par une autre, « Continuer ».
- **Attendu** : Le champ est grisé avec la mention « L'email ne peut pas être modifié » (le code de l'écran la prévoit).
- **Constaté** : Le champ est libre et la mention n'apparaît jamais. La nouvelle adresse est enregistrée sur la fiche de la personne, alors que le compte de connexion garde l'ancienne : le dossier et le compte ne portent plus la même adresse. L'adresse d'origine a été remise après l'essai.
- **Confirmation** : Vu deux fois (champ libre à deux ouvertures distinctes du formulaire ; modification puis remise en état vérifiées en base).
- **Capture** : captures/loc-012-email-modifie.png
- **Code soupçonné** : `components/intakes/tenant-intake-form.tsx`, `renderClientInfoStep` (vers la ligne 2000) : le verrou cherche la personne marquée `isPrimary` dans les valeurs du formulaire, or ce champ n'y est jamais copié (`mapToPersonForm`), donc `isEmailLocked` vaut toujours faux pour un particulier. Fichier identique à `staging`.

### D6. Un numéro de téléphone incomplet est accepté et enregistré

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : LOC-013
- **Reproduire** : Étape 3 : saisir « +33 6 12 » comme téléphone, « Continuer ».
- **Attendu** : Message « Numéro de téléphone invalide », on reste à l'étape 3.
- **Constaté** : Aucun message ; le formulaire passe à l'étape 4 et la base contient « +33612 ». Par ailleurs la liste des pays de l'indicatif est en anglais (« Belgium », « Germany », « United Kingdom »).
- **Confirmation** : Reproduit deux fois (deux exécutions, même résultat en base).
- **Capture** : captures/loc-013-telephone-incomplet.png
- **Code soupçonné** : `lib/utils/phone-validation.ts`, `isValidPhoneNumberSafe` : la règle « internationale » accepte tout numéro de cinq chiffres ou plus après le « + ». Liste des pays : `components/ui/phone-input.tsx` (libellés par défaut de la bibliothèque). Fichiers identiques à `staging`.

### D7. Une date de naissance à venir, ou celle d'un enfant, est acceptée

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur, iPhone — **Cas** : LOC-018, LOC-112
- **Reproduire** : Étape 3 : saisir comme date de naissance une date située dans quinze à vingt jours (même année), « Continuer » ; recommencer avec le 15/06/2015.
- **Attendu** : Refus d'une date de naissance future ; refus ou avertissement pour un locataire mineur.
- **Constaté** : Les deux dates passent sans message et sont enregistrées en base. Seule l'année est bornée (de 1906 à l'année en cours).
- **Confirmation** : Date à venir reproduite deux fois (dossier 1 sur ordinateur, dossier 4 sur iPhone), relue en base à chaque fois ; locataire mineur vu une fois.
- **Capture** : captures/loc-018-date-future-acceptee.png
- **Code soupçonné** : `components/ui/date-picker.tsx` (`parseTyped` ne compare que l'année) et `lib/zod/client.ts` (schéma de la personne : aucune borne sur `birthDate`). `date-picker.tsx` identique à `staging`.

### D8. Le régime matrimonial reste en base quand le locataire n'est plus déclaré marié

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur, iPhone — **Cas** : LOC-024, LOC-114
- **Reproduire** : Étape 3 : choisir « marié » + « Communauté universelle », « Continuer » ; revenir, choisir « célibataire », « Continuer ».
- **Attendu** : Le régime matrimonial est effacé en base.
- **Constaté** : La base garde « CELIBATAIRE » avec le régime « COMMUNAUTE_UNIVERSELLE ». Les pièces demandées, elles, sont justes (aucun contrat de mariage exigé).
- **Confirmation** : Constaté sur le dossier 1 (ordinateur) puis de nouveau sur le dossier 4 (iPhone, cas LOC-114).
- **Capture** : captures/loc-023-pieces-marie-separation.png
- **Code soupçonné** : `components/intakes/tenant-intake-form.tsx` (le champ est remis à `undefined`, donc absent de l'envoi) et `lib/actions/intakes.ts`, `savePartialIntake` (un champ absent n'efface pas la valeur).

### D9. Messages de validation manquants ou en anglais à l'étape « entreprise »

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : LOC-051, LOC-054
- **Reproduire** : Étape 3 « entreprise », « Continuer » sans rien remplir (en recherche, puis en saisie manuelle).
- **Attendu** : Un message en français sous chaque champ obligatoire.
- **Constaté** : Sous Téléphone : « Invalid input: expected string, received undefined ». Sous Email : « Email invalide » pour un champ vide. En saisie manuelle, aucun message sous « Raison sociale » ni sous « Adresse du siège social » restés vides.
- **Confirmation** : Vu à chaque passage (trois exécutions).
- **Capture** : captures/loc-051-entreprise-champs-vides.png
- **Code soupçonné** : `lib/zod/client.ts`, bloc `entreprise` de `tenantFormSchema` : `phone: z.string().min(1, …)` sans message pour une valeur absente.

### D10. Erreur de rendu React (n° 418) sur « Mes informations »

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur, téléphone, iPhone — **Cas** : LOC-070, LOC-085, LOC-099
- **Reproduire** : Ouvrir /client/locataire/informations avec un compte locataire et regarder la console du navigateur.
- **Attendu** : Aucune erreur JavaScript.
- **Constaté** : « Minified React error #418 » (le texte rendu par le serveur diffère de celui du navigateur) à chaque ouverture. La page s'affiche quand même correctement. Les réponses 500 isolées relevées dans les mêmes journaux (une page de bail, rechargée ensuite sans erreur) coïncident avec des coupures de la base distante du montage.
- **Confirmation** : Reproduit sur les trois appareils (cinq exécutions) ; la même erreur a été relevée une fois sur la page d'un bail ouverte avec la messagerie (« ?chat=1 ») sur téléphone.
- **Capture** : captures/loc-068-mes-informations-ordinateur.png
- **Code soupçonné** : `components/client-v2/owner-informations.tsx` (identique à `staging`) : probablement la date « Ajouté le … » d'une pièce, formatée différemment côté serveur et côté navigateur.

### D11. Le formulaire rouvert repart toujours du récapitulatif

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur, téléphone, iPhone — **Cas** : LOC-021
- **Reproduire** : Remplir l'identité (étape 3), fermer le navigateur, rouvrir le lien.
- **Attendu** : Reprise à la première étape incomplète (les pièces).
- **Constaté** : Le formulaire rouvre à l'étape 1/4 ; il faut toucher « Continuer » trois fois. Les données saisies sont bien retrouvées.
- **Confirmation** : Vu à chaque réouverture (plus de dix fois, sur les trois appareils).
- **Capture** : captures/loc-021-reprise-etape3.png
- **Code soupçonné** : `components/intakes/tenant-intake-form.tsx`, effet d'initialisation de `currentStep` : dès qu'un bien ou un bail existe, l'étape calculée est remplacée par le récapitulatif.

### D12. Libellés techniques ou en anglais dans le formulaire locataire

- **Gravité** : cosmetique — **Origine** : staging — **Appareil(s)** : ordinateur, téléphone, iPhone — **Cas** : LOC-008, LOC-015, LOC-043, LOC-111
- **Reproduire** : Parcourir le formulaire locataire : étape 1 (récapitulatif), étape 3 (statut familial, seconde personne).
- **Attendu** : Des libellés en français courant, avec accents ; des champs de 16 px au moins sur iPhone.
- **Constaté** : Étape 1 : « APPARTEMENT », « PLEIN PROPRIETE », « Bail nue ». Étape 3 : statuts « CELIBATAIRE », « MARIE », « DIVORCE », « VEUF », « PACS ». Champ Email vide de la seconde personne : « Email invalide » au lieu de « L'email est requis ». Pièce déposée : « 0.00 MB - Uploadé ». Sur iPhone, certains champs de l'étape 3 sont en 14 px : Safari zoome à la prise de focus.
- **Confirmation** : Visible à chaque passage (ordinateur, téléphone, iPhone).
- **Capture** : captures/loc-015-statut-familial-liste.png
- **Code soupçonné** : `components/intakes/tenant-intake-form.tsx` : `status.replace(/_/g, " ")` pour les statuts, valeurs brutes du bien dans `renderOverviewStep` ; `components/ui/file-upload.tsx` pour « Uploadé ».

## 3. Parcours vérifiés

### Formulaire — barrière d'accès

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-001 | ordinateur | Lien du formulaire ouvert sans session : écran de code | OK | Écran de code affiché ; adresse masquée r••••••1@example.invalid ; formulaire non visible | captures/loc-001-barriere-sans-session.png |
| LOC-002 | ordinateur | Jeton de formulaire inexistant : page d'erreur propre | OK | Page « 404 — Page introuvable » de l'application, bouton « Retour à l'accueil », aucun détail technique. Le code HTTP renvoyé est 200 et non 404 (page diffusée en flux) : sans effet pour l'utilisateur, noté en observation. | captures/loc-002-jeton-inexistant.png |
| LOC-003 | ordinateur | Lien ouvert en étant connecté avec un autre compte locataire | OK | Avertissement affiché ; formulaire non visible | captures/loc-003-barriere-autre-compte.png |
| LOC-004 | ordinateur | Code d'accès faux refusé | OK | Toast après envoi : ["Code envoyé Vérifiez votre boîte de réception."] ; message de refus affiché (« Le code est incorrect… ») ; écran de code toujours affiché | captures/loc-004-code-faux.png |
| LOC-006 | ordinateur | Renvoi du code après le délai d'une minute | OK | Juste après l'envoi : « Renvoyer dans 57s » (inactif : true) ; après renvoi un second e-mail est arrivé (1 depuis le clic) ; nouveau code différent du premier | captures/loc-006-renvoi-code.png |
| LOC-007 | ordinateur | Code juste : ouverture du formulaire et bascule de session | OK | Ancien code (remplacé par un renvoi) refusé avec « Le code est incorrect » ; dernier code accepté, formulaire ouvert sur le récapitulatif ; en base : compte de rôle UTILISATEUR rattaché au client du dossier (true), adresse vérifiée true, 2 session(s). Après un refus, le champ garde les six chiffres : il faut les effacer à la main avant de ressaisir (observation). | captures/loc-007-formulaire-ouvert.png |
| LOC-040 | telephone | Barrière de code sur téléphone | OK | Débordement horizontal : écran d'accueil false, écran du code false ; champ du code : clavier « numeric », remplissage automatique « one-time-code » ; formulaire ouvert : true | captures/loc-040-code-telephone.png |
| LOC-110 | iphone | Barrière de code sur iPhone (Safari) | OK | Débordement : accueil non, écran du code non ; champ du code : clavier « numeric », remplissage « one-time-code » ; formulaire ouvert : true | captures/loc-110-code-iphone.png |

### E-mails

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-005 | ordinateur | E-mail du code d'accès au formulaire | OK | Objet : « [TEST] ###### – votre code de connexion BailNotarie » ; code présent : true ; valeurs vides : false ; expéditeur : BailNotarie – Équipe <contact@bailnotarie.fr> |  |
| LOC-034 | ordinateur | Notifications déclenchées par l'envoi du formulaire locataire | OK | Tâches de fond capturées (non exécutées par le montage) : completion-status/calculate-multiple, email/intake.tenant-submitted, email/intake.confirmation ; e-mails directs : aucun ; données contenant une valeur vide : 0 |  |
| LOC-122 | ordinateur | Le locataire est prévenu par e-mail qu'il doit reconfirmer | KO (majeur, branche) | E-mails directs au locataire : aucun ; tâches de fond liées au dossier : aucune ; liens : — ; valeurs vides : false. Rien ne part : le locataire ne découvre la demande qu'en se connectant à son espace. |  |
| LOC-141 | ordinateur | E-mail de demande reçu par le locataire (notaire) | OK | Objet : « [TEST] Votre bail notarié : 1 pièce et 2 informations à compléter » ; expéditeur : BailNotarie – Équipe <contact@bailnotarie.fr> ; cite la pièce d'identité : true, la situation familiale : true, la profession : true, la précision : true ; lien : /client/demande/<id> ; valeurs vides : false ; extrait : « Nous avons besoin de 1 pièce et 2 informations pour votre dossier E-MAIL DE TEST – envoyé depuis l’env… |  |
| LOC-161 | ordinateur | E-mail de demande reçu par le locataire (équipe) | OK | Objet : « [TEST] Votre bail notarié : 1 pièce et 2 informations à compléter » ; expéditeur : BailNotarie – Équipe <contact@bailnotarie.fr> ; cite la pièce d'identité : true, la situation familiale : true, la profession : true, la précision : true ; lien : /client/demande/<id> ; valeurs vides : false ; extrait : « Nous avons besoin de 1 pièce et 2 informations pour votre dossier E-MAIL DE TEST – envoyé depuis l’env… |  |

### Formulaire — particulier seul

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-008 | ordinateur | Récapitulatif du bien (étape 1) | PARTIEL (cosmetique, staging) | Adresse, surface « 42 m² » et propriétaire exacts : true. Le type et le statut s'affichent sous leur forme technique en majuscules sans accents : « APPARTEMENT », « PLEIN PROPRIETE ». | captures/loc-008-recap-bien.png |
| LOC-009 | ordinateur | Récapitulatif du bail : loyer, charges, dépôt, dates, jour de paiement | OK | Présents à l'écran — {"loyer":true,"charges":true,"debut":true,"fin":true,"jour":true}. Le bloc du bail est replié par défaut : le locataire peut passer l'étape sans avoir vu le loyer. | captures/loc-009-recap-bail.png |
| LOC-010 | ordinateur | Choix du profil « Particulier » (étape 2) | OK | Étape 3/4 affichée avec « Personne 1 — Principal » | captures/loc-010-profil.png |
| LOC-011 | ordinateur | Identité : chaque champ obligatoire est signalé | OK | 9/9 messages affichés ; mention « Erreurs détectées. » sur la personne ; étape inchangée : true | captures/loc-011-champs-obligatoires.png |
| LOC-012 | ordinateur | Adresse e-mail du locataire principal : préremplie et verrouillée | KO (mineur, staging) | Le champ n'est pas verrouillé et la mention « L'email ne peut pas être modifié » est absente. Adresse remplacée par recette-loc-locataire1-bis@example.invalid puis « Continuer » : accepté : true (messages : ["Données enregistrées avec succès"]) ; en base la personne porte alors « recette-loc-locataire1-bis@example.invalid » tandis que le compte de connexion reste « recette-loc-locataire1@example.invalid ». Remise … | captures/loc-012-email-modifie.png |
| LOC-013 | ordinateur | Téléphone avec indicatif de pays | KO (mineur, staging) | Numéro incomplet « +33 6 12 » : ACCEPTÉ sans message, passage à l'étape 4 ; numéro en base après l'essai : +33612 (la règle n'exige que cinq chiffres après le « + »). Belgique → indicatif « +32 ». La liste des pays est en anglais (« Belgium », « Germany », « United Kingdom »…). | captures/loc-013-telephone-incomplet.png |
| LOC-014 | ordinateur | Nationalité avec recherche (sans accents) | OK | « zzzz » → « Aucune nationalité trouvée. » ; « francais » → une seule proposition « Française » ; valeur retenue et relue après rechargement : « Française » ; en base : Française. | captures/loc-014-nationalite-recherche.png |
| LOC-015 | ordinateur | Statut familial et régime matrimonial : listes proposées | PARTIEL (cosmetique, staging) | Statuts affichés tels quels : ["CELIBATAIRE","MARIE","DIVORCE","VEUF","PACS"] (majuscules, sans accents ni féminin) ; régimes : ["Communauté réduite aux acquêts","Séparation de biens","Participation aux acquêts","Communauté universelle"] ; aide « Sans contrat signé chez un notaire… » : true | captures/loc-015-statut-familial-liste.png |
| LOC-016 | ordinateur | Marié sans régime matrimonial : refus | OK | Toujours à l'étape 3 : true ; message : « Le régime matrimonial est requis lorsque le statut familial est marié » | captures/loc-016-regime-requis.png |
| LOC-017 | ordinateur | Date de naissance saisie au clavier : masque et dates impossibles | OK | date inexistante 31/02/1990 → champ « 31/02/1990 », message « Cette date n'existe pas » ; année future 2030 → champ « 01/01/2030 », message « L'année doit être comprise entre 1906 et 2026 » ; saisie incomplète → champ « 15/03/ », message « Date incomplète — format JJ/MM/AAAA » ; « 15031990 » → « 15/03/1990 » | captures/loc-017-date-clavier-erreurs.png |
| LOC-018 | ordinateur | Date de naissance dans le futur ou locataire mineur | KO (mineur, staging) | Date à venir : message « aucun », passage à l'étape 4 : true, valeur enregistrée en base : 2026-12-06T00:00:00.000Z ; locataire de 11 ans : passage à l'étape 4 : true. Aucune règle n'existe : seule l'année est bornée (1906 à 2026). | captures/loc-018-date-future-acceptee.png |
| LOC-019 | ordinateur | Date de naissance choisie au calendrier | OK | Champ après choix : « 14/07/1988 » | captures/loc-019-calendrier.png |
| LOC-020 | ordinateur | Identité complète : enregistrement et passage aux pièces | OK | Étape 4 affichée : true ; en base : Jeanne Recette-Seule, +33612345678, Française, CELIBATAIRE, née le 1988-07-14 à Limoges, régime null | captures/loc-020-etape4-pieces.png |

### Formulaire — reprise

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-021 | ordinateur | Reprise du formulaire après fermeture du navigateur | PARTIEL (mineur, staging) | Le formulaire rouvre à « Étape 1/4 » (récapitulatif) et non aux pièces ; il faut refaire « Continuer » trois fois. Données retrouvées à l'étape 3 : {"prenom":"Jeanne","tel":"+33 6 12","naissance":"14/07/1988","nat":"Française","statut":"CELIBATAIRE"} | captures/loc-021-reprise-etape3.png |
| LOC-028 | ordinateur | Retour arrière avec la flèche : la saisie en cours est conservée | OK | Profession retrouvée : « Ingénieure d'études (modifié) » |  |
| LOC-032 | ordinateur | Bouton « Enregistrer » : page « Vos données sont enregistrées » | OK | Redirection vers la page d'attente : true ; nom affiché : true ; liens : ["Reprendre le formulaire → /intakes/825a47fd-3dfe-4546-a04d-7cef74eff39f"] | captures/loc-032-enregistrer-page-attente.png |
| LOC-116 | iphone | « Enregistrer » puis « Reprendre le formulaire » sur iPhone | OK | Page d'attente : true, nom affiché : true, débordement : non ; retour au formulaire : true (à l'étape 1, voir LOC-021) | captures/loc-116-enregistrer-iphone.png |

### Formulaire — situation familiale

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-022 | ordinateur | Célibataire, divorcé, veuf : seule la pièce d'identité est exigée | OK | DIVORCE → ["Pièce d'identité *"] (base : DIVORCE) ; VEUF → ["Pièce d'identité *"] (base : VEUF) ; CELIBATAIRE → ["Pièce d'identité *"] (base : CELIBATAIRE/COMMUNAUTE_UNIVERSELLE) |  |
| LOC-023 | ordinateur | Pacsé : convention de PACS exigée | OK | PACS → ["Pièce d'identité *","Convention de PACS *"] (base : PACS) | captures/loc-023-pieces-pacs.png |
| LOC-024 | ordinateur | Marié : contrat de mariage exigé sauf en communauté réduite aux acquêts | KO (mineur, staging) | Communauté réduite aux acquêts → ["Pièce d'identité *"] (base : MARIE/COMMUNAUTE_REDUITE) ; Séparation de biens → ["Pièce d'identité *","Contrat de mariage *"] (base : MARIE/SEPARATION_DE_BIENS) ; Participation aux acquêts → ["Pièce d'identité *","Contrat de mariage *"] (base : MARIE/PARTICIPATION_AUX_AQUETS) ; Communauté universelle → ["Pièce d'identité *","Contrat de mariage *"] (base : MARIE/COMMUNAUTE_UNIVERSE… | captures/loc-023-pieces-marie-separation.png |

### Formulaire — envoi

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-025 | ordinateur | Envoi refusé sans la case de confirmation des conditions | OK | Message : « Confirmez le loyer, les charges et la date d'entrée avant d'envoyer le formulaire » ; formulaire en base : PENDING | captures/loc-025-envoi-sans-confirmation.png |
| LOC-026 | ordinateur | Envoi refusé sans pièce d'identité | OK | Message : « Veuillez joindre tous les documents requis Pièce d'identité de Jeanne Recette-Seule » ; formulaire en base : PENDING | captures/loc-026-envoi-sans-piece.png |
| LOC-033 | ordinateur | Envoi du formulaire (double clic sur « Soumettre ») et page de succès | OK | Page de succès : true (« Merci Jeanne Recette-Seule. Votre dossier est entre nos mains — vous n'avez plus rien à faire pour l'instant. ») ; case de confirmation décochée après rechargement : true ; en base : formulaire SUBMITTED, bail PENDING_VALIDATION, accord confirmé le 2026-11-16T20:51:42.183Z, conditions {"endDate":"2030-02-01","bailType":"BAIL_NU_3_ANS","bailFamily":"HABITATION","rentAmount":600,"effectiveDa… | captures/loc-033-succes.png |
| LOC-035 | ordinateur | Lien rouvert après l'envoi | OK | « Formulaire déjà soumis » : true ; champs de saisie visibles : 0 ; page d'attente : « Ce formulaire est déjà envoyé » | captures/loc-035-deja-soumis.png |
| LOC-049 | telephone | Envoi du formulaire à deux locataires depuis le téléphone | OK | Page de succès : true (« Merci Karim Recette-Duo. Votre dossier est entre nos mains — vous n'avez plus rien à faire ») ; débordement : false ; en base : formulaire SUBMITTED, bail PENDING_VALIDATION, accord le 2026-11-16T21:11:17.587Z | captures/loc-049-succes-telephone.png |
| LOC-050 | telephone | Lien rouvert après envoi, sur téléphone | OK | Message affiché : true ; débordement : false | captures/loc-050-deja-soumis-telephone.png |
| LOC-117 | iphone | Envoi du formulaire depuis l'iPhone | OK | Pièces retrouvées après reprise : true ; page de succès : true (« Merci Nora Recette-Mariee. Votre dossier est entre nos mains — vous n'avez plus  ») ; débordement : non ; base : formulaire SUBMITTED, bail PENDING_VALIDATION, accord le 2026-11-17T02:11:07.214Z | captures/loc-117-succes-iphone.png |

### Formulaire — pièces

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-027 | ordinateur | Dépôt de la pièce d'identité (PDF) | OK | Nom du fichier affiché : true ; messages : ["Veuillez joindre tous les documents requis Pièce d'identité de Jeanne Recette-Seule"] ; en base : [{"kind":"ID_IDENTITY","label":"recette-identite-loc1.pdf","mimeType":"application/pdf","size":111}] | captures/loc-027-piece-deposee.png |
| LOC-029 | ordinateur | Pièce déjà déposée retrouvée après rechargement, aperçu | OK | Pièce listée : true ; 3 boutons d'action dont les noms accessibles sont ["(sans nom)","(sans nom)","(sans nom)"] ; fenêtre d'aperçu ouverte : true (« Pièce d'identité Ouvrir dans un onglet Close ») | captures/loc-029-apercu-piece.png |
| LOC-030 | ordinateur | Suppression d'une pièce déposée | OK | Confirmation demandée : false ; message : « Document supprimé avec succès » ; pièces en base après suppression : 0 ; encore affichée : false | captures/loc-030-piece-supprimee.png |
| LOC-031 | ordinateur | Dépôt d'une image (PNG) comme pièce d'identité | OK | Fichier listé : true ; en base : [{"kind":"ID_IDENTITY","label":"recette-identite-loc1-photo.png","mimeType":"image/png"}] ; la taille s'affiche « 0.00 MB - Uploadé » (anglicisme, et taille nulle pour un petit fichier). | captures/loc-031-piece-image.png |

### Formulaire — deux locataires (téléphone)

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-041 | telephone | Récapitulatif du bien et du bail sur téléphone | OK | Valeurs exactes : true ; débordement : false (412/412 px) ; bouton « Continuer » dans l'écran : true {"y":779,"h":48,"l":380} | captures/loc-041-recap-telephone.png |
| LOC-042 | telephone | Profil et identité de la première personne saisis au doigt | OK | Types de champ : téléphone « tel », e-mail « email », date « numeric » ; plus petite police des champs : 16 px ; débordement étape 2 : false, étape 3 : false  ; bouton « Continuer » visible : true | captures/loc-042-personne1-telephone.png |
| LOC-043 | telephone | Ajout d'une seconde personne : champs obligatoires | PARTIEL (cosmetique, staging) | Fiche « Locataire 2 sur 2 » : true ; 9/9 messages attendus ; sous le champ Email vide le message est « Email invalide » au lieu de « L'email est requis ». | captures/loc-043-personne2-erreurs.png |
| LOC-044 | telephone | Suppression de la seconde personne (confirmation, annulation) | OK | Fenêtre : « Confirmer la suppression Êtes-vous sûr de vouloir supprimer Erreur Asupprimer ? Annuler Confirmer Close » ; dans l'écran : true ; après « Annuler » la personne est conservée : true ; après « Confirmer » : message « Personne supprimée », retour à un seul locataire : true. La corbeille mesure 36×36 px et n'a pas de nom accessible («  »). | captures/loc-044-suppression-personne-telephone.png |
| LOC-045 | telephone | Seconde personne : adresse e-mail identique au premier locataire ou déjà utilisée par un autre compte | PARTIEL (majeur, staging) | Même adresse que le premier locataire : accepté : false, message affiché : ["An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error."], adresses en base ensuite : ["recette-loc-locataire2@example.invalid","recett… | captures/loc-045-adresse-autre-compte.png |
| LOC-046 | telephone | Deux locataires enregistrés, passage d'une fiche à l'autre | OK | Retour sur la personne 1 par la barre : true ; « Continuer » sur la personne 1 mène à la fiche de la personne 2 : true ; étape 4 atteinte : true ; en base : Karim Recette-Duo <recette-loc-locataire2@example.invalid> (principale) CELIBATAIRE ; Lina Recette-Duo <recette-loc-locataire2b@example.invalid>  PACS | captures/loc-046-etape4-deux-personnes.png |
| LOC-047 | telephone | Pièces demandées pour chaque locataire ; envoi refusé s'il en manque une | OK | Blocs : ["Documents de Karim Recette-Duo (Principale) *","Documents de Lina Recette-Duo *"] ; zones : ["Pièce d'identité *","Pièce d'identité *"] (la personne 2 est déclarée pacsée : aucune convention de PACS demandée, la règle ne regarde que la personne principale) ; message de refus : « Veuillez joindre tous les documents requis Pièce d'identité de Lina Recette-Duo » | captures/loc-047-piece-manquante-personne2.png |
| LOC-048 | telephone | Chaque pièce est rattachée à la bonne personne | OK | En base : recette-identite-loc2-karim.pdf → Karim ; recette-identite-loc2-lina.png → Lina ; débordement : false  | captures/loc-048-pieces-deux-personnes.png |

### Formulaire — entreprise

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-051 | ordinateur | Profil « Entreprise » : champs obligatoires | PARTIEL (mineur, staging) | Type du client en base : PERSONNE_MORALE ; société : « Confirmez votre société pour continuer. » ; téléphone : « Invalid input: expected string, received undefined » ; e-mail : « Email invalide » | captures/loc-051-entreprise-champs-vides.png |
| LOC-052 | ordinateur | Numéro SIREN invalide | OK | 123456789 → message d'invalidité : true ; 12345 → message : false | captures/loc-052-siren-invalide.png |
| LOC-053 | ordinateur | Recherche de la société par son SIREN | OK | Résultat de la recherche pour un numéro d'établissement public connu : trouvee. Carte « Est-ce bien votre société ? » avec raison sociale, forme, siège et SIREN : true ; « Non, modifier le numéro » vide le champ : true ; « Oui, c'est ma société » affiche « Société retrouvée au registre » : true, raison sociale préremplie : true, adresse du siège préremplie : true ; « Changer » revient à la recherche : true. (La re… | captures/loc-053-recherche-siren.png |
| LOC-054 | ordinateur | Société introuvable : saisie manuelle | PARTIEL (mineur, staging) | Message « Nous n'avons pas retrouvé cette société automatiquement. » et lien « Compléter les informations moi-même » : oui ; les champs SIREN, raison sociale et siège s'affichent. À vide, « Continuer » n'affiche que deux messages : « Invalid input: expected string, received undefined » sous Téléphone (anglais technique) et « Email invalide » ; rien sous la raison sociale ni sous l'adresse. | captures/loc-054-societe-introuvable.png |
| LOC-055 | ordinateur | Adresse e-mail de la société saisie au clavier | KO (bloquant, staging) | Le champ se grise dès le premier caractère : il contient « r » et ne peut plus être modifié ; « Continuer » répond « Email invalide » et il ne reste qu'à recharger la page. Reproduit deux fois (exécutions t09 et t09b). Seul un collage de l'adresse entière passe ce champ. | captures/loc-055-email-societe-grise.png |
| LOC-056 | ordinateur | Étape 3 « entreprise » entièrement remplie : passage aux pièces | KO (bloquant, staging) | « Continuer » ne fait rien : on reste à l'étape 3/4, aucun message à l'écran, aucun message flottant, aucune erreur réseau, rien en base (fiches société pour ce client : 0). Reproduit deux fois, par la saisie manuelle (t09) et par la société retrouvée au registre (t09b). Cause lue dans le code : le schéma exige un « nom commercial » que le formulaire locataire ne demande ni ne remplit jamais ; l'erreur porte donc … | captures/diag-form3-essai2-registre-colle.png |
| LOC-057 | ordinateur | Pièces de la société (Kbis, statuts) et envoi du formulaire d'une entreprise | NON_TESTE | Étape inaccessible : le formulaire reste bloqué à l'étape 3 (cas LOC-056). Formulaire du dossier 3 toujours « PENDING ». |  |

### Espace locataire — ordinateur

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-060 | ordinateur | Connexion réelle par code sur /client/login | OK | Redirection vers /client/login : true ; débordement : non ; adresse inconnue : messages ["Erreur Aucun compte trouvé pour cet email"], écran de code affiché : false, e-mails envoyés : 0 ; code faux : ["Erreur de connexion Le code OTP est incorrect"] « Le code OTP est incorrect (le code complet n'est pas vérifié tout seul : il faut toucher « Se connecter », contrairement à l'écran de code du formulaire) », toujours… | captures/loc-060-connexion-code-ordinateur.png |
| LOC-061 | ordinateur | Tableau de bord : synthèse, compteurs, parcours en trois étapes | OK | Titre : « Bonjour Locataire » ; synthèse : « 1 bail en cours — rien à faire de votre côté » ; compteurs en cours / à faire / signés : 1 / 0 / 0 ; ligne : « Logement recette LOC 5 — En vérification · Léa ProprioLOC5 · 600 €/mois · 01/02/2027 → 01/02/2030 » ; parcours en trois étapes : true ; débordement : non. Le titre dit « Bonjour Locataire » : il reprend le nom du compte et non le prénom de la personne (Jules). | captures/loc-061-tableau-de-bord-ordinateur.png |
| LOC-062 | ordinateur | Ligne de bail dépliable sur le tableau de bord | OK | Contenu déplié : « Logement recette LOC 5 · En vérification · Léa ProprioLOC5 · 600 €/mois · 01/02/2027 → 01/02/2030 · Votre dossier est entre nos mains. On revient vers vous sous 48 h. · BIEN · Logement recette LOC 5 — 5 Place Bonnyaud 23000 Guéret · LOYER · 600 € / mois · NATURE · Bail d'habitation · BAIL · Bail nu 3 ans · PÉRIODE · 01/02/2027 → » ; lien vers la page du bail : true ; débordement : non | captures/loc-062-ligne-depliee-ordinateur.png |
| LOC-063 | ordinateur | Navigation et page « Mes baux » | OK | baux listés : Logement recette LOC 5 ; statut affiché : En vérification ; débordement : non | captures/loc-063-mes-baux-ordinateur.png |
| LOC-064 | ordinateur | Page du bail — dossier 5 (en vérification) | OK | Statut affiché : « En vérification » ; valeurs présentes : {"loyer":true,"charges":true,"debut":true,"jour":true,"adresse":true,"proprio":true,"type":true,"statutLegal":true} ; mentions du notaire : (aucune mention) ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-064-bail5-ordinateur.png |
| LOC-065 | ordinateur | Page du bail — dossier 6 (chez le notaire) | OK | Statut affiché : « Chez le notaire » ; valeurs présentes : {"loyer":true,"charges":true,"debut":true,"jour":true,"adresse":true,"proprio":true,"type":true,"statutLegal":true} ; mentions du notaire : Chez le notaire / Un notaire a pris le dossier en charge. Il vous contacte bientôt. / Contacter le notaire ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-065-bail6-ordinateur.png |
| LOC-066 | ordinateur | Page du bail — dossier 7 (signé) | OK | Statut affiché : « Signé » ; valeurs présentes : {"loyer":true,"charges":true,"debut":true,"jour":true,"adresse":true,"proprio":true,"type":true,"statutLegal":true} ; mentions du notaire : Contacter le notaire ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-066-bail7-ordinateur.png |
| LOC-067 | ordinateur | Tableau de bord selon le statut du bail (signé, chez le notaire) | OK | Dossier 7 : compteurs 0 / 0 / 1, synthèse « Bonjour Locataire — Bienvenue dans votre espace locataire », ligne « Logement recette LOC 7 — Signé · Chloé ProprioLOC7 · 600 €/mois · 01/02/2027 → 01/02/2030 » ; dossier 6 : compteurs 1 / 0 / 0, ligne « Logement recette LOC 6 — Chez le notaire · Manon ProprioLOC6 · 600 €/mois · 01/02/2027 → 01/02/2030 » ; débordement : non | captures/loc-067-tableau-de-bord-signe-ordinateur.png |
| LOC-068 | ordinateur | Mes informations : lecture | OK | Nom affiché : true ; adresse e-mail : true ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-068-mes-informations-ordinateur.png |
| LOC-069 | ordinateur | Déconnexion | OK | Vérifié dans LOC-133 : déconnexion effective |  |
| LOC-133 | ordinateur | Déconnexion depuis le menu du compte | OK | Menu : « TL ·  · Théo LocataireLOC7 ·  · recette-loc-locataire7@example.invalid ·  · Locataire · Se déconnecter » ; après clic : / ; /client/locataire renvoie ensuite à la connexion : true | captures/loc-133-apres-deconnexion.png |
| LOC-175 | ordinateur | Mes informations : modification par le locataire | NON_TESTE | L'écran est en lecture seule : aucun champ ni bouton de modification (champs de saisie visibles : 0). Il renvoie vers « Une correction à apporter ? Écrivez-nous, on s'en occupe. » : true. Les corrections passent par les demandes de complément (cas LOC-143 à LOC-173). Fonction de modification directe inexistante : rien à tester. |  |

### Contrôles transverses

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-070 | ordinateur | Erreurs JavaScript et réponses 5xx sur l'espace locataire (ordinateur) | KO (mineur, staging) | Erreurs de page : 1 ; réponses 5xx : 1 ; requêtes échouées : 0 ; erreurs de console hors 404 connus : 3 — [{"url":"http://localhost:3210/client/locataire/informations","texte":"Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full e… Analyse : l'erreur de page est l'erreur React n° 418 de « Mes informations » (reprodu… |  |
| LOC-085 | telephone | Erreurs JavaScript et réponses 5xx sur l'espace locataire (telephone) | KO (mineur, staging) | Erreurs de page : 1 ; réponses 5xx : 1 ; requêtes échouées : 0 ; erreurs de console hors 404 connus : 3 — [{"url":"http://localhost:3210/client/locataire/informations","texte":"Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full e… Analyse : l'erreur de page est l'erreur React n° 418 de « Mes informations » (reprodu… |  |
| LOC-099 | iphone | Erreurs JavaScript et réponses 5xx sur l'espace locataire (iphone) | KO (mineur, staging) | Erreurs de page : 1 ; réponses 5xx : 0 ; requêtes échouées : 2 ; erreurs de console hors 404 connus : 3 — [{"url":"http://localhost:3210/client/locataire/informations","texte":"Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full e… Analyse : l'erreur de page est l'erreur React n° 418 de « Mes informations » (reprodu… |  |
| LOC-119 | iphone | Erreurs JavaScript et réponses 5xx pendant le formulaire sur iPhone | OK | Erreurs de page : 0 ; réponses 5xx : 0 ; requêtes échouées : 0 ; erreurs de console : 24 — [{"url":"http://localhost:3210/intakes/add3d37d-eb26-4020-b411-4ff883bb1cf5","texte":"Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy."},{"url":"http://localhost:3210/intakes/add3d37d-eb26-4020-b4 |  |
| LOC-151 | telephone | Erreurs JavaScript, réponses 5xx et débordement pendant la réponse à la demande (telephone) | OK | Erreurs de page : 0 ; réponses 5xx : 0 ; requêtes échouées : 0 ; débordements relevés : 0 sur 3 mesures |  |
| LOC-171 | ordinateur | Erreurs JavaScript, réponses 5xx et débordement pendant la réponse à la demande (ordinateur) | OK | Erreurs de page : 0 ; réponses 5xx : 0 ; requêtes échouées : 0 ; débordements relevés : 0 sur 3 mesures |  |

### Espace locataire — téléphone Android

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-075 | telephone | Connexion réelle par code sur /client/login | OK | Redirection vers /client/login : true ; débordement : non ; adresse inconnue : messages ["Erreur Aucun compte trouvé pour cet email"], écran de code affiché : false, e-mails envoyés : 0 ; code faux : ["Erreur de connexion Le code OTP est incorrect"] « Le code OTP est incorrect (le code complet n'est pas vérifié tout seul : il faut toucher « Se connecter », contrairement à l'écran de code du formulaire) », toujours… | captures/loc-075-connexion-code-telephone.png |
| LOC-076 | telephone | Tableau de bord : synthèse, compteurs, parcours en trois étapes | OK | Titre : « Bonjour Locataire » ; synthèse : « 1 bail en cours — rien à faire de votre côté » ; compteurs en cours / à faire / signés : 1 / 0 / 0 ; ligne : « Logement recette LOC 5 — En vérification · Léa ProprioLOC5 · 600 €/mois » ; parcours en trois étapes : true ; débordement : non. Le titre dit « Bonjour Locataire » : il reprend le nom du compte et non le prénom de la personne (Jules). | captures/loc-076-tableau-de-bord-telephone.png |
| LOC-077 | telephone | Ligne de bail dépliable sur le tableau de bord | OK | Contenu déplié : « Logement recette LOC 5 · En vérification · Léa ProprioLOC5 · 600 €/mois · Votre dossier est entre nos mains. On revient vers vous sous 48 h. · BIEN · Logement recette LOC 5 — 5 Place Bonnyaud 23000 Guéret · LOYER · 600 € / mois · NATURE · Bail d'habitation · BAIL · Bail nu 3 ans · PÉRIODE · 01/02/2027 → 01/02/2030 · PROPRIÉTAIRE » ; lien vers la page du bail : true ; débordement : non | captures/loc-077-ligne-depliee-telephone.png |
| LOC-078 | telephone | Navigation et page « Mes baux » | OK | liens « Mes baux » visibles sans ouvrir de menu : 2 ; baux listés : Logement recette LOC 5 ; statut affiché : En vérification ; débordement : non | captures/loc-078-mes-baux-telephone.png |
| LOC-079 | telephone | Page du bail — dossier 5 (en vérification) | OK | Statut affiché : « En vérification » ; valeurs présentes : {"loyer":true,"charges":true,"debut":true,"jour":true,"adresse":true,"proprio":true,"type":true,"statutLegal":true} ; mentions du notaire : (aucune mention) ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-079-bail5-telephone.png |
| LOC-080 | telephone | Page du bail — dossier 6 (chez le notaire) | OK | Statut affiché : « Chez le notaire » ; valeurs présentes : {"loyer":true,"charges":true,"debut":true,"jour":true,"adresse":true,"proprio":true,"type":true,"statutLegal":true} ; mentions du notaire : Chez le notaire / Un notaire a pris le dossier en charge. Il vous contacte bientôt. / Contacter le notaire ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-080-bail6-telephone.png |
| LOC-081 | telephone | Page du bail — dossier 7 (signé) | OK | Statut affiché : « Signé » ; valeurs présentes : {"loyer":true,"charges":true,"debut":true,"jour":true,"adresse":true,"proprio":true,"type":true,"statutLegal":true} ; mentions du notaire : Contacter le notaire ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-081-bail7-telephone.png |
| LOC-082 | telephone | Tableau de bord selon le statut du bail (signé, chez le notaire) | OK | Dossier 7 : compteurs 0 / 0 / 1, synthèse « Bonjour Locataire — Bienvenue dans votre espace locataire », ligne « Logement recette LOC 7 — Signé · Chloé ProprioLOC7 · 600 €/mois » ; dossier 6 : compteurs 1 / 0 / 0, ligne « Logement recette LOC 6 — Chez le notaire · Manon ProprioLOC6 · 600 €/mois » ; débordement : non | captures/loc-082-tableau-de-bord-signe-telephone.png |
| LOC-083 | telephone | Mes informations : lecture | OK | Nom affiché : true ; adresse e-mail : true ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-083-mes-informations-telephone.png |
| LOC-084 | telephone | Déconnexion | OK | Après déconnexion, /client/locataire renvoie à la connexion : true |  |

### Espace locataire — iPhone

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-089 | iphone | Connexion réelle par code sur /client/login | OK | Redirection vers /client/login : true ; débordement : non ; adresse inconnue : messages ["Erreur Aucun compte trouvé pour cet email"], écran de code affiché : false, e-mails envoyés : 0 ; code faux : ["Erreur de connexion Le code OTP est incorrect"] « Le code OTP est incorrect (le code complet n'est pas vérifié tout seul : il faut toucher « Se connecter », contrairement à l'écran de code du formulaire) », toujours… | captures/loc-089-connexion-code-iphone.png |
| LOC-090 | iphone | Tableau de bord : synthèse, compteurs, parcours en trois étapes | OK | Titre : « Bonjour Locataire » ; synthèse : « 1 bail en cours — rien à faire de votre côté » ; compteurs en cours / à faire / signés : 1 / 0 / 0 ; ligne : « Logement recette LOC 5 — En vérification · Léa ProprioLOC5 · 600 €/mois » ; parcours en trois étapes : true ; débordement : non. Le titre dit « Bonjour Locataire » : il reprend le nom du compte et non le prénom de la personne (Jules). | captures/loc-090-tableau-de-bord-iphone.png |
| LOC-091 | iphone | Ligne de bail dépliable sur le tableau de bord | OK | Contenu déplié : « Logement recette LOC 5 · En vérification · Léa ProprioLOC5 · 600 €/mois · Votre dossier est entre nos mains. On revient vers vous sous 48 h. · BIEN · Logement recette LOC 5 — 5 Place Bonnyaud 23000 Guéret · LOYER · 600 € / mois · NATURE · Bail d'habitation · BAIL · Bail nu 3 ans · PÉRIODE · 01/02/2027 → 01/02/2030 · PROPRIÉTAIRE » ; lien vers la page du bail : true ; débordement : non | captures/loc-091-ligne-depliee-iphone.png |
| LOC-092 | iphone | Navigation et page « Mes baux » | OK | liens « Mes baux » visibles sans ouvrir de menu : 2 ; baux listés : Logement recette LOC 5 ; statut affiché : En vérification ; débordement : non | captures/loc-092-mes-baux-iphone.png |
| LOC-093 | iphone | Page du bail — dossier 5 (en vérification) | OK | Statut affiché : « En vérification » ; valeurs présentes : {"loyer":true,"charges":true,"debut":true,"jour":true,"adresse":true,"proprio":true,"type":true,"statutLegal":true} ; mentions du notaire : (aucune mention) ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-093-bail5-iphone.png |
| LOC-094 | iphone | Page du bail — dossier 6 (chez le notaire) | OK | Statut affiché : « Chez le notaire » ; valeurs présentes : {"loyer":true,"charges":true,"debut":true,"jour":true,"adresse":true,"proprio":true,"type":true,"statutLegal":true} ; mentions du notaire : Chez le notaire / Un notaire a pris le dossier en charge. Il vous contacte bientôt. / Contacter le notaire ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-094-bail6-iphone.png |
| LOC-095 | iphone | Page du bail — dossier 7 (signé) | OK | Statut affiché : « Signé » ; valeurs présentes : {"loyer":true,"charges":true,"debut":true,"jour":true,"adresse":true,"proprio":true,"type":true,"statutLegal":true} ; mentions du notaire : Contacter le notaire ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-095-bail7-iphone.png |
| LOC-096 | iphone | Tableau de bord selon le statut du bail (signé, chez le notaire) | OK | Dossier 7 : compteurs 0 / 0 / 1, synthèse « Bonjour Locataire — Bienvenue dans votre espace locataire », ligne « Logement recette LOC 7 — Signé · Chloé ProprioLOC7 · 600 €/mois » ; dossier 6 : compteurs 1 / 0 / 0, ligne « Logement recette LOC 6 — Chez le notaire · Manon ProprioLOC6 · 600 €/mois » ; débordement : non | captures/loc-096-tableau-de-bord-signe-iphone.png |
| LOC-097 | iphone | Mes informations : lecture | OK | Nom affiché : true ; adresse e-mail : true ; libellés techniques ou valeurs vides : aucun ; débordement : non | captures/loc-097-mes-informations-iphone.png |
| LOC-098 | iphone | Déconnexion | OK | Après déconnexion, /client/locataire renvoie à la connexion : true |  |
| LOC-118 | iphone | De la page de succès à l'espace locataire (premier accès) | OK | Arrivée sur /client/locataire : true ; titre «  » ; ligne : « Logement recette LOC 4 — En vérification · Hugo ProprioLOC4 · 600 €/mois » ; débordement : non | captures/loc-118-espace-apres-envoi-iphone.png |

### Formulaire — particulier marié (iPhone)

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-111 | iphone | Récapitulatif et profil sur iPhone | PARTIEL (cosmetique, staging) | Valeurs exactes : true ; débordement étape 1 : non, étape 2 : non ; plus petite police des champs de l'étape 3 : 14 px | captures/loc-111-recap-iphone.png |
| LOC-112 | iphone | Identité saisie sur iPhone ; date de naissance à venir (seconde reproduction) | KO (mineur, staging) | Débordement à l'étape 3 : non ; passage à l'étape 4 : true ; en base : Nora, MARIE / COMMUNAUTE_UNIVERSELLE, née le 2026-12-02 — la date à venir est acceptée, comme sur ordinateur (cas LOC-018). | captures/loc-112-identite-iphone.png |
| LOC-113 | iphone | Marié : contrat de mariage selon le régime (iPhone) | OK | Communauté universelle → ["Pièce d'identité *","Contrat de mariage *"] ; célibataire → ["Pièce d'identité *"] ; communauté réduite → ["Pièce d'identité *"] ; séparation de biens → ["Pièce d'identité *","Contrat de mariage *"] ; en base à la fin : MARIE / SEPARATION_DE_BIENS ; débordement : non | captures/loc-113-pieces-marie-iphone.png |
| LOC-114 | iphone | Régime matrimonial après retour à « célibataire » (seconde reproduction) | KO (mineur, staging) | En base après le passage à célibataire : CELIBATAIRE / régime COMMUNAUTE_UNIVERSELLE |  |
| LOC-115 | iphone | Envoi refusé sans contrat de mariage ; dépôt des deux pièces depuis l'iPhone | OK | Refus : « Veuillez joindre tous les documents requis Contrat de mariage » ; pièces en base : ID_IDENTITY (recette-identite-loc4.pdf) → personne ; CONTRAT_DE_MARIAGE (recette-contrat-mariage-loc4.pdf) → client | captures/loc-115-refus-sans-contrat-iphone.png |

### Espace locataire — reconfirmation des conditions

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-120 | ordinateur | Changement du seul jour de paiement : l'accord du locataire est conservé | OK | Équipe : message ["Jour de paiement enregistré"], mention sur la fiche « Attente locataire ». Base : jour 10, confirmation demandée : null, accord toujours daté du 2026-11-16T19:19:13.794Z, lignes d'historique : 0. Locataire : « à renouveler » visible : false ; jour affiché : « Le 10 de chaque mois ». | captures/loc-120-jour-paiement-seul.png |
| LOC-121 | ordinateur | Changement du loyer par l'équipe : l'accord du locataire est invalidé et archivé | OK | Avertissement à l'équipe avant d'enregistrer : « aucune fenêtre » ; message ["Loyer hors charges enregistré"] ; mention sur la fiche : « Attente locataire ». Base : loyer 620, accord : null, confirmation demandée le 2026-11-16T21:56:35.875Z. Dernière ligne d'historique : locataire « Jules LocataireLOC5 », accord du 2026-11-16T19:19:13.794Z, motif TERMS_CHANGED, changements [{"after":620,"field":"rentAmount","befor… | captures/loc-equipe-apres-rentamount.png |
| LOC-123 | ordinateur | « Confirmation à renouveler » dans « À faire » et sur la ligne du bail | OK | Synthèse : « Bonjour Locataire — 1 chose vous attend » ; compteurs en cours / à faire / signés : 1 / 1 / 0 ; « À faire maintenant » avec « Confirmation à renouveler » : true ; « Relire et confirmer » : true ; lignes du tableau de bord : « Logement recette LOC 5 — Les conditions du bail ont été mises à jour : relisez-les et confirmez votre accord. // Logement recette LOC 5 — Confirmation à renouveler · Léa ProprioL… | captures/loc-123-a-faire-ordinateur.png |
| LOC-124 | ordinateur | Page du bail : carte « Votre confirmation est à renouveler », bouton inactif sans la case | OK | Arrivée sur la page du bail : true ; phrase : « Je confirme le loyer de 620,00 € par mois, les charges de 50,00 € par mois, le dépôt de garantie de 600,00 € et l'entrée dans les lieux le 01/02/2027. » ; loyer affiché dans « Le bail » : 620,00 € ; bouton inactif sans la case : true | captures/loc-124-carte-reconfirmation-ordinateur.png |
| LOC-125 | ordinateur | Reconfirmation par le locataire : nouvel accord enregistré | OK | Bouton actif après la case : true ; message : ["Merci, votre confirmation est enregistrée."] ; carte encore affichée : false ; base : accord le 2026-11-17T02:05:30.018Z, loyer confirmé 620, confirmation en attente : null ; tableau de bord : « Bonjour Locataire — 1 bail en cours — rien à faire de votre côté », « à renouveler » encore visible : false | captures/loc-125-confirmation-enregistree.png |
| LOC-126 | telephone | Reconfirmation sur téléphone : « À faire », carte et bouton | OK | « À faire » avec « Confirmation à renouveler » : true ; débordement tableau de bord : false, page du bail : false  ; phrase : « Je confirme le loyer de 620,00 € par mois, les charges de 55,00 € par mois, le dépôt de garantie de 600,00 € et l'entrée dans les lieux le 01/02/2027. » ; bouton inactif : true, largeur 346 px sur 412 | captures/loc-126-carte-telephone.png |
| LOC-127 | telephone | Conditions modifiées pendant que le locataire relit : confirmation refusée | OK | Message : ["Les conditions du bail viennent d'être modifiées : relisez-les avant de confirmer."] ; accord en base : null ; phrase après rafraîchissement : « Je confirme le loyer de 630,00 € par mois, les charges de 55,00 € par mois, le dépôt de garantie de 600,00 € et l'entrée dans les lieux le 01/02/2027. » ; case décochée : true | captures/loc-127-conditions-modifiees-entre-temps.png |
| LOC-128 | telephone | Reconfirmation depuis le téléphone et historique des accords | OK | Message : ["Merci, votre confirmation est enregistrée."] ; base : accord le 2026-11-17T02:07:30.322Z, conditions confirmées loyer 630 / charges 55 ; historique : 2 ligne(s) — TERMS_CHANGED ["rentAmount 600→620"] ; TERMS_CHANGED ["monthlyCharges 50→55"] | captures/loc-128-confirmation-telephone.png |
| LOC-129 | iphone | Reconfirmation sur iPhone après un changement du dépôt de garantie | OK | Dépôt en base 610, confirmation demandée : true (équipe : ["Dépôt de garantie enregistré"]) ; « À faire » sur iPhone : true ; débordement : tableau de bord false, page false ; phrase : « Je confirme le loyer de 630,00 € par mois, les charges de 55,00 € par mois, le dépôt de garantie de 610,00 € et l'entrée dans les lieux le 01/02/2027. » ; bouton inactif sans la case : true ; message : ["Merci, votre confirmation … | captures/loc-129-carte-iphone.png |

### Droits d'accès

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-130 | ordinateur | Le locataire ne peut pas ouvrir le bail d'un autre | OK | Adresse finale /client/locataire/baux/<bail 6> ; page « 404 » ; donnée du dossier 6 visible : false | captures/loc-130-bail-d-un-autre.png |
| LOC-131 | ordinateur | Le locataire n'accède ni à l'espace propriétaire, ni à l'interface de l'équipe, ni à l'espace notaire | OK | propriétaire → /client/locataire ; propriétaire — baux → /client/locataire ; équipe → /login ; équipe — fiche du dossier 7 → /login ; notaire → /notaire/login ; création de bail → /client/locataire ; identifiant de bail inexistant → « 404 » | captures/loc-131-autres-espaces.png |
| LOC-132 | ordinateur | Le formulaire d'un autre locataire reste fermé avec une session locataire | OK | Dossier 3 : écran de code : true, avertissement « autre compte » : true, formulaire visible : false ; dossier 5 : « Formulaire déjà soumis », nom du locataire visible : false |  |
| LOC-134 | ordinateur | Sans session : espace locataire fermé ; pages annexes du formulaire | OK | Bail sans session → /client/login ; page de succès du dossier 1 sans session : affichée (true), nom complet du locataire visible : false ; page d'attente du dossier 3 sans session : « Merci Client, rien n'est perdu. Il reste à terminer le formulaire pour que nous puissions traiter votre demande. », adresse e-mail complète visible : false | captures/loc-134-succes-sans-session.png |
| LOC-150 | telephone | Le locataire ne peut pas ouvrir la demande d'un autre | OK | Adresse finale : /client/locataire ; donnée de l'autre dossier visible : false | captures/loc-150-demande-d-un-autre.png |
| LOC-170 | ordinateur | Le locataire ne peut pas ouvrir la demande d'un autre | OK | Adresse finale : /client/locataire ; donnée de l'autre dossier visible : false | captures/loc-170-demande-d-un-autre.png |
| LOC-174 | ordinateur | Le locataire ne peut ouvrir ni une pièce archivée ni la pièce d'un autre | OK | Pièce archivée → HTTP 403 ; pièce en cours → HTTP 200 ; pièce du locataire du dossier 6 → HTTP 403 |  |

### Demandes de complément — demande du notaire (dossier 6)

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-140 | ordinateur | Création d'une demande par le notaire : une pièce à refaire et deux informations | OK | Bouton d'aperçu : « Voir l'e-mail · 1 pièce et 2 informations » ; message : ["Demande envoyée E-mail envoyé à recette-loc-locataire6@example.invalid"] ; en base : demande OPEN, origine NOTAIRE, destinataire recette-loc-locataire6@example.invalid, par « Maître Recette LOC 1 » ; lignes : pièce « Pièce d'identité de Nathan LocataireLOC6 » (ILLEGIBLE, note) ; information « Profession de Nathan LocataireLOC6 » (WRONG_V… | captures/loc-140-apercu-email-notaire.png |
| LOC-142 | telephone | Lien de l'e-mail et « À faire » : la demande arrive dans l'espace locataire | OK | Sans session → /client/login?next=%2Fclient%2Fdemande%2F<id> ; connecté → /client/locataire/demande/<id> ; débordement de la page : false ; tableau de bord : « À FAIRE · DEMANDE DU NOTAIRE », compteurs 1 / 1 / 0 | captures/loc-142-a-faire-notaire.png |
| LOC-143 | telephone | Page de la demande : contenu et envoi bloqué au départ | OK | Titre : « Demande du notaire » ; « 1 pièce et 2 informations à compléter » ; motifs : À corriger, À confirmer, Illisible ; précision affichée : true ; profession préremplie : « Testeur » ; compteur : « 0 / 3 prêt » ; « Encore 3 éléments avant l'envoi. » ; bouton d'envoi inactif : true ; débordement : false | captures/loc-143-demande-ouverte-telephone.png |
| LOC-144 | telephone | Réponse à une information « à corriger » (profession) | OK | Réponse vide : compteur inchangé : true, message « La profession est requise » ; correction : message ["Réponse enregistrée Elle sera vérifiée par notre équipe après l'envoi de la demande."], compteur « 1 / 3 prêt » ; ligne en base : {"kind":"FIELD","documentKind":null,"fieldKey":"person.profession","label":"Profession de Nathan LocataireLOC6","reason":"WRONG_VALUE","status":"PROVIDED","providedValue":{"persons.0.… | captures/loc-144-profession-telephone.png |
| LOC-145 | telephone | Réponse « situation familiale » : marié en séparation de biens → contrat de mariage ajouté de lui-même | OK | Statuts proposés : ["Célibataire","Marié(e)","Divorcé(e)","Veuf / veuve","Pacsé(e)"] ; régimes : ["Communauté réduite aux acquêts","Séparation de biens","Participation aux acquêts","Communauté universelle"] ; message ["Réponse enregistrée Avec cette réponse, il faut aussi : Contrat de mariage. Elle est ajoutée à votre demande."] ; compteur « 2 / 4 prêts » ; pièce ajoutée en base : « Contrat de mariage » (CONTRAT_D… | captures/loc-145-situation-piece-ajoutee-telephone.png |
| LOC-146 | telephone | Dépôt des pièces ; envoi bloqué tant qu'il manque un élément | OK | Zones de dépôt : 2 ; après la pièce d'identité : « 3 / 4 prêts », « Encore 1 élément avant l'envoi. », bouton inactif : true ; après la seconde pièce : « 4 / 4 prêts », bouton actif : true ; lignes en base : Pièce d'identité = PROVIDED ; Profession = PROVIDED ; Situation familiale = PROVIDED ; Contrat de mariage = PROVIDED | captures/loc-146-envoi-bloque-telephone.png |
| LOC-147 | telephone | Envoi de la réponse au notaire | OK | Fenêtre de confirmation : « aucune » ; message : [] ; base : demande SUBMITTED, envoyée le 2026-11-17T02:12:33.850Z ; lignes : PROVIDED, PROVIDED, PROVIDED, PROVIDED ; écran après envoi : « Merci, c'est bien reçu » | captures/loc-147-apres-envoi-telephone.png |
| LOC-148 | telephone | Après l'envoi, la réponse n'est plus modifiable | OK | Adresse après réouverture : /client/locataire/demande/<id> ; éléments modifiables restants : {"champs":0,"listes":0,"fichiers":0,"enregistrer":0,"envoyer":0} ; texte : « Merci, c'est bien reçu » ; débordement : false | captures/loc-148-reouverture-apres-envoi-telephone.png |
| LOC-149 | telephone | Après l'envoi : tableau de bord à jour et destinataire prévenu | OK | Tableau de bord : « Bonjour Locataire — 1 bail en cours — rien à faire de votre côté », compteurs 1 / 0 / 0, demande encore dans « À faire » : false ; e-mails : aucun ; tâches de fond : email/notification.send |  |

### Demandes de complément — demande de l'équipe (dossier 5)

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-160 | ordinateur | Création d'une demande par l'équipe : une pièce à refaire et deux informations | OK | Bouton d'aperçu : « Voir l'e-mail · 1 pièce et 2 informations » ; message : ["Demande envoyée E-mail envoyé à recette-loc-locataire5@example.invalid"] ; en base : demande OPEN, origine TEAM, destinataire recette-loc-locataire5@example.invalid, par « Équipe Recette LOC » ; lignes : pièce « Pièce d'identité de Jules LocataireLOC5 » (ILLEGIBLE, note) ; information « Profession de Jules LocataireLOC5 » (WRONG_VALUE) ;… | captures/loc-160-apercu-email-equipe.png |
| LOC-162 | ordinateur | Lien de l'e-mail et « À faire » : la demande arrive dans l'espace locataire | OK | Sans session → /client/login?next=%2Fclient%2Fdemande%2F<id> ; connecté → /client/locataire/demande/<id> ; débordement de la page : false ; tableau de bord : « À FAIRE · DEMANDE DE L'ÉQUIPE », compteurs 1 / 1 / 0 | captures/loc-162-a-faire-equipe.png |
| LOC-163 | ordinateur | Page de la demande : contenu et envoi bloqué au départ | OK | Titre : « Demande de l'équipe » ; « 1 pièce et 2 informations à compléter » ; motifs : À corriger, À confirmer, Illisible ; précision affichée : true ; profession préremplie : « Testeur » ; compteur : « 0 / 3 prêt » ; « Encore 3 éléments avant l'envoi. » ; bouton d'envoi inactif : true ; débordement : false | captures/loc-163-demande-ouverte-ordinateur.png |
| LOC-164 | ordinateur | Réponse à une information « à corriger » (profession) | OK | Réponse vide : compteur inchangé : true, message « La profession est requise » ; correction : message ["Réponse enregistrée Elle sera vérifiée par notre équipe après l'envoi de la demande."], compteur « 1 / 3 prêt » ; ligne en base : {"kind":"FIELD","documentKind":null,"fieldKey":"person.profession","label":"Profession de Jules LocataireLOC5","reason":"WRONG_VALUE","status":"PROVIDED","providedValue":{"persons.0.p… | captures/loc-164-profession-ordinateur.png |
| LOC-165 | ordinateur | Réponse « situation familiale » : pacsé → convention de PACS ajouté de lui-même | OK | Statuts proposés : ["Célibataire","Marié(e)","Divorcé(e)","Veuf / veuve","Pacsé(e)"] ; message ["Réponse enregistrée Avec cette réponse, il faut aussi : Convention de PACS. Elle est ajoutée à votre demande."] ; compteur « 2 / 4 prêts » ; pièce ajoutée en base : « Convention de PACS » (CONTRAT_DE_PACS, PENDING, clé auto:person.family) ; affichée : true ; fiche de la personne : CELIBATAIRE / null ; bouton d'envoi in… | captures/loc-165-situation-piece-ajoutee-ordinateur.png |
| LOC-166 | ordinateur | Dépôt des pièces ; envoi bloqué tant qu'il manque un élément | OK | Zones de dépôt : 2 ; après la pièce d'identité : « 3 / 4 prêts », « Encore 1 élément avant l'envoi. », bouton inactif : true ; après la seconde pièce : « 4 / 4 prêts », bouton actif : true ; lignes en base : Pièce d'identité = PROVIDED ; Profession = PROVIDED ; Situation familiale = PROVIDED ; Convention de PACS = PROVIDED | captures/loc-166-envoi-bloque-ordinateur.png |
| LOC-167 | ordinateur | Envoi de la réponse à l'équipe | OK | Fenêtre de confirmation : « aucune » ; message : [] ; base : demande SUBMITTED, envoyée le 2026-11-17T02:16:43.405Z ; lignes : PROVIDED, PROVIDED, PROVIDED, PROVIDED ; écran après envoi : « Merci, c'est bien reçu » | captures/loc-167-apres-envoi-ordinateur.png |
| LOC-168 | ordinateur | Après l'envoi, la réponse n'est plus modifiable | OK | Adresse après réouverture : /client/locataire/demande/<id> ; éléments modifiables restants : {"champs":0,"listes":0,"fichiers":0,"enregistrer":0,"envoyer":0} ; texte : « Merci, c'est bien reçu » ; débordement : false | captures/loc-168-reouverture-apres-envoi-ordinateur.png |
| LOC-169 | ordinateur | Après l'envoi : tableau de bord à jour et destinataire prévenu | OK | Tableau de bord : « Bonjour Locataire — 1 bail en cours — rien à faire de votre côté », compteurs 1 / 0 / 0, demande encore dans « À faire » : false ; e-mails : aucun ; tâches de fond : email/notification.send |  |
| LOC-172 | ordinateur | L'équipe accepte la réponse du locataire et archive l'ancienne pièce | OK | Fenêtre d'archivage : « Anciennes pièces à retirer des pièces actives Cochez celles que la nouvelle pièce remplace. Elles sont archivées : le fichier est conservé et vous pourrez toujours le rouvrir. Sans rien cocher, toutes restent actives. recette-identite-locataire-loc-5.pdf · reçue le 16/11 visée par la demande Voir Annuler Accepter et archiver 1 a (ancienne pièce cochée d'avance : false) » ; « Tout accepter »… | captures/loc-172-equipe-reponse-recue.png |
| LOC-173 | ordinateur | Mes informations après acceptation : valeurs et pièces à jour | OK | Profession affichée : true ; situation : « Pacsé(e) » ; nouvelle pièce listée : true ; convention de PACS listée : true ; ancienne pièce listée : false | captures/loc-173-informations-a-jour.png |

### Messagerie avec le notaire (dossier 6)

| Cas | Appareil | Vérification | Statut | Constaté | Capture |
| --- | --- | --- | --- | --- | --- |
| LOC-180 | ordinateur | Envoyer un message au notaire | OK | Fenêtre de messagerie ouverte : true ; envoi inactif sans texte : true ; message affiché dans le fil : true ; en base : 1 nouveau(x) message(s), dernier : rôle UTILISATEUR, « Bonjour Maître, pouvez-vous me confirmer la date de signatur… » | captures/loc-180-message-envoye.png |
| LOC-181 | ordinateur | Joindre un fichier dans la messagerie | OK | Messages après le dépôt : [] ; nom du fichier visible dans le fil : true ; en base : 1 message(s) avec pièce (recette-message-loc6.pdf / type MESSAGE) | captures/loc-181-fichier-joint.png |
| LOC-182 | ordinateur | Le notaire lit le message et le fichier du locataire, et répond | OK | Message du locataire visible côté notaire : true ; fichier visible : true ; réponse enregistrée en base : true | captures/loc-182-notaire-repond.png |
| LOC-183 | telephone | Réponse du notaire lue sur téléphone ; annonce sur le tableau de bord | OK | Annonce sur le tableau de bord : « aucune » ; messagerie ouverte par le lien ?chat=1 : true ; réponse du notaire visible : true ; fenêtre dans l'écran : true, débordement : false ; notifications capturées : email/chat-message.send, email/chat-message.send, email/chat-message.send Analyse : le bloc « Votre notaire vous a écrit » du tableau de bord ne concerne que les demandes du notaire, pas un simple message ; le … | captures/loc-182-messagerie-telephone.png |

## 4. Observations (hors défauts)

- Jeton de formulaire inexistant : la page « 404 — Page introuvable » s'affiche bien, mais le code HTTP renvoyé est 200. Sans effet pour l'utilisateur.
- Écran du code du formulaire : après un code refusé, les six chiffres restent dans le champ ; un clic sur « Recevoir mon code » dans la toute première seconde (avant que la page soit interactive) recharge la page sans envoyer de code. Trois envois au plus par lien et par quart d'heure ; un ancien code est refusé après un renvoi.
- Les deux écrans de code ne se comportent pas pareil : celui du formulaire vérifie le code dès le sixième chiffre, celui de /client/login attend un appui sur « Se connecter ». Les messages de /client/login parlent de « Code OTP ».
- /client/login avec une adresse inconnue répond « Aucun compte trouvé pour cet email » : cela permet de savoir si une adresse a un compte.
- L'e-mail du code dit « Bonjour Client » tant que le nom n'est pas saisi et parle d'« espace client » alors que le code ouvre un formulaire.
- Tableau de bord : le titre est « Bonjour Locataire » pour les comptes préparés en base (il reprend le nom du compte, pas le prénom de la personne). Non vérifié pour un compte né d'un vrai parcours.
- Étape 1 du formulaire : le bloc « Les informations du bail » est replié par défaut ; le loyer est toutefois redemandé en clair dans la case de confirmation. Cette case ne cite pas le dépôt de garantie alors que l'accord enregistré le contient ; la carte de reconfirmation, elle, le cite.
- Nationalité : recliquer sur la nationalité déjà choisie la désélectionne.
- Étape 4 : les boutons d'une pièce déposée (œil, téléchargement, croix) et la corbeille d'une seconde personne n'ont pas de nom accessible.
- Seconde personne déclarée pacsée ou mariée : aucune convention ni contrat demandé, la règle ne regarde que la personne principale (choix assumé dans `lib/rules/dossier-rules.ts`).
- Recherche SIREN : elle interroge l'annuaire public des entreprises depuis le serveur ; ce n'est pas doublé par le montage. Seul un numéro d'établissement public a été envoyé.
- Fiche équipe : après un changement de loyer aucun avertissement ne prévient l'opérateur que l'accord du locataire va être invalidé ; la fiche affiche ensuite « Attente locataire ».
- E-mail d'une demande du notaire : même texte que celui de l'équipe (« nous avons besoin… »), rien n'indique que la demande vient du notaire ; la page de la demande, elle, est titrée « Demande du notaire ».
- Un simple message du notaire n'apparaît pas dans « À faire » du tableau de bord (seules ses demandes y figurent) ; le locataire est prévenu par e-mail.
- Après la réponse du locataire à une demande, la notification préparée s'adresse à toute l'équipe.
- « Mes informations » : téléphone affiché sans espaces (« +33612345679 ») alors que l'espace notaire le formate.
- Safari (WebKit) : la console signale des feuilles de style refusées par la politique de sécurité du contenu (« style-src ») sur le formulaire ; aucun effet visible sur les captures.
- Lenteur : chaque enregistrement prend 3 à 8 secondes sur ce montage ; quelques réponses 500 isolées (page d'un bail, enregistrement du formulaire) ont coïncidé avec des coupures de la base distante et n'ont pas été reproduites.

## 5. Non testé

- Pièces et envoi du formulaire d'une entreprise locataire (Kbis, statuts) : inaccessibles à cause du blocage de l'étape 3 (LOC-056).
- Dépôt d'un fichier d'un type refusé ou trop lourd : le règlement n'autorise que les fichiers `recette-…` PDF et PNG de la bibliothèque.
- Modification directe de « Mes informations » : la fonction n'existe pas (écran en lecture seule, LOC-175).
- E-mail d'invitation initiale du locataire : les dossiers ont été préparés en base, aucun e-mail d'invitation n'a été émis pendant la campagne ; seuls les e-mails de code, de demande et les notifications d'envoi ont été relus.
- Contenu rendu des e-mails différés (confirmation d'envoi, notification au propriétaire) : le montage capture la tâche mais ne l'exécute pas ; seules leurs données ont été relues.
- Messagerie en temps réel : non disponible sur le montage (rechargement de la page à la place).
- Reconfirmation après remplacement du locataire (« Changer de locataire… ») : non déroulée faute de temps ; seuls les changements de conditions l'ont été.
- Relances automatiques des demandes de complément : tâches de fond non exécutées par le montage.

## 6. Données créées

- Comptes créés par la barrière de code : `recette-loc-locataire1@`, `…2@`, `…3@`, `…4@example.invalid` (rattachés aux dossiers 1 à 4).
- Dossier 1 : formulaire soumis (« Jeanne Recette-Seule »), pièce `recette-identite-loc1-photo.png` ; la pièce `recette-identite-loc1.pdf` a été supprimée pendant le test.
- Dossier 2 : formulaire soumis, deux personnes (« Karim Recette-Duo », « Lina Recette-Duo » avec l'adresse `recette-loc-locataire2b@example.invalid`), pièces `recette-identite-loc2-karim.pdf` et `recette-identite-loc2-lina.png`.
- Dossier 3 : client passé en « entreprise », sans fiche société ; formulaire toujours en attente.
- Dossier 4 : formulaire soumis (« Nora Recette-Mariee », mariée, séparation de biens), pièces `recette-identite-loc4.pdf` et `recette-contrat-mariage-loc4.pdf`.
- Dossier 5 : jour de paiement, loyer, charges et dépôt modifiés plusieurs fois par l'équipe ; plusieurs lignes dans `BailTenantAgreementHistory` ; accord reconfirmé ; une demande de complément de l'équipe, répondue puis acceptée (profession « Testeur principal », situation « pacsé », pièces `recette-identite-refaite-loc5.pdf` et `recette-convention-pacs-loc5.pdf`, ancienne pièce d'identité archivée).
- Dossier 6 : une demande de complément du notaire, répondue (profession « Testeur principal », marié en séparation de biens, pièces `recette-identite-refaite-loc6.pdf` et `recette-contrat-mariage-loc6.pdf`) ; messages de test dans la messagerie et pièce `recette-message-loc6.pdf`.
- Sessions de test créées pour les comptes `recette-loc-…` (expirent d'elles-mêmes).
