# Recette PRO-M — Propriétaire sur téléphone

Agent : PRO-M · serveur testé : http://localhost:3210 (branche `codex/prep-pr-main`) · appareils : téléphone Android (Pixel 7, Chromium), iPhone 13 (WebKit), petit écran (iPhone SE).

Dernière mise à jour : 17/11/2026 08:16:36 — 156 cas enregistrés dans `resultats.json`.

> Rapport final. Appareils réellement pilotés : téléphone Android (Pixel 7, 412 × 839 px, Chromium), iPhone 13 (390 × 664 px, moteur WebKit de Safari) et « petit écran » (iPhone SE de Playwright : 320 × 568 px, donc plus étroit encore que les 375 px annoncés).

## 1. Synthèse

**Ce qui marche.** Tout le parcours propriétaire va au bout sur téléphone. Création d'un dossier depuis le site avec un compte neuf : accueil et menu, connexion par code (clavier numérique, collage, renvoi), formulaire en 13 étapes pour une société (SIREN, copropriété et syndic, bail meublé d'un an, mobilier, locataire et dates, pièces) sur Android, et pour un particulier (nationalité, date de naissance, maison, bail nu) sur iPhone, jusqu'au paiement Stripe réel en mode test (carte refusée puis acceptée) dans les deux navigateurs, dossier soumis en base. Espace client : tableau de bord, barre du bas, dossiers et détail de chaque statut, ajout du locataire, ajout d'un bien, nouveau dossier (habitation jusqu'au paiement, ouverture du questionnaire commercial), réponse à une demande de l'équipe (une information et une pièce), messagerie avec pièce jointe, aperçu, bulle « Support », déconnexion et reconnexion par code. Aucun défilement horizontal sur aucun des écrans, y compris à 320 px ; toutes les fenêtres tiennent dans l'écran.
**Nouveautés de la branche vérifiées, sans défaut.** La date de prise d'effet et le jour de paiement sont demandés et exigés dès qu'un locataire est indiqué (étape « Locataire » du formulaire, fenêtre « Ajouter un locataire » de l'espace, étape « Dates » du nouveau dossier) et ne sont pas demandés sans locataire (paiement numéroté 4/4, flèche retour cohérente).
**Ce qui ne marche pas.** Neuf cas en échec et huit partiels, tous dans du code identique à staging. Quatre défauts majeurs : refus du serveur affichés en anglais technique (e-mail du locataire, trois écrans) ; paiement proposé alors qu'une pièce obligatoire vient d'être supprimée ; n'importe quel type de fichier accepté comme pièce ; bouton « retour » du téléphone qui fait quitter le formulaire. Le reste : contrôles de saisie manquants (téléphone de la société, e-mail du syndic, date passée) et ergonomie tactile (bulle « Support » sur des boutons, petites icônes sans intitulé, suppression sans confirmation, double toucher à l'étape du loyer, codes internes dans une liste).
**Verdict.** Rien de bloquant et rien d'imputable à la branche `codex/prep-pr-main` : elle peut partir. Les quatre défauts majeurs existent déjà sur staging et arriveront donc en production avec la fusion ; les deux premiers (message en anglais, paiement d'un dossier incomplet) méritent une correction rapide.

| Rôle | Appareil | Cas | OK | KO | Partiels | Non testés |
|---|---|---:|---:|---:|---:|---:|
| Visiteur | telephone | 10 | 10 | 0 | 0 | 0 |
| Visiteur | iphone | 13 | 11 | 1 | 1 | 0 |
| Visiteur | petit | 2 | 2 | 0 | 0 | 0 |
| Propriétaire | telephone | 90 | 72 | 8 | 5 | 5 |
| Propriétaire | iphone | 29 | 25 | 0 | 2 | 2 |
| Propriétaire | petit | 12 | 11 | 0 | 0 | 1 |
| **Total** | | **156** | **131** | **9** | **8** | **8** |

## 2. Défauts, du plus grave au plus bénin

### D1. Les refus du serveur s'affichent en anglais technique (« An error occurred in the Server Components render… »)

- **Gravité** : majeur · **Origine** : staging · **Appareil(s)** : téléphone (comportement du serveur, indépendant de l'appareil) · **Cas** : PRO-M-044, PRO-M-045, PRO-M-077, PRO-M-078
- **Pour le reproduire** : (1) Formulaire propriétaire, étape « Locataire » : saisir comme e-mail du locataire « locataire-sans-arobase », ou l'adresse du propriétaire lui-même, ou celle d'un autre client ; date et jour valides ; « Continuer ». (2) Espace client, dossier sans locataire, « Ajouter le locataire » : mêmes adresses avec une date et un jour.
- **Attendu** : Un message en français : « Email du locataire invalide » ou « Cet email est déjà utilisé… ».
- **Constaté** : L'enregistrement est bien refusé, mais la notification rouge affiche « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details… ». Le propriétaire ne peut pas comprendre quoi corriger. Reproduit six fois, sur deux écrans, avec une réponse 500 du serveur à chaque fois.
- **Capture** : `captures/a45-locataire-adresse-deja-utilisee.png`, `captures/a44-locataire-email-invalide.png`, `captures/b78-ajout-locataire-adresse-proprietaire.png`
- **Code soupçonné** : lib/actions/clients.ts (« throw new Error("Cet email est déjà utilisé…") », lignes 1085 et 1111) et la validation du schéma dans les actions d'enregistrement : en version de production, Next.js remplace le texte d'une erreur levée par une action serveur. Il faut renvoyer `{ error: "…" }` (modèle décrit dans CLAUDE.md) au lieu de lever une erreur. Côté écran : components/intakes/owner-intake-form.tsx (affiche `error.message` ; aucun contrôle du format de l'e-mail du locataire avant l'envoi, getRequiredFields("tenant") est vide) et components/client-v2/add-tenant-dialog.tsx (ligne 68). Lignes non modifiées par la branche. Le même mécanisme touche vraisemblablement tous les refus levés par les actions serveur.

### D2. Le paiement s'ouvre alors qu'une pièce obligatoire vient d'être supprimée

- **Gravité** : majeur · **Origine** : staging · **Appareil(s)** : téléphone · **Cas** : PRO-M-060
- **Pour le reproduire** : Étape « Documents » : déposer toutes les pièces, supprimer le Kbis avec la corbeille (la ligne disparaît, 0 Kbis en base), attendre quelques secondes, « Continuer vers le paiement ».
- **Attendu** : Refus « Veuillez joindre tous les documents requis : Kbis », comme lorsque rien n'a été déposé (PRO-M-052).
- **Constaté** : L'étape « Paiement » s'ouvre, le cadre de carte se charge, « Payer 39,90 € » est proposé : un dossier incomplet peut être payé. Reproduit deux fois, dans deux sessions distinctes. La suite (payer dans cet état) n'a volontairement pas été tentée.
- **Capture** : `captures/a60-documents-sans-kbis.png`, `captures/a60-paiement-atteint-sans-kbis.png`
- **Code soupçonné** : components/intakes/owner-intake-form.tsx, fonction validateDocuments (ligne 1300) et hasDocument : une pièce supprimée reste comptée comme présente ; voir aussi le cache de components/intakes/document-uploaded.tsx (`tokenDocumentsData`). Non modifié par la branche sur ce point.

### D3. Dépôt de pièces : tous les types de fichier sont acceptés (.txt, .zip)

- **Gravité** : majeur · **Origine** : staging · **Appareil(s)** : téléphone · **Cas** : PRO-M-054
- **Pour le reproduire** : Étape « Documents », zone « Statuts » : envoyer `recette-mauvais-format.txt` puis `recette-archive.zip`.
- **Attendu** : Refus (« format non accepté : PDF, DOC, DOCX, JPG, PNG »), rien d'enregistré.
- **Constaté** : « Fichier uploadé avec succès » dans les deux cas ; les deux fichiers sont enregistrés comme « Statuts » (text/plain et application/zip) et comptent comme pièce fournie. Le filtre n'existe que dans la fenêtre de choix du fichier (attribut `accept`), contournable (« Tous les fichiers », glisser-déposer). Aucune limite de taille n'apparaît non plus dans le code.
- **Capture** : `captures/a54-mauvais-format.png`
- **Code soupçonné** : components/ui/file-upload.tsx (processFiles ne contrôle ni l'extension ni le type) ; app/api/blob/generate-upload-token/route.ts et app/api/documents/create/route.ts (aucun contrôle du type ni de la taille). Fichiers identiques à staging.

### D4. Le bouton « retour » du téléphone fait quitter le formulaire au lieu de revenir à l'étape précédente

- **Gravité** : majeur · **Origine** : staging · **Appareil(s)** : téléphone (vaut pour tout navigateur) · **Cas** : PRO-M-013
- **Pour le reproduire** : Arriver sur le formulaire propriétaire depuis une page du site, avancer de plusieurs étapes, utiliser le bouton ou le geste « retour » du téléphone.
- **Attendu** : Retour à l'étape précédente du formulaire.
- **Constaté** : Le navigateur revient à la page d'avant (/commencer) : le formulaire est quitté. Rien n'est perdu des étapes validées, et la flèche en haut à gauche du formulaire revient bien d'une étape ; mais sur téléphone le geste « retour » est le réflexe naturel. Reproduit deux fois (étape 2 puis étape 11).
- **Capture** : `captures/a13-retour-navigateur.png`
- **Code soupçonné** : components/intakes/owner-intake-form.tsx : les étapes ne sont pas inscrites dans l'historique du navigateur (ni `history.pushState` ni écoute de « popstate »).

### D5. Société : un téléphone manifestement faux (« +33 12 ») est accepté et enregistré

- **Gravité** : mineur · **Origine** : staging · **Appareil(s)** : téléphone · **Cas** : PRO-M-022
- **Pour le reproduire** : Formulaire propriétaire, « Entreprise », saisie manuelle de la société, téléphone « +33 12 », « Continuer ».
- **Attendu** : Refus avec « Numéro de téléphone invalide », comme pour une personne physique.
- **Constaté** : L'étape est validée et « +3312 » est enregistré en base (table Entreprise). Reproduit deux fois.
- **Capture** : `captures/a22-telephone-invalide.png`
- **Code soupçonné** : lib/zod/client.ts, schéma « entreprise.phone » (vers la ligne 642) : seulement min(1)/max(15), sans le contrôle isValidPhoneNumberSafe appliqué aux personnes.

### D6. Copropriété : un e-mail de syndic mal formé est accepté et enregistré

- **Gravité** : mineur · **Origine** : staging · **Appareil(s)** : téléphone · **Cas** : PRO-M-035
- **Pour le reproduire** : Étape « Caractéristiques du bien », régime « Copropriété », nom du syndic rempli, e-mail « syndic sans arobase », « Continuer ».
- **Attendu** : Refus avec « Adresse e-mail invalide » (le notaire doit pouvoir écrire au syndic).
- **Constaté** : L'étape est validée ; la valeur est enregistrée telle quelle dans la fiche du bien. Reproduit deux fois (« syndic-pas-une-adresse », « syndic sans arobase »).
- **Capture** : `captures/a35-syndic-email-accepte.png`
- **Code soupçonné** : lib/zod/client.ts ligne 237 : « propertySyndicEmail: z.string().max(200).trim().optional() » sans .email() ; les demandes de complément, elles, contrôlent ce champ (lib/rules/complement-questions.ts ligne 473).

### D7. iPhone : la bulle « Support » recouvre une partie du bouton « Continuer » de /commencer (et d'autres boutons)

- **Gravité** : mineur · **Origine** : staging · **Appareil(s)** : iPhone ; aussi Android pour le bouton « Payer » · **Cas** : PRO-M-168, PRO-M-132
- **Pour le reproduire** : Sur iPhone 13 (390 × 664 px), ouvrir /commencer?bail=habitation sans faire défiler.
- **Attendu** : La bulle ne recouvre pas le bouton principal de l'écran.
- **Constaté** : La bulle (97 × 40 px) est posée sur la droite du bouton « Continuer » : 22 % de sa surface. Toucher cette zone ouvre le support au lieu de continuer. Même recouvrement sur la flèche du champ e-mail de l'accueil (a01-accueil-iphone.png), sur « Voir le déroulé » (Android) et sur le coin de « Payer 39,90 € » (a64-carte-refusee.png). La bulle se déplace à la main et se réduit avec sa croix, mais un visiteur ne le sait pas. Mesuré deux fois sur iPhone.
- **Capture** : `captures/a68-bulle-support-sur-continuer-iphone.png`, `captures/a04-commencer-commercial-iphone.png`, `captures/a01-accueil-iphone.png`
- **Code soupçonné** : components/contact-bubble.tsx (position fixe en bas à droite, `z-[60]`, au-dessus de tout le contenu y compris des fenêtres) ; identique à staging.

### D8. Pièces déposées : suppression immédiate sans confirmation, icônes de 32 px sans intitulé

- **Gravité** : mineur · **Origine** : staging · **Appareil(s)** : téléphone · **Cas** : PRO-M-058, PRO-M-059
- **Pour le reproduire** : Étape « Documents » du formulaire, toucher la corbeille à droite d'une pièce déposée.
- **Attendu** : Une demande de confirmation ; des boutons d'au moins 44 px avec un intitulé (« Voir », « Télécharger », « Supprimer »).
- **Constaté** : La pièce est supprimée au premier toucher (« Document supprimé avec succès »). Les trois icônes (œil, téléchargement, corbeille) font 32 × 32 px, sont espacées de 4 px et n'ont ni texte ni intitulé accessible. Quand plusieurs pièces sont empilées, le premier toucher sur l'œil déplie seulement la pile ; il faut toucher une seconde fois pour ouvrir l'aperçu. (Dans l'espace client, les mêmes boutons font 40 × 40 px et portent un intitulé : « Prévisualiser », « Télécharger ».)
- **Capture** : `captures/a56-toutes-les-pieces.png`, `captures/a59-kbis-supprime.png`
- **Code soupçonné** : components/documents/document-stack-list.tsx (boutons `h-8 w-8` sans `aria-label`, `onDelete` appelé directement) ; components/intakes/document-uploaded.tsx.

### D9. Étape « Le loyer » : il faut toucher « Continuer » deux fois

- **Gravité** : mineur · **Origine** : staging · **Appareil(s)** : téléphone, iPhone · **Cas** : PRO-M-119, PRO-M-039
- **Pour le reproduire** : Formulaire propriétaire, étape « Le loyer » (commune hors zone tendue) : saisir un montant, toucher « Continuer ».
- **Attendu** : Passage à « Charges & dépôt ».
- **Constaté** : Rien ne change à l'écran au premier toucher (20 secondes d'attente sur iPhone) ; le second toucher fait avancer. Vu sur Android puis sur iPhone.
- **Capture** : `captures/a38-loyer.png`
- **Code soupçonné** : components/rent/rent-rules-fields.tsx (le premier « Continuer » ne fait que valider la réponse à la question en cours) et components/intakes/owner-intake-form.tsx ligne 1937 (`rentAdvanceRef`). Non modifiés par la branche.

### D10. Date de prise d'effet dans le passé acceptée sans avertissement (bail déjà échu)

- **Gravité** : mineur · **Origine** : staging · **Appareil(s)** : téléphone · **Cas** : PRO-M-050
- **Pour le reproduire** : Étape « Locataire », date de prise d'effet 15/03/2020 pour un bail meublé d'un an.
- **Attendu** : Au moins un avertissement : le bail se terminerait le 15 mars 2021.
- **Constaté** : La phrase « Le bail se terminera le 15 mars 2021 » s'affiche sans remarque et la date est enregistrée. Si les baux déjà en cours sont voulus, un simple avertissement suffirait.
- **Capture** : `captures/a50-date-passee.png`
- **Code soupçonné** : components/ui/date-picker.tsx (années autorisées : de −120 à +30 ans) ; lib/zod/client.ts (aucune borne sur bailEffectiveDate).

### D11. Liste « Statut familial » du formulaire : codes internes affichés (CELIBATAIRE, MARIE, DIVORCE, VEUF, PACS)

- **Gravité** : cosmetique · **Origine** : staging · **Appareil(s)** : iPhone (indépendant de l'appareil) · **Cas** : PRO-M-114
- **Pour le reproduire** : Formulaire propriétaire, « Particulier », ouvrir la liste « Statut familial ».
- **Attendu** : « Célibataire », « Marié(e) », « Divorcé(e) », « Veuf(ve) », « Pacsé(e) ».
- **Constaté** : Les cinq choix sont les codes en capitales, sans accent.
- **Capture** : `captures/i14-identite-remplie-iphone.png`
- **Code soupçonné** : components/intakes/owner-intake-form.tsx ligne 3434 (`<SelectItem>{status}</SelectItem>`) ; les libellés existent dans lib/utils/person-labels.ts.

### D12. Erreur React n° 418 à l'ouverture du détail d'un dossier sur téléphone Android

- **Gravité** : cosmetique · **Origine** : inconnue · **Appareil(s)** : téléphone Android seulement · **Cas** : PRO-M-076
- **Pour le reproduire** : Espace propriétaire sur téléphone Android, ouvrir /client/proprietaire/baux/<id> en écoutant la console.
- **Attendu** : Aucune erreur JavaScript.
- **Constaté** : « Minified React error #418 » (le texte produit par le serveur diffère de celui du navigateur ; la page est redessinée, sans effet visible). Vu aux quatre passages sur Android, jamais sur iPhone ni sur petit écran. C'est la seule erreur JavaScript de toute la recette.
- **Capture** : `captures/b73-dossier-1.png`
- **Code soupçonné** : Non localisé (app/client/(protected)/proprietaire/baux/[id]/page.tsx et ses composants ; probablement un texte dépendant de l'appareil ou de l'heure).

## 3. Parcours vérifiés

### Accueil

| Cas | Appareil | Vérification | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| PRO-M-001 | telephone | Accueil mobile : barre de navigation et absence de défilement horizontal | OK | Logo visible, « Se connecter » visible, menu visible ; largeur page 412px / écran 412px | `captures/a01-accueil.png` |
| PRO-M-002 | telephone | Menu mobile : ouverture, liens, fermeture | OK | Menu ouvert sous la barre : Comment ça marche, Bail commercial, Visite guidée, Avantages, Tarif, FAQ, Simulateur, Blog, téléphone, « Constituer mon dossier » (10 liens de 354 px de large, cibles de 47 px de haut) ; la croix le re… | `captures/a02-menu-mobile.png` |
| PRO-M-003 | telephone | Champ « Ouvrez votre dossier » : bouton actif seulement avec une adresse valide | OK | Désactivé vide : true, désactivé adresse invalide : true, désactivé adresse valide : false ; type=email, inputmode=email, taille de police 16px | `captures/a03-accueil-champ-email.png` |
| PRO-M-004 | telephone | Badges « Bail d'habitation » et « Bail commercial » de l'accueil | OK | Commercial : « Propriétaires Votre bail notarié commercial commence ici ÉTAPE 1 / 3 Votre adresse e-mail Un code vous sera en » ; habitation (/commencer?bail=habitation) : « Propriétaires Votre bail notarié d'habitation commence … | `captures/a04-commencer-commercial.png` |
| PRO-M-101 | iphone | Accueil mobile : barre de navigation et absence de défilement horizontal | OK | Logo visible, « Se connecter » visible, menu visible ; largeur page 390px / écran 390px | `captures/a01-accueil-iphone.png` |
| PRO-M-102 | iphone | Menu mobile : ouverture, liens, fermeture | OK | Menu ouvert sous la barre, 45 liens visibles dont « Comment ça marche », « Tarif », « Blog », le téléphone et « Constituer mon dossier » ; bouton de fermeture présent ; refermé : oui ; débordement : non | `captures/a02-menu-mobile-iphone.png` |
| PRO-M-103 | iphone | Champ « Ouvrez votre dossier » : bouton actif seulement avec une adresse valide | OK | Désactivé vide : true, désactivé adresse invalide : true, désactivé adresse valide : false ; type=email, inputmode=email, taille de police 16px | `captures/a03-accueil-champ-email-iphone.png` |
| PRO-M-104 | iphone | Badges « Bail d'habitation » et « Bail commercial » de l'accueil | OK | Commercial : « Propriétaires Votre bail notarié commercial commence ici ÉTAPE 1 / 3 Votre adresse e-mail Un code vous sera en » ; habitation (/commencer?bail=habitation) : « Propriétaires Votre bail notarié d'habitation commence … | `captures/a04-commencer-commercial-iphone.png` |
| PRO-M-131 | iphone | iPhone — Accueil du site | OK | Écran 390×664 ; largeur de page 390px ; contenu attendu affiché : true ; éléments coupés : ["Coûts et tarification [353→516, conteneur défilant/masqué]","Sécurité et garanties [524→695, conteneur défilant/masqué]","Questions prat… | `captures/c131-accueil-du-site-iphone.png` |
| PRO-M-201 | petit | Petit écran 375 px — Accueil du site | OK | Écran 320×568 ; largeur de page 320px ; contenu attendu affiché : true ; éléments coupés : ["Bail d'habitation [-13→135, conteneur défilant/masqué]","Bail commercial NEW [143→333, conteneur défilant/masqué]","Le bail notarié [218… | `captures/c201-accueil-du-site-petit.png` |

### Connexion

| Cas | Appareil | Vérification | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| PRO-M-005 | telephone | /commencer : adresse e-mail mal formée refusée | OK | Message « Email invalide » sous le champ, on reste sur l'étape 1 | `captures/a05-commencer-email-invalide.png` |
| PRO-M-006 | telephone | Adresse saisie sur l'accueil : arrivée directe sur l'écran du code | OK | Écran du code affiché (URL /commencer) ; adresse rappelée : oui ; e-mails capturés : 1 (« [TEST] 998794 – votre code de connexion BailNotarie ») ; débordement : non | `captures/a06-ecran-code.png` |
| PRO-M-007 | telephone | Écran du code : clavier numérique et bouton visible sans défilement | OK | inputmode=numeric, autocomplete=one-time-code, longueur max 6, 6 cases ; bouton dans l'écran : oui | `captures/a06-ecran-code.png` |
| PRO-M-008 | telephone | Code incomplet et code erroné refusés | OK | Code de 3 chiffres : message « Le code doit contenir 6 chiffres » affiché ; code 000000 : « Code invalide Le code est incorrect. Veuillez vérifier et réessayer. » ; resté sur l'écran : oui | `captures/a08-code-faux.png` |
| PRO-M-009 | telephone | Renvoi du code de connexion | OK | E-mails avant : 1, après : 2 ; bouton : « Renvoyer dans 59s » (désactivé) | `captures/a09-code-renvoye.png` |
| PRO-M-010 | telephone | Collage du code reçu (avec texte et espace) puis connexion | OK | Valeur après collage : les 6 chiffres du code ; redirection vers /commencer/proprietaire/… : oui ; compte en base : {"role":"UTILISATEUR","emailVerified":true} | `captures/a10-arrivee-formulaire.png` |
| PRO-M-100 | iphone | Connexion par code à l'espace client (/client/login) avec un compte existant | OK | Sans session : renvoi vers /client/login ; page de connexion : largeur 390/390px, champ e-mail inputmode=email, police 16px ; adresse inconnue : « Erreur Aucun compte trouvé pour cet email » — écran : « Espace client Content de v… | `captures/b100-espace-apres-connexion-iphone.png` |
| PRO-M-105 | iphone | /commencer : adresse e-mail mal formée refusée | OK | Message « Email invalide » sous le champ, on reste sur l'étape 1 | `captures/a05-commencer-email-invalide-iphone.png` |
| PRO-M-106 | iphone | Adresse saisie sur l'accueil : arrivée directe sur l'écran du code | OK | Écran du code affiché (URL /commencer) ; adresse rappelée : oui ; e-mails capturés : 1 (« [TEST] 330503 – votre code de connexion BailNotarie ») ; débordement : non | `captures/a06-ecran-code-iphone.png` |
| PRO-M-107 | iphone | Écran du code : clavier numérique et bouton visible sans défilement | OK | inputmode=numeric, autocomplete=one-time-code, longueur max 6, 6 cases ; bouton dans l'écran : oui | `captures/a06-ecran-code-iphone.png` |
| PRO-M-108 | iphone | Code incomplet et code erroné refusés | OK | Code de 3 chiffres : message « Le code doit contenir 6 chiffres » affiché ; code 000000 : « Code invalide Le code est incorrect. Veuillez vérifier et réessayer. » ; resté sur l'écran : oui | `captures/a08-code-faux-iphone.png` |
| PRO-M-109 | iphone | Renvoi du code de connexion | OK | E-mails avant : 1, après : 2 ; bouton : « Renvoyer dans 59s » (désactivé) | `captures/a09-code-renvoye-iphone.png` |
| PRO-M-110 | iphone | Collage du code reçu (avec texte et espace) puis connexion | OK | Valeur après collage : les 6 chiffres du code ; redirection vers /commencer/proprietaire/… : oui ; compte en base : {"role":"UTILISATEUR","emailVerified":true} | `captures/a10-arrivee-formulaire-iphone.png` |
| PRO-M-132 | iphone | iPhone — Page /commencer (bail d'habitation) | Partiel | Écran 390×664 ; largeur de page 390px ; contenu attendu affiché : true ; part du bouton « Continuer » recouverte par la bulle « Support » : 22 % ; éléments coupés : [] ; erreurs JavaScript : aucune ; réponses 5xx : 0 | `captures/c132-page-commencer-bail-d-habitation--iphone.png` |
| PRO-M-168 | iphone | Bulle « Support » et bouton « Continuer » de la page /commencer | **KO** (mineur) | Écran 390×664 px ; bouton « Continuer » 310×56 px à y=503 ; bulle 97×40 px à x=241, y=512 ; part du bouton recouverte : 22 % ; centre du bouton recouvert : false ; bulle masquée par la croix : true Mesuré deux fois sur iPhone (au… | `captures/a68-bulle-support-sur-continuer-iphone.png` |
| PRO-M-202 | petit | Petit écran 375 px — Page /commencer (bail d'habitation) | OK | Écran 320×568 ; largeur de page 320px ; contenu attendu affiché : true ; part du bouton « Continuer » recouverte par la bulle « Support » : 0 % ; éléments coupés : [] ; erreurs JavaScript : aucune ; réponses 5xx : 0 | `captures/c202-page-commencer-bail-d-habitation--petit.png` |

### Formulaire

| Cas | Appareil | Vérification | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| PRO-M-011 | telephone | Étape « Type de bail » : valeur par défaut et bascule habitation / commercial | OK | « Habitation » présélectionné : true ; « Commercial » sélectionnable : true, parcours commercial en 15 étapes ; retour à « Habitation » : 12 étapes | `captures/a11-type-de-bail.png` |
| PRO-M-012 | telephone | Étape « Type de bail » sur téléphone : affichage et passage à la suite | OK | Largeur 412/412px, « Continuer » dans l'écran : true ; notification : ["Données enregistrées avec succès"] ; étape suivante : Type de client (2/12) | `captures/a11-type-de-bail.png` |
| PRO-M-013 | telephone | Geste « retour » du navigateur dans le formulaire | **KO** (majeur) | Le formulaire est QUITTÉ : le navigateur revient à la page d'avant (/commencer). Les étapes ne sont pas inscrites dans l'historique. Rien n'est perdu des étapes déjà validées ; en revenant sur le lien, le formulaire reprend à la … | `captures/a13-retour-navigateur.png` |
| PRO-M-014 | telephone | Reprise du formulaire après l'avoir quitté | OK | Reprise directe à l'étape « Caractéristiques du bien » (6/12). Remarque : tant que la société n'est pas enregistrée (étapes 1 et 2 seulement), le formulaire repart de l'étape 1, choix conservés. |  |
| PRO-M-015 | telephone | Flèche « retour » de l'en-tête du formulaire | OK | Étape affichée : Type de bail ; « Habitation » sélectionné : true |  |
| PRO-M-016 | telephone | Étape « Type de client » : choix « Entreprise » | OK | « Particulier » présélectionné : true ; après « Entreprise » : Informations client (3/12) ; largeur 412/412px, « Continuer » visible : true | `captures/a13-type-de-client.png` |
| PRO-M-017 | telephone | Société : « Continuer » sans numéro ni téléphone | OK | Étape inchangée ; messages : ["Le numéro d'enregistrement est requis","Le numéro de téléphone est requis","Données enregistrées avec succès"] | `captures/a17-societe-vide.png` |
| PRO-M-018 | telephone | Société : numéro SIREN mal formé | OK | 5 chiffres : aucun message (attente de la suite) ; 123456789 : « Ce numéro n'est pas valide, vérifiez-le. » ; saisie avec lettres conservée telle quelle : « 12345 ABC 678 » ; inputmode=numeric, police 16px | `captures/a18-siren-mal-forme.png` |
| PRO-M-019 | telephone | Société : numéro SIREN inexistant | OK | Message « Nous n'avons pas retrouvé cette société automatiquement. » + lien « Compléter les informations moi-même » ; pas de débordement : true | `captures/a19-siren-inexistant.png` |
| PRO-M-020 | telephone | Société : recherche réelle au registre et refus « Non, modifier le numéro » | OK | Carte « Est-ce bien votre société ? » affichée (société du registre public, non capturée) ; boutons « Oui » visible : true, « Non » présent : true ; pas de débordement : true ; après refus, champ vidé : true |  |
| PRO-M-021 | telephone | Société en saisie manuelle : champs obligatoires | OK | Étape inchangée ; messages : ["La raison sociale est requise","L'adresse est requise","Le numéro de téléphone est requis"] | `captures/a21-societe-manuelle-vide.png` |
| PRO-M-022 | telephone | Société : téléphone invalide refusé | **KO** (mineur) | Étape CHANGÉE ; messages : ["Données enregistrées avec succès"] ; champ type=tel, police 16px ; liste des pays : libellé « Phone number country », France = « France » | `captures/a22-telephone-invalide.png` |
| PRO-M-023 | telephone | Clavier affiché : le bouton « Continuer » reste visible | OK | En-tête et bouton « Continuer » restent fixes, le contenu défile au milieu. Le défilement automatique vers le champ actif est fait par le vrai navigateur à l'ouverture du clavier et ne se simule pas ici. La bulle « Support » reco… | `captures/a23-clavier-simule.png` |
| PRO-M-024 | telephone | Rotation en paysage sur l'étape société | OK | Paysage : largeur 839/839px, « Continuer » visible : true, raison sociale conservée : true | `captures/a24-paysage.png` |
| PRO-M-025 | telephone | Société en saisie manuelle : enregistrement | OK | Étape suivante : Récapitulatif (4/12) ; messages : ["Données enregistrées avec succès"] ; base : {"type":"PERSONNE_MORALE","completionStatus":"NOT_STARTED","legalName":"SCI Recette Prom Mobile","registration":"023456783","phone":… | `captures/a25-societe-remplie.png` |
| PRO-M-026 | telephone | Société : numéro d'une entreprise individuelle | OK | Encadré rouge « Ce numéro correspond à une entreprise individuelle : vous signez le bail en votre nom propre. Revenez à l'étape précédente et choisissez « Particulier ». » ; pas de carte de confirmation ; lien de saisie manuelle … | `captures/a26-entreprise-individuelle.png` |
| PRO-M-027 | telephone | Récapitulatif de la société | OK | Lignes : ["Entreprise SCI Recette Prom Mobile • recette-prom-nouveau1@example.inv"] ; déplié : «  Entreprise SCI Recette Prom Mobile • recette-prom-nouveau1@example.invalid Raison sociale SCI Recette Prom Mobile SIREN/SIRET 02345… | `captures/a27-recapitulatif-deplie.png` |
| PRO-M-028 | telephone | « Le bien » : champs obligatoires | OK | Étape inchangée ; messages : ["L'adresse du bien est requise","Le type de bien est requis","La surface est requise"] ; largeur 412/412px, « Continuer » visible : true | `captures/a28-le-bien-vide.png` |
| PRO-M-029 | telephone | « Le bien » : recherche d'adresse (Base Adresse Nationale) | OK | Sans résultat : « Aucune adresse trouvée » ; suggestions : 1 (Place Bonnyaud 23000 Guéret) ; liste dans la largeur de l'écran : true ; champ après choix : « Place Bonnyaud 23000 Guéret » | `captures/a29-adresse-suggestions.png` |
| PRO-M-030 | telephone | « Le bien » : surface nulle ou négative refusée, info-bulle au toucher | OK | Info-bulle : « Une maison est un immeuble individuel » ; surface 0 : étape inchangée ["La surface doit être un nombre positif"] ; surface −12 : étape inchangée ["La surface doit être un nombre positif"] ; champ type=number, input… | `captures/a30-surface-invalide.png` |
| PRO-M-031 | telephone | « Le bien » : enregistrement (adresse, immeuble collectif, 42,5 m²) | OK | Suite : Caractéristiques du bien (6/12) ; messages : ["Données enregistrées avec succès"] ; base : {"fullAddress":"Place Bonnyaud 23000 Guéret","surfaceM2":"42.5","type":"APPARTEMENT","postalCode":"23000","city":"Guéret","inseeCo… | `captures/a31-le-bien-rempli.png` |
| PRO-M-032 | telephone | « Caractéristiques du bien » : champs obligatoires | OK | Étape inchangée ; messages : ["Indiquez le nombre de pièces principales","Indiquez l'époque de construction","Indiquez la classe énergétique du logement","Le statut légal est requis"] ; largeur 412/412px | `captures/a32-caracteristiques-vide.png` |
| PRO-M-033 | telephone | Listes déroulantes sur téléphone (pièces, époque, régime juridique, DPE) | OK | Pièces : 4 choix, dans l'écran : true ; époque : ["Avant 1946","1946 à 1970","1971 à 1990","1991 à 2005","Après 2005"], dans l'écran : true ; régime : ["Monopropriété","Copropriété","Lotissement"], dans l'écran : true ; DPE : Cla… | `captures/a33-liste-pieces.png` |
| PRO-M-034 | telephone | DPE : avertissements pour les classes G et F | OK | G : avertissement affiché ; F : avertissement affiché ; D : aucun avertissement | `captures/a34-dpe-f.png` |
| PRO-M-035 | telephone | Copropriété : syndic obligatoire, e-mail du syndic contrôlé | **KO** (mineur) | Champs du syndic affichés et nom exigé (« Indiquez le nom du syndic », « Indiquez l'e-mail ou le téléphone du syndic ») : conforme. En revanche l'e-mail mal formé est ACCEPTÉ : étape suivante atteinte (Type de contrat) et valeur … | `captures/a35-syndic-email-accepte.png` |
| PRO-M-036 | telephone | « Caractéristiques du bien » : enregistrement (copropriété, syndic, DPE D) | OK | Suite : Type de contrat (7/12) ; base : {"legalStatus":"CO_PROPRIETE","mainRooms":2,"constructionPeriod":"FROM_1971_TO_1990","dpeClass":"D","syndicName":"Syndic Recette Bénévole","syndicEmail":"syndic-pas-une-adresse","syndicPhon… | `captures/a36-caracteristiques-remplies.png` |
| PRO-M-037 | telephone | « Type de contrat » : choix du bail meublé 1 an | OK | Options : ["Bail nue 3 ans","Bail nue 6 ans (SCI)","Bail meublé 1 an","Bail étudiant (9 mois)"] ; liste dans l'écran : true ; parcours : 13 étapes ; suite : Le loyer ; base : {"id":"cmwjqlvsg007yx100erd5jbmd","bailType":"BAIL_MEU… | `captures/a37-liste-types.png` |
| PRO-M-038 | telephone | « Le loyer » : montant obligatoire et strictement positif, aide au toucher | OK | Vide : étape inchangée ["Le montant du loyer est requis"] ; 0 € : étape inchangée ["Le montant du loyer est requis"] ; aide : « Le loyer mensuel, sans les charges. Les charges se renseignent à l'étape suivante. » ; inputmode=—, p… | `captures/a38-loyer-vide.png` |
| PRO-M-039 | telephone | « Le loyer » : enregistrement de 650 € | OK | Suite : Charges & dépôt (9/13) ; questions intermédiaires : 1 ; base : loyer 650 Remarque : il a fallu toucher « Continuer » deux fois (le premier toucher ne change rien à l'écran) ; reproduit sur iPhone, voir PRO-M-119. | `captures/a38-loyer.png` |
| PRO-M-040 | telephone | « Charges & dépôt » : dépôt de garantie supérieur au plafond légal du meublé | OK | Valeurs initiales : ["",""] ; champs vidés : étape inchangée ["Les charges mensuelles sont requises"] ; dépôt 5 000 € : étape inchangée, messages ["Maximum : 1 300 € (2 mois de loyer)","Le dépôt de garantie ne peut pas dépasser 2… | `captures/a40-depot-trop-eleve.png` |
| PRO-M-041 | telephone | « Charges & dépôt » : enregistrement (50 € / 1 300 €) | OK | Suite : Mobilier (10/13) ; base : charges 50, dépôt 1300 ; largeur 412/412px, « Continuer » visible : true | `captures/a40-charges.png` |
| PRO-M-042 | telephone | « Mobilier » : les 13 équipements du meublé sont tous exigés | OK | 13 équipements : Literie avec couette ou couverture, Volets ou rideaux dans les chambres, Plaques de cuisson, Four ou four à micro-ondes, Réfrigérateur, Congélateur ou compartiment à congélation (-6° max), Vaisselle en nombre suf… | `captures/a42-mobilier-vide.png` |
| PRO-M-043 | telephone | « Mobilier » : tout coché (toucher le libellé), passage à la suite | OK | Bandeau vert : true ; suite : Locataire (11/13) ; largeur 412/412px | `captures/a43-mobilier-complet.png` |
| PRO-M-044 | telephone | « Locataire » : libellé du bouton, apparition des dates, e-mail mal formé | **KO** (majeur) | Bouton champ vide : « Continuer sans locataire », puis « Continuer » dès la saisie ; les champs de dates apparaissent. E-mail mal formé : étape inchangée, messages ["An error occurred in the Server Components render. The specific… | `captures/a44-locataire-email-invalide.png` |
| PRO-M-045 | telephone | « Locataire » : adresse déjà utilisée (celle du propriétaire, ou d'un autre client) | **KO** (majeur) | Refusé dans les deux cas : true. Message affiché : « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included  » pui… | `captures/a45-locataire-adresse-deja-utilisee.png` |
| PRO-M-046 | telephone | « Locataire » : date de prise d'effet et jour de paiement exigés dès qu'un locataire est indiqué | OK | Étape inchangée ; messages : ["Le jour de paiement est requis","La date de prise d'effet est requise","An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensi… | `captures/a46-dates-exigees.png` |
| PRO-M-047 | telephone | Date de prise d'effet saisie au clavier : date impossible, date passée, jour de paiement hors bornes | OK | Champ : type=text, inputmode=numeric, indication « JJ/MM/AAAA », police 16px ; « 31022027 » devient « 31/02/2027 » : étape inchangée ["Le jour de paiement est requis","Cette date n'existe pas","La date de prise d'effet est requis… | `captures/a47-date-impossible.png` |
| PRO-M-048 | telephone | Date de prise d'effet choisie dans le calendrier | OK | Calendrier dans l'écran : true (334×382 px) ; en-tête « janv. févr. mars avr. mai juin juil. août sept. oc » ; champ après choix : « 15/03/2020 » ; phrase : « Le bail se terminera le 15 mars 2021 » | `captures/a48-calendrier.png` |
| PRO-M-049 | telephone | « Locataire » : enregistrement du locataire et des dates | OK | Passage à « Documents » ; en base : 1 lien de formulaire locataire (PENDING, profil LOCATAIRE, recette-prom-locnouveau1@example.invalid) ; tâche de fond « email/intake.tenant-form » capturée pour recette-prom-locnouveau1@example.… | `captures/a49-locataire-rempli.png` |
| PRO-M-050 | telephone | Date de prise d'effet dans le passé (bail déjà échu) | Partiel | Aucun contrôle : la phrase « Le bail se terminera le 15 mars 2021 » s'affiche sans avertissement ; au premier passage cette date a été enregistrée telle quelle (effet 2020-03-15, fin 2021-03-15 en base). Remarque : après effaceme… | `captures/a50-date-passee.png` |
| PRO-M-051 | telephone | « Locataire » : revenir corriger la date et le jour de paiement | OK | À l'arrivée : e-mail « recette-prom-locnouveau1@example.invalid » (modifiable : true), date « 15/03/2020 », jour « 5 », bouton « Continuer » ; phrase : « Le bail se terminera le 1 février 2028 » ; après validation : effet 2027-02… |  |
| PRO-M-111 | iphone | iPhone — étape « Type de bail » | OK | Largeur 390/390px, « Continuer » visible : true ; suite : Type de client (2/12) | `captures/i11-type-de-bail-iphone.png` |
| PRO-M-112 | iphone | iPhone — identité d'un particulier : champs obligatoires | OK | Étape inchangée ; 10 messages : ["Erreurs détectées.","Le prénom est requis","Le nom est requis","Le numéro de téléphone est requis","L'adresse est requise","La profession est requise","La nationalité est requise","La situation f… | `captures/i12-identite-vide-iphone.png` |
| PRO-M-113 | iphone | iPhone — recherche de nationalité | OK | « zzzz » : « Aucune nationalité trouvée. » ; « fran » : 246 résultat(s) (Afghanistan, Åland Islands, Albania) ; liste 324×87 px dans l'écran : true ; valeur affichée après choix : true ; police du champ de recherche : 14px (infér… | `captures/i13-nationalite-iphone.png` |
| PRO-M-114 | iphone | iPhone — date de naissance saisie au clavier et situation familiale | Partiel | « 31021985 » : « Cette date n'existe pas » ; « 15061985 » devient « 15/06/1985 » ; liste « Situation familiale » dans l'écran : true, libellés : ["CELIBATAIRE","MARIE","DIVORCE","VEUF","PACS"] La liste « Statut familial » du form… | `captures/i14-identite-remplie-iphone.png` |
| PRO-M-115 | iphone | iPhone — identité d'un particulier : enregistrement | OK | Suite : Récapitulatif (4/12) ; messages : [] ; base : {"firstName":"Inès","lastName":"Recette-Iphone","nationality":"Française","familyStatus":"CELIBATAIRE","birthDate":"1985-06-15T00:00:00.000Z","phone":"+33612345679"} | `captures/i14-identite-remplie-iphone.png` |
| PRO-M-116 | iphone | iPhone — récapitulatif du particulier | OK | « Récapitulatif Vérifiez les informations avant de continuer. Personne principale Inès Recette-Iphone • recette-prom-nouveau2@example.invalid Continuer » ; largeur 390/390px ; suite : Le bien | `captures/i16-recapitulatif-iphone.png` |
| PRO-M-117 | iphone | iPhone — « Le bien » : adresse, maison, surface | OK | Suggestions : 1, liste dans l'écran : true ; surface saisie « 95.5 » (la saisie avec une virgule ne peut pas être simulée sous WebKit piloté) ; suite : Caractéristiques du bien ; base : {"fullAddress":"5 Place Bonnyaud 23000 Guér… | `captures/i17-adresse-iphone.png` |
| PRO-M-118 | iphone | iPhone — « Caractéristiques du bien » : listes déroulantes | OK | Listes dans l'écran : [true,true,true,true] ; suite : Type de contrat (7/12) ; largeur 390/390px | `captures/i18-caracteristiques-iphone.png` |
| PRO-M-119 | iphone | iPhone — « Le loyer » : un seul toucher sur « Continuer » suffit | Partiel | Rien au premier toucher en 20 s ; au second : Charges & dépôt Déjà vu sur téléphone Android (PRO-M-039) : le premier toucher valide seulement la réponse à la question du loyer, sans rien changer à l'écran ; il faut toucher « Cont… |  |
| PRO-M-120 | iphone | iPhone — « Locataire » : e-mail, calendrier, jour de paiement | OK | Calendrier 334×434 px dans l'écran (390×664) : true ; champ : « 15/02/2027 » ; suite : Documents ; base : effet 2027-02-15, fin 2030-02-15, jour 3, lien locataire : 1 ; largeur 390/390px | `captures/i20-calendrier-iphone.png` |
| PRO-M-124 | iphone | iPhone — taille de police des champs (zoom automatique de Safari) | OK | Aucun champ sous 16 px sur les étapes parcourues (identité, bien, loyer, charges, locataire). |  |
| PRO-M-125 | iphone | iPhone — parcours société (SIREN, Kbis, statuts), copropriété et bail meublé | Non testé | Non refait sur iPhone faute de temps : le parcours iPhone a été mené avec un propriétaire particulier, en monopropriété et en bail nu, pour élargir la couverture (nationalité, date de naissance, pièce d'identité). Le parcours soc… |  |
| PRO-M-126 | iphone | iPhone — rotation en paysage, clavier affiché, geste « retour » | Non testé | Non refaits sur iPhone faute de temps ; vérifiés sur téléphone Android (PRO-M-013, 023, 024). Le geste « retour » dépend du code de la page, pas du navigateur : le défaut PRO-M-013 vaut aussi pour iPhone. |  |
| PRO-M-144 | petit | Petit écran — formulaire propriétaire étape par étape | Non testé | Non refait étape par étape sur petit écran faute de temps ; le balayage du petit écran (320 × 568 px) couvre l'accueil, /commencer et dix écrans et fenêtres de l'espace client (PRO-M-201 à 213). |  |

### Documents

| Cas | Appareil | Vérification | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| PRO-M-052 | telephone | « Documents » : pièces exigées pour une société en copropriété, paiement refusé sans pièces | OK | Pièces demandées : KBIS *, Statuts *, Diagnostics *, Titre de propriété *, Règlement de copropriété * ; étape inchangée ; messages : ["Veuillez joindre tous les documents requis Kbis, Statuts de la société, Diagnostics du bien, T… | `captures/a52-documents-manquants.png` |
| PRO-M-053 | telephone | Dépôt d'un fichier PDF (Kbis) | OK | Notifications : ["Fichier uploadé avec succès"] ; pièces KBIS en base : 1 ; affiché à l'écran : true | `captures/a53-kbis-depose.png` |
| PRO-M-054 | telephone | Dépôt d'un fichier au mauvais format (.txt, .zip) | **KO** (majeur) | .txt : notifications ["Fichier uploadé avec succès"], pièces en base 1 → 2 ; .zip : ["Fichier uploadé avec succès"], pièces 2 → 3 Constaté pour deux fichiers (.txt et .zip), tous deux enregistrés. Aucun contrôle de type ni de tai… | `captures/a54-mauvais-format.png` |
| PRO-M-055 | telephone | Dépôt d'un fichier au nom très long (150 caractères) | OK | Notifications : ["Fichier uploadé avec succès"] ; pièces « Statuts » en base : 3 ; largeur 412/412px ; éléments coupés : [] | `captures/a55-nom-long.png` |
| PRO-M-056 | telephone | Dépôt de plusieurs fichiers à la fois, d'une image, du règlement de copropriété | OK | Les trois diagnostics sont enregistrés (le troisième quelques secondes après les deux premiers : les fichiers partent l'un après l'autre), le titre (PNG) et le règlement aussi ; ils s'affichent en pile repliée, largeur 412/412 px. | `captures/a56-toutes-les-pieces.png` |
| PRO-M-057 | telephone | Aperçu d'une pièce déposée (PDF au nom de 150 caractères) | OK | Fenêtre : 412×755 px à 0,42 pour un écran de 412×839 ; dans l'écran : true ; contenu le plus à droite : 395px ; titre : « Statuts » (7 caractères) ; fermeture visible : true, fenêtre refermée : true ; contenu : « Statuts Ouvrir d… | `captures/a57-apercu-nom-long.png` |
| PRO-M-058 | telephone | Boutons d'action d'une pièce (voir, télécharger, supprimer) au doigt | Partiel | 3 boutons : [{"nom":null,"l":32,"h":32},{"nom":null,"l":32,"h":32},{"nom":null,"l":32,"h":32}] ; 3 font moins de 40 px ; 3 n'ont ni texte ni intitulé accessible. Ils sont collés les uns aux autres (36 px d'axe en axe), la corbeil… | `captures/a56-toutes-les-pieces.png` |
| PRO-M-059 | telephone | Suppression d'une pièce déposée (recette-kbis.pdf) | Partiel | Confirmation demandée : NON (suppression immédiate au premier toucher) ; notifications : ["Document supprimé avec succès"] ; pièces en base 9 → 8, Kbis restants : 0 | `captures/a59-kbis-supprime.png` |
| PRO-M-060 | telephone | Paiement refusé tant qu'une pièce obligatoire manque (Kbis supprimé) | **KO** (majeur) | Aucun refus, les deux fois : « Données enregistrées avec succès », l'étape « Paiement » s'ouvre, le cadre de carte bancaire se charge et le bouton « Payer 39,90 € » est proposé alors que le Kbis n'existe plus en base. Le propriét… | `captures/a60-paiement-atteint-sans-kbis.png` |
| PRO-M-061 | telephone | Toutes les pièces présentes : passage à l'étape « Paiement » | OK | Pièces en base : {"STATUTES":3,"DIAGNOSTICS":3,"TITLE_DEED":1,"REGLEMENT_COPROPRIETE":1,"KBIS":1} ; étape : Paiement (13/13) ; messages : ["Fichier uploadé avec succès","Données enregistrées avec succès"] | `captures/a61-arrivee-paiement.png` |
| PRO-M-121 | iphone | iPhone — pièces d'un particulier en monopropriété et dépôt | OK | Pièces demandées : Pièce d'identité *, Diagnostics *, Titre de propriété * ; en base : ["ID_IDENTITY","DIAGNOSTICS","TITLE_DEED"] ; suite : Paiement ; messages : ["Fichier uploadé avec succès","Données enregistrées avec succès"] … | `captures/i21-documents-deposes-iphone.png` |
| PRO-M-127 | telephone | Téléchargement d'une pièce (formulaire et espace client) | Non testé | Non déclenché : la consigne de la campagne interdit de télécharger des fichiers sur la machine. Les boutons « Télécharger » sont présents (40 × 40 px avec intitulé dans l'espace client, 32 × 32 px sans intitulé dans le formulaire… |  |

### Paiement

| Cas | Appareil | Vérification | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| PRO-M-062 | telephone | Étape « Paiement » : résumé des frais | OK | « À payer maintenant : frais de dossier BailNotarie 39,90 € TTC » avec le détail du service ; « À régler à la signature : honoraires du notaire 414 € estimé » ; mentions « Chiffrement SSL », « Sécurisé par Stripe », « Remboursé s… | `captures/a62-paiement.png` |
| PRO-M-063 | telephone | Conditions générales à accepter avant de payer | OK | Bouton grisé et rappel « ↑ Acceptez les conditions pour activer le paiement » tant que la case n'est pas cochée ; toucher le texte coche la case (encadré bleu) et active « Payer 39,90 € et finaliser mon dossier » ; liens CGV et C… | `captures/a63-conditions.png` |
| PRO-M-064 | telephone | Paiement avec une carte refusée (4000 0000 0000 0002) | OK | Le cadre Stripe se remplit normalement au doigt (numéro, date, cryptogramme). Encadré rouge « Votre carte a été refusée. » au-dessus du bouton, qui redevient actif ; formulaire toujours « PENDING » en base. La bulle « Support » r… | `captures/a64-carte-refusee.png` |
| PRO-M-065 | telephone | Paiement avec la carte de test acceptée (4242…) et soumission du dossier | OK | En base après le paiement : formulaire SUBMITTED, dossier AWAITING_TENANT_FORM, paiements : SUCCEEDED 3990 centimes (rattachés au dossier : 1). Tâches de fond déclenchées : « email/notification.send », « email/intake.tenant-form … | `captures/a64-carte-saisie.png` |
| PRO-M-066 | telephone | Page de confirmation après paiement | Non testé | Sur téléphone Android, le script a été interrompu (pause de la campagne) pendant la redirection qui suit le paiement accepté : la page de confirmation n'a pas été vue sur cet appareil. Elle a été vérifiée sur iPhone (PRO-M-166, c… |  |
| PRO-M-067 | telephone | Rouvrir le lien du formulaire après soumission | OK | Page « Formulaire déjà soumis — Ce formulaire a déjà été soumis et est en cours de traitement. Vous recevrez une notification… » ; le formulaire n'est plus accessible. Le seul bouton de la page est « Retour à la page d'accueil » … |  |
| PRO-M-122 | iphone | iPhone — paiement : résumé, conditions, carte refusée | OK | Frais 39,90 € affichés : true ; largeur 390/390px ; bouton grisé avant conditions : true ; cadre Stripe rempli à l'écran (WebKit) ; refus : « Votre carte a été refusée. » | `captures/i22-paiement-iphone.png` |
| PRO-M-123 | iphone | iPhone — carte acceptée et soumission du dossier | OK | cadre Stripe rempli à l'écran (WebKit) ; redirection : /commencer/success?token=<jeton> ; base : formulaire SUBMITTED, dossier AWAITING_TENANT_FORM, paiements SUCCEEDED | `captures/i23-succes-iphone.png` |
| PRO-M-128 | telephone | Payer un dossier dont une pièce obligatoire a été supprimée | Non testé | Non tenté volontairement (suite du défaut PRO-M-060) pour ne pas laisser un dossier payé et incohérent ; le Kbis a été redéposé avant le paiement. |  |
| PRO-M-166 | iphone | Page de confirmation après paiement | OK | Adresse : /commencer/success?token=<jeton> ; texte : « IR DEMANDE ENREGISTRÉE C'est envoyé Merci Inès Recette-Iphone. Votre dossier est entre nos mains — vous n'avez plus rien à faire pour l'instant. LA SUITE 1 Vos informations o… | `captures/i23-succes-iphone.png` |

### Espace client

| Cas | Appareil | Vérification | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| PRO-M-070 | telephone | Tableau de bord propriétaire et barre de navigation du bas | OK | « Tableau de bordMes dossiersMes informationsEspace propriétaireBonjour Camille1 chose vous attendNouveau dossier4En cours1À faire0SignésÀ faire maintenant1À compléter · Bien immobilierDossier en coursAjoutez et renseignez votre … | `captures/b70-tableau-de-bord.png` |
| PRO-M-071 | telephone | Navigation par la barre du bas | OK | Dossiers → /client/proprietaire/demandes affiché en 1,6 s ; Profil → /client/proprietaire/informations affiché (identité, situation familiale, coordonnées) ; Accueil → /client/proprietaire affiché en 1,6 s. Aux premiers passages … | `captures/b71-navigation-bas.png` |
| PRO-M-072 | telephone | « Mes dossiers » : biens et baux avec leur statut | OK | « Tableau de bordMes dossiersMes informationsEspace propriétaireMes dossiers3 biens · 3 bauxAjouter un bienLocal recette PRO-M 33 Place Bonnyaud 23000 Guéret · 80 m²Infos en vérificationUn dossier est déjà en cours sur ce bienFic… | `captures/b72-mes-dossiers.png` |
| PRO-M-073 | telephone | Détail d'un dossier chez le notaire | OK | « RetourMes dossiersLogement recette PRO-M 1Le bailLe bailLogement recette PRO-M 1Bail d'habitation · 1 Place Bonnyaud 23000 GuéretChez le notaireUn notaire a pris votre dossier en charge. Il vous contacte bientôt.Loyer600,00 €Ch… | `captures/b73-dossier-1.png` |
| PRO-M-074 | telephone | Détail d'un dossier en attente du locataire | OK | « RetourMes dossiersLogement recette PRO-M 2Le bailLe bailLogement recette PRO-M 2Bail d'habitation · 2 Place Bonnyaud 23000 GuéretLocataire à ajouterAjoutez-le dès que vous l'avez trouvé — le dossier avance sans lui.Loyer600,00 … | `captures/b74-dossier-2.png` |
| PRO-M-075 | telephone | Détail d'un dossier bail commercial en vérification | OK | « RetourMes dossiersLocal recette PRO-M 3Le bailLe bailLocal recette PRO-M 3Bail commercial · 3 Place Bonnyaud 23000 GuéretEn vérificationVotre dossier est entre nos mains. On revient vers vous sous 48 h.Loyer HT1 500,00 €Charges… | `captures/b75-dossier-3.png` |
| PRO-M-076 | telephone | Erreurs JavaScript à l'ouverture du détail d'un dossier | Partiel | Erreur React n° 418 (le texte calculé par le serveur diffère de celui du navigateur ; la page est alors redessinée côté navigateur, sans effet visible) : dossier 1 : Minified React error #418; visit https://react.dev/errors/41 ; … |  |
| PRO-M-077 | telephone | Fenêtre « Ajouter un locataire » : tient dans l'écran, e-mail obligatoire et contrôlé | Partiel | Fenêtre 380×583 px pour un écran de 412×839, dans l'écran : true ; champ : police 16px, hauteur 44px ; vide : fenêtre : bouton « Ajouter le locataire » désactivé tant que le champ est vide ; adresse mal formée : ["Erreur An error… | `captures/b77-ajout-locataire.png` |
| PRO-M-078 | telephone | « Ajouter un locataire » avec l'adresse du propriétaire lui-même | **KO** (majeur) | Fenêtre restée ouverte ; message : ["Erreur An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error i… | `captures/b78-ajout-locataire-adresse-proprietaire.png` |
| PRO-M-079 | telephone | « Ajouter un locataire » : adresse valide | OK | Notifications : ["Locataire ajouté — un email lui a été envoyé"] ; base : dossier AWAITING_TENANT_FORM, liens de formulaire locataire : 1, date d'effet : 2027-04-01T00:00:00.000Z ; e-mails capturés : [] ; tâches de fond : email/i… | `captures/b79-locataire-ajoute.png` |
| PRO-M-080 | telephone | Nouveau dossier depuis l'espace (habitation) : choix du bien | OK | « Nouveau bailBien · Étape 1/4LogementBail d'habitationLocal commercialBail commercialQuel bien ?Sélectionnez le bien concerné par ce bailBien recette PRO-M ajoutéRue de la Recette 02310 Charly-sur-MarneLocal recette PRO-M 33 Pla… | `captures/b80-nouveau-dossier.png` |
| PRO-M-081 | telephone | Nouveau dossier depuis l'espace : bascule « Local commercial » et ouverture du questionnaire | OK | Après bascule : « Nouveau bailBien · Étape 1/4LogementBail d'habitationLocal commercialBail commercialQuel local ?Le bail commercial se prépare avec un questionnaire dédié : activité, loyer hors taxes, charges, travaux » ; après … | `captures/b81-nouveau-dossier-commercial.png` |
| PRO-M-082 | telephone | Fiche d'un bien | OK | « RetourMes dossiersLogement recette PRO-M 1Le bienLogement recette PRO-M 1En vérification1 Place Bonnyaud 23000 GuéretUn dossier est déjà en cours sur ce bien : un nouveau bail sera possible une fois ce dossier terminé.Surface42… | `captures/b82-fiche-bien.png` |
| PRO-M-083 | telephone | Fenêtre « Ajouter un bien » : tient dans l'écran, champs obligatoires | OK | Fenêtre 380×755 px pour un écran de 412×839, dans l'écran : true ; bouton « Créer le bien » ; messages : ["L'adresse est requise","Le type de bien est requis","Le statut juridique est requis","*"] | `captures/b83-nouveau-bien-vide.png` |
| PRO-M-084 | telephone | Ajout d'un bien depuis l'espace | OK | Suggestions d'adresse : 10 ; listes dans l'écran : [true,true,true,true] ; notifications : ["Bien créé avec succès"] ; messages restants : ["*","*"] ; base : {"label":"Bien recette PRO-M ajouté","fullAddress":"Rue de la Recette 0… | `captures/b84-bien-ajoute.png` |
| PRO-M-085 | telephone | « Mes informations » : consultation | OK | « Tableau de bordMes dossiersMes informationsEspace propriétaireCPCamille ProprioPROM1Propriétairerecette-prom-proprio1@example.invalidIdentitéPrénomCamilleNomProprioPROM1ProfessionTesteuseNationalitéFrançaiseDate de naissance01/… | `captures/b85-mes-informations.png` |
| PRO-M-086 | telephone | « Mes informations » : modification | Non testé | L'écran est en lecture seule : 0 champ de saisie, 0 bouton de modification. Il renvoie vers l'équipe : « Une correction à apporter ? Écrivez-nous, on s'en occupe. » (lien d'e-mail). La modification en ligne n'existe donc pas dans… |  |
| PRO-M-090 | telephone | Aperçu d'une pièce du dossier | OK | Bouton « Prévisualiser » de 40×40 px ; fenêtre 380×743 px pour un écran de 412×839, dans l'écran : true ; contenu : « recette-titre-prom-1.pdf Titre de propriété Ouvrir dans un nouvel onglet Close » | `captures/b90-apercu-piece.png` |
| PRO-M-091 | telephone | Bulle « Support » : fenêtre de contact, déplacement, réduction | OK | Fenêtre 380×357 px, dans l'écran : true : « Contacter le support Une question ? Notre équipe est à votre écoute du lundi au vendredi. Appeler 07 68 09 86 24 Envoyer un email contact@bailnotarie.fr Astuce : glisse la bulle de haut… | `captures/b91-support.png` |
| PRO-M-092 | telephone | Déconnexion depuis le menu du compte | OK | Menu 286×163 px, dans l'écran : true ; après déconnexion : / ; /client/proprietaire renvoie vers /client/login | `captures/b92-apres-deconnexion.png` |
| PRO-M-093 | telephone | Nouveau dossier depuis l'espace, sans locataire : pas d'étape « Dates » | OK | Étape locataire : «  Sauvegarder Quel locataire ? Sélectionnez le locataire pour ce bail, ou passez cette étape si vous ne l'avez pas encore trouvé. recette-prom-locnouve » (largeur 412/412px) ; types de bail proposés : ["Bail nu… | `captures/b93-paiement-sans-locataire.png` |
| PRO-M-094 | telephone | Nouveau dossier depuis l'espace : flèche retour depuis le paiement | OK | Retours successifs : « Charges & dépôt » (3/4), « Le loyer » (3/4), « Locataire » (2/4) |  |
| PRO-M-095 | telephone | Nouveau dossier depuis l'espace, avec un locataire : date de début et jour de paiement exigés | OK | Tiroir dans l'écran : true ; e-mail mal formé : ["Email invalide"] ; création : ["Email invalide","Locataire créé avec succès"] ; étape atteinte : « Dates » (4/5) ; à vide : ["La date de début est requise","Le jour de paiement es… | `captures/b95-dates-exigees.png` |
| PRO-M-096 | telephone | Nouveau dossier depuis l'espace : paiement et création du bail | OK | Bouton grisé avant conditions : true ; notifications : ["Bail créé avec succès"] ; arrivée : /client/proprietaire/demandes?selected=<id> ; baux sur ce bien avant : 0 ; bail créé : {"status":"AWAITING_TENANT_FORM","bailType":"BAIL… | `captures/b96-bail-cree.png` |
| PRO-M-133 | iphone | iPhone — Tableau de bord | OK | Écran 390×664 ; largeur de page 390px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : aucune ; réponses 5xx : 0 | `captures/c133-tableau-de-bord-iphone.png` |
| PRO-M-134 | iphone | iPhone — « Mes dossiers » | OK | Écran 390×664 ; largeur de page 390px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : aucune ; réponses 5xx : 0 | `captures/c134--mes-dossiers--iphone.png` |
| PRO-M-135 | iphone | iPhone — Détail du dossier chez le notaire | OK | Écran 390×664 ; largeur de page 390px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : Minified React error #418; visit https:/ ; réponses 5xx : 0 | `captures/c135-d-tail-du-dossier-chez-le-notaire-iphone.png` |
| PRO-M-136 | iphone | iPhone — Détail du bail commercial (écran dense) | OK | Écran 390×664 ; largeur de page 390px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : Minified React error #418; visit https:/ ; réponses 5xx : 0 | `captures/c136-d-tail-du-bail-commercial--cran-dense--iphone.png` |
| PRO-M-137 | iphone | iPhone — Fiche d'un bien | OK | Écran 390×664 ; largeur de page 390px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : Minified React error #418; visit https:/ ; réponses 5xx : 0 | `captures/c137-fiche-d-un-bien-iphone.png` |
| PRO-M-138 | iphone | iPhone — « Mes informations » | OK | Écran 390×664 ; largeur de page 390px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : Minified React error #418; visit https:/ ; réponses 5xx : 0 | `captures/c138--mes-informations--iphone.png` |
| PRO-M-139 | iphone | iPhone — Nouveau dossier (choix du bien) | OK | Écran 390×664 ; largeur de page 390px ; contenu attendu affiché : true ; éléments coupés : [] ; erreurs JavaScript : aucune ; réponses 5xx : 0 | `captures/c139-nouveau-dossier-choix-du-bien--iphone.png` |
| PRO-M-141 | iphone | iPhone — fenêtre « Ajouter un bien » | OK | Fenêtre 358×598 px pour un écran de 390×664, dans l'écran : true ; contenu le plus à droite : 373px | `captures/c141-fenetre-iphone.png` |
| PRO-M-142 | iphone | iPhone — fenêtre « Discussion avec le notaire » | OK | Fenêtre 390×664 px pour un écran de 390×664, dans l'écran : true ; contenu le plus à droite : 390px | `captures/c142-fenetre-iphone.png` |
| PRO-M-143 | iphone | iPhone — fenêtre « Aperçu d'une pièce » | OK | Fenêtre 358×598 px pour un écran de 390×664, dans l'écran : true ; contenu le plus à droite : 357px | `captures/c143-fenetre-iphone.png` |
| PRO-M-203 | petit | Petit écran 375 px — Tableau de bord | OK | Écran 320×568 ; largeur de page 320px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : aucune ; réponses 5xx : 0 | `captures/c203-tableau-de-bord-petit.png` |
| PRO-M-204 | petit | Petit écran 375 px — « Mes dossiers » | OK | Écran 320×568 ; largeur de page 320px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : aucune ; réponses 5xx : 0 | `captures/c204--mes-dossiers--petit.png` |
| PRO-M-205 | petit | Petit écran 375 px — Détail du dossier chez le notaire | OK | Écran 320×568 ; largeur de page 320px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : ["Mes dossiers [-27→49, conteneur défilant/masqué]"] ; erreurs JavaScript : Minified React error #418; visit… | `captures/c205-d-tail-du-dossier-chez-le-notaire-petit.png` |
| PRO-M-206 | petit | Petit écran 375 px — Détail du bail commercial (écran dense) | OK | Écran 320×568 ; largeur de page 320px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : ["Mes dossiers [-3→73, conteneur défilant/masqué]"] ; erreurs JavaScript : Minified React error #418; visit … | `captures/c206-d-tail-du-bail-commercial--cran-dense--petit.png` |
| PRO-M-207 | petit | Petit écran 375 px — Fiche d'un bien | OK | Écran 320×568 ; largeur de page 320px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : Minified React error #418; visit https:/ ; réponses 5xx : 0 | `captures/c207-fiche-d-un-bien-petit.png` |
| PRO-M-208 | petit | Petit écran 375 px — « Mes informations » | OK | Écran 320×568 ; largeur de page 320px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : Minified React error #418; visit https:/ ; réponses 5xx : 0 | `captures/c208--mes-informations--petit.png` |
| PRO-M-209 | petit | Petit écran 375 px — Nouveau dossier (choix du bien) | OK | Écran 320×568 ; largeur de page 320px ; contenu attendu affiché : true ; éléments coupés : [] ; erreurs JavaScript : aucune ; réponses 5xx : 0 | `captures/c209-nouveau-dossier-choix-du-bien--petit.png` |
| PRO-M-211 | petit | Petit écran 375 px — fenêtre « Ajouter un bien » | OK | Fenêtre 288×511 px pour un écran de 320×568, dans l'écran : true ; contenu le plus à droite : 303px | `captures/c211-fenetre-petit.png` |
| PRO-M-212 | petit | Petit écran 375 px — fenêtre « Discussion avec le notaire » | OK | Fenêtre 320×568 px pour un écran de 320×568, dans l'écran : true ; contenu le plus à droite : 320px | `captures/c212-fenetre-petit.png` |
| PRO-M-213 | petit | Petit écran 375 px — fenêtre « Aperçu d'une pièce » | OK | Fenêtre 288×511 px pour un écran de 320×568, dans l'écran : true ; contenu le plus à droite : 287px | `captures/c213-fenetre-petit.png` |

### Demandes

| Cas | Appareil | Vérification | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| PRO-M-087 | telephone | Demande de l'équipe : affichage sur le tableau de bord et écran de réponse | OK | Tableau de bord : lien vers la demande présent (« À faire maintenant2À faire · Demande de l'équipeLocal recette PRO-M 31 pièce et 1 information à compléter : Diagnostics du bien · Emplacement du localCompléterCompléterÀ compléter… | `captures/b87-demande.png` |
| PRO-M-097 | telephone | Demande de l'équipe : répondre à une information | OK | Au départ : « RetourAccueilDemande de l'équipeDemande de l'équipe1 pièce et 1 information à compléterLocal recette PRO-M 3 · 3 Place B », envoi grisé : true ; sans choix : ["Indiquez où se trouve le local"] ; après réponse : noti… | `captures/b97-demande-information.png` |
| PRO-M-098 | telephone | Demande de l'équipe : répondre à une pièce | OK | Mention de la pièce avant dépôt : « Diagnostics du bienIllisibleLe fichier reçu est illisible. » ; après dépôt : fichier listé : true, compteur « 2 / 2 prêt », envoi actif : true ; largeur 412/412px | `captures/b98-demande-piece.png` |
| PRO-M-099 | telephone | Demande de l'équipe : envoi de la réponse | OK | Notifications : [] ; écran : « RetourAccueilDemande de l'équipeDemande de l'équipe1 pièce et 1 information à compléterLocal recette PRO-M 3 · 3 Place Bonnyaud 23000 Guéret2 / 2 prêtsInformations à compléterEmplacement du localRen… | `captures/b99-demande-envoyee.png` |
| PRO-M-140 | iphone | iPhone — Demande de l'équipe | OK | Écran 390×664 ; largeur de page 390px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : aucune ; réponses 5xx : 0 | `captures/c140-demande-de-l--quipe-iphone.png` |
| PRO-M-210 | petit | Petit écran 375 px — Demande de l'équipe | OK | Écran 320×568 ; largeur de page 320px ; contenu attendu affiché : true ; barre du bas visible : true ; éléments coupés : [] ; erreurs JavaScript : aucune ; réponses 5xx : 0 | `captures/c210-demande-de-l--quipe-petit.png` |

### Messagerie

| Cas | Appareil | Vérification | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| PRO-M-088 | telephone | Messagerie avec le notaire : envoi d'un message | OK | Fenêtre 412×839 px pour un écran de 412×839 ; « Envoyer » désactivé à vide : true ; police du champ 16px ; message affiché : true ; messages en base 0 → 1 ; champ vidé : true ; contenu le plus à droite : 412px | `captures/b88-messagerie.png` |
| PRO-M-089 | telephone | Messagerie : joindre un document, fermer la fenêtre | OK | Pièce jointe : recette-piece-messagerie-telephone.pdf ; messages en base après : 2 ; fenêtre refermée : true | `captures/b89-messagerie-piece-jointe.png` |
| PRO-M-129 | telephone | Messagerie : réception en direct de la réponse du notaire | Non testé | Limite connue du montage (pas de temps réel) ; seul l'envoi côté propriétaire est vérifié (PRO-M-088, 089). |  |

## 4. Observations (ergonomie, textes, lenteurs, incohérences)

- La notification verte « Données enregistrées avec succès » s'affiche par-dessus l'en-tête du formulaire (titre de l'étape et bouton « Enregistrer » masqués quelques secondes).
- Des messages d'erreur restent affichés après correction : « Le numéro d'enregistrement est requis » sous un SIREN rempli, « Le statut légal est requis » après avoir choisi « Copropriété », « Le prénom est requis » sous un prénom saisi. Ils disparaissent à la validation suivante.
- Au premier passage, le récapitulatif d'une société affiche aussi une ligne « Personne principale — Personne sans nom » (a22-telephone-invalide.png) ; elle disparaît après rechargement.
- Libellés incohérents entre le formulaire du site et l'espace client : « Bail nue 3 ans » / « Bail nue 6 ans (SCI) » (faute d'accord) contre « Bail nu 3 ans » ; « Monopropriété / Copropriété » contre « Plein propriété / Co-propriété » ; « Four ou four à micro-ondes » contre « micro-onde ».
- Textes pensés pour l'ordinateur : « Cliquez ou glissez-déposez plusieurs fichiers » sur téléphone ; bouton de fermeture des fenêtres intitulé « Close » pour les lecteurs d'écran ; sélecteur de pays du téléphone en anglais (« Phone number country », « Afghanistan, Åland Islands… »). La fenêtre du support tutoie (« Astuce : glisse la bulle… ») alors que tout le reste vouvoie.
- Le champ « Email du locataire » du formulaire est un champ de texte ordinaire (pas de clavier « e-mail », majuscule automatique possible sur iPhone) de 36 px de haut. Dans la fenêtre « Ajouter un locataire » de l'espace, la date est un champ de date natif du téléphone alors que le formulaire utilise la saisie JJ/MM/AAAA avec calendrier : deux façons de saisir la même information.
- Reprise du formulaire : tant que l'identité n'est pas enregistrée, rouvrir le lien fait repartir de l'étape 1 ; ensuite la reprise se fait bien à la première étape incomplète, mais l'étape « Type de contrat » est sautée (la valeur par défaut « Bail nue 3 ans » compte comme une réponse).
- Une société propriétaire peut choisir « Bail nue 3 ans » alors que la liste propose « Bail nue 6 ans (SCI) » : aucun message n'oriente vers la durée de six ans.
- Un numéro SIREN à clé valide pris au hasard s'est révélé être celui d'une entreprise individuelle : le message « vous signez le bail en votre nom propre… choisissez Particulier » est clair, mais aucun lien ne permet alors la saisie manuelle.
- Après effacement de la date, le calendrier se rouvre sur l'ancien mois saisi et non sur le mois courant.
- « Mes informations » est en lecture seule (« Une correction à apporter ? Écrivez-nous ») : il n'y a pas de modification en ligne à tester.
- Page « Formulaire déjà soumis » : le seul bouton est « Retour à la page d'accueil » ; un bouton vers l'espace client serait plus utile. La page de confirmation après paiement, elle, est claire (« C'est envoyé », quatre étapes de la suite, reçu de paiement).
- À 320 px de large, les deux badges « Bail d'habitation » / « Bail commercial » de l'accueil dépassent un peu de leur cadre (coupés à gauche et à droite) ; rien d'autre ne souffre de cette largeur.
- Aperçu d'un PDF : la fenêtre tient dans l'écran mais le cadre du PDF reste vide dans les navigateurs pilotés (pas de lecteur PDF intégré en mode automatisé) ; le lien « Ouvrir dans un onglet » est présent.
- Montage : serveur partagé parfois très lent (jusqu'à 45 s pour une page quand plusieurs agents travaillent), base distante injoignable quelques secondes à plusieurs reprises, cadre Stripe avec le badge du mode test et un indicatif de pays étranger pour « Link ». Aucune réponse 5xx hors du défaut D1.
- La recherche d'adresse ne propose pas toujours le numéro dans la voie (« 4 Place Bonnyaud Guéret » → « Place Bonnyaud 23000 Guéret ») : donnée de la Base Adresse Nationale, pas de l'application.

## 5. Non testé, et pourquoi

- Clavier virtuel réel, défilement automatique vers le champ actif, proposition du code reçu par le clavier, saisie d'un nombre avec une virgule sur le clavier français de Safari : non simulables avec un navigateur piloté. Seuls les attributs (clavier numérique, « one-time-code », police de 16 px qui évite le zoom de Safari) et le maintien du bouton « Continuer » avec une hauteur d'écran réduite ont été vérifiés.
- Exécution des tâches de fond (e-mail d'invitation du locataire, notifications à l'équipe) : capturées mais non exécutées sur le montage ; leur déclenchement est vérifié, pas leur contenu.
- PRO-M-066 — Page de confirmation après paiement : Sur téléphone Android, le script a été interrompu (pause de la campagne) pendant la redirection qui suit le paiement accepté : la page de confirmation n'a pas été vue sur cet appareil. Elle a été vérifiée sur iPhone (PRO-M-166, conforme).
- PRO-M-086 — « Mes informations » : modification : L'écran est en lecture seule : 0 champ de saisie, 0 bouton de modification. Il renvoie vers l'équipe : « Une correction à apporter ? Écrivez-nous, on s'en occupe. » (lien d'e-mail). La modification en ligne n'existe donc pas dans l'espace propriétaire : rien à tester de plus.
- PRO-M-125 — iPhone — parcours société (SIREN, Kbis, statuts), copropriété et bail meublé : Non refait sur iPhone faute de temps : le parcours iPhone a été mené avec un propriétaire particulier, en monopropriété et en bail nu, pour élargir la couverture (nationalité, date de naissance, pièce d'identité). Le parcours société/copropriété/meublé est vérifié en entier sur téléphone Android.
- PRO-M-126 — iPhone — rotation en paysage, clavier affiché, geste « retour » : Non refaits sur iPhone faute de temps ; vérifiés sur téléphone Android (PRO-M-013, 023, 024). Le geste « retour » dépend du code de la page, pas du navigateur : le défaut PRO-M-013 vaut aussi pour iPhone.
- PRO-M-127 — Téléchargement d'une pièce (formulaire et espace client) : Non déclenché : la consigne de la campagne interdit de télécharger des fichiers sur la machine. Les boutons « Télécharger » sont présents (40 × 40 px avec intitulé dans l'espace client, 32 × 32 px sans intitulé dans le formulaire).
- PRO-M-128 — Payer un dossier dont une pièce obligatoire a été supprimée : Non tenté volontairement (suite du défaut PRO-M-060) pour ne pas laisser un dossier payé et incohérent ; le Kbis a été redéposé avant le paiement.
- PRO-M-129 — Messagerie : réception en direct de la réponse du notaire : Limite connue du montage (pas de temps réel) ; seul l'envoi côté propriétaire est vérifié (PRO-M-088, 089).
- PRO-M-144 — Petit écran — formulaire propriétaire étape par étape : Non refait étape par étape sur petit écran faute de temps ; le balayage du petit écran (320 × 568 px) couvre l'accueil, /commencer et dix écrans et fenêtres de l'espace client (PRO-M-201 à 213).

## 6. Données créées (pour le nettoyage)

- Compte `recette-prom-nouveau1@example.invalid` (créé sur Android) : société fictive « SCI Recette Prom Mobile » (SIREN fictif 023456783), bien « Place Bonnyaud 23000 Guéret » (42,5 m², copropriété, syndic fictif), bail meublé d'un an payé et soumis ; neuf pièces `recette-…` dont `recette-mauvais-format.txt` et `recette-archive.zip` (acceptées à tort) ; locataire invité `recette-prom-locnouveau1@example.invalid`.
- Compte `recette-prom-nouveau2@example.invalid` (créé sur iPhone) : particulier fictif « Inès Recette-Iphone », bien « Place Bonnyaud 23000 Guéret » (maison, 95,5 m²), bail nu de 3 ans payé et soumis ; trois pièces `recette-…-iphone` ; locataire invité `recette-prom-locnouveau2@example.invalid`.
- Compte fourni `recette-prom-proprio1@example.invalid` : dossier 2 passé à « en attente du formulaire du locataire » (locataire `recette-prom-locnouveau3@example.invalid`, effet 01/04/2027, jour 6) ; nouveau bien « Bien recette PRO-M ajouté » (33 m², adresse fictive à Charly-sur-Marne) et son bail nu de 3 ans créé depuis l'espace et payé (locataire `recette-prom-locnouveau5@example.invalid`, effet 01/03/2027, jour 8) ; un formulaire de bail commercial ouvert depuis l'espace (« Un nouveau local »), laissé à l'étape « Le local » ; dossier 3 : demande de complément créée par `recette-prom-admin@example.invalid` puis répondue (emplacement du local, dépendances « Réserve de recette n° 3 », `recette-diagnostics-complement.pdf`) ; dossier 1 : deux messages de recette au notaire dont `recette-piece-messagerie-telephone.pdf`.
- Stripe (mode test) : cinq ordres de paiement de 39,90 € (deux refusés, trois acceptés).
- Aucun compte créé pour `recette-prom-inconnu@example.invalid`, `recette-prom-sansdate@example.invalid` ni pour les adresses mal formées (refusées).

## Annexes

- Cas détaillés : `resultats.json` · captures : `captures/` · scripts relançables : `scripts/` (bibliothèque commune `scripts/prep/recette/lib.cjs`).
