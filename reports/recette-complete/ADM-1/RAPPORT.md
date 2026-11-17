# Recette ADM-1 — Équipe : pilotage, listes et créations

Serveur testé : http://localhost:3210 (branche codex/prep-pr-main). Compte : administrateur fictif « Équipe Recette ADM-1 ». Dernière mise à jour des résultats : 17/11/2026 03:18:19.

## 1. Synthèse

Ce qui marche : le pilotage (« À traiter » : compteurs, onglets, ordre, pastilles, tous conformes à la base), la liste des dossiers (recherche, filtres, tri, pagination), les relances (fenêtre, envoi, e-mail, trace, délai de 48 h, appel, report), les listes et fiches clients, biens et notaires, les notifications, la recherche, la fermeture de l’espace aux autres rôles et aux appels sans session, et l’affichage sur téléphone. Ce qui ne marche pas : les créations faites par l’équipe. Quand le serveur refuse (doublon, champ manquant), l’écran affiche un message technique en anglais au lieu du motif ; « Nouveau client complet » exige des champs présentés comme facultatifs ; un lien créé par « Nouveau lien » est inutilisable ; « Créer un notaire » change sans prévenir le rôle d’un compte existant ; sur tablette, des boutons sont coupés tant que le menu est déplié. Un seul défaut vient de la branche : « Nouveau bail » refuse désormais un locataire sans jour de paiement, sans que l’écran l’explique. Verdict : rien de bloquant pour le pilotage quotidien ni pour les données existantes ; les écrans de création de l’équipe demandent une passe de correction, dont une ligne à traiter avant la fusion (défaut d’origine « branche »).

Totaux : **158 cas** — 136 OK, 20 KO, 1 partiels, 1 non testés.

| Rôle | Appareil | Cas | OK | KO | Partiels | Non testés |
|---|---|---|---|---|---|---|
| Locataire | ordinateur | 1 | 1 | 0 | 0 | 0 |
| Notaire | ordinateur | 1 | 1 | 0 | 0 | 0 |
| Propriétaire | ordinateur | 2 | 2 | 0 | 0 | 0 |
| Visiteur | ordinateur | 5 | 4 | 1 | 0 | 0 |
| Équipe | iphone | 6 | 6 | 0 | 0 | 0 |
| Équipe | ordinateur | 92 | 74 | 16 | 1 | 1 |
| Équipe | petit | 6 | 6 | 0 | 0 | 0 |
| Équipe | portable | 15 | 15 | 0 | 0 | 0 |
| Équipe | tablette | 15 | 12 | 3 | 0 | 0 |
| Équipe | telephone | 15 | 15 | 0 | 0 | 0 |

## 2. Défauts, du plus grave au plus bénin

### D1. Les refus du serveur s’affichent sous la forme d’un message technique en anglais (lead, invitation, client complet, nouveau bail)

- **Gravité** : majeur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-019, ADM-1-022, ADM-1-053
- **Pour le reproduire** : « Ajouter un lead » avec un e-mail déjà enregistré ; « Inviter le propriétaire » avec l’e-mail d’un client existant ; « Nouveau client complet » avec un e-mail déjà utilisé ; « Nouveau bail » avec un locataire mais sans jour de paiement.
- **Attendu** : Le message prévu par le code : « Un client avec l’email … existe déjà. », « Cet email est déjà utilisé par un client, une personne ou une entreprise. », « Le jour de paiement est requis quand un locataire est indiqué ».
- **Constaté** : Notification rouge « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details… ». Rien d’incorrect n’est enregistré, mais l’utilisateur ne sait pas pourquoi l’action échoue. Cause : ces actions signalent le refus en levant une erreur (throw new Error) ; en production, Next.js remplace le texte de toute erreur levée côté serveur. Les actions récentes qui renvoient { success: false, error } (relances, modification sur place, DPE) affichent bien leur message. Ce n’est pas dû au montage de test : le même comportement est attendu sur tout serveur de production.
- **Capture(s)** : captures/adm1-019-lead-doublon-toast.png, captures/adm1-022-invitation-doublon-toast.png
- **Code soupçonné** : lib/actions/leads.ts (createLead), lib/actions/clients.ts (createBasicClient, createFullClient), lib/actions/leases.ts (createLease) ; fenêtres components/clients/add-lead-dialog.tsx, basic-client-dialog.tsx, components/clients/full-client-form.tsx, components/leases/lease-form.tsx qui affichent error.message.

### D2. Un lien créé par « Nouveau lien » (/interface/intakes/new) ne peut pas être ouvert

- **Gravité** : majeur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-062
- **Pour le reproduire** : Formulaires envoyés → « Nouveau lien » → cible Propriétaire, un bien, « Créer le lien » ; ouvrir ensuite le lien (bouton « Voir »).
- **Attendu** : Le formulaire (après le code de connexion).
- **Constaté** : Écran « Ce formulaire ne peut pas être ouvert — Ce formulaire n’est rattaché à aucun dossier. Contactez-nous… » : l’écran de création ne permet pas de choisir la personne, le lien n’a donc aucun destinataire et reste inutilisable. Dans la liste, la colonne « Personne concernée » affiche « - ». Constaté sur deux liens. Les messages pour un jeton périmé (page 404) et un lien révoqué (« Lien révoqué ») sont corrects.
- **Capture(s)** : captures/adm1-061-lien-cree-ouvert.png
- **Code soupçonné** : components/intakes/intake-link-form.tsx (pas de champ « personne »), lib/actions/intakes.ts (createIntakeLink sans clientId), components/intakes/intake-otp-gate.tsx (refus à l’ouverture).

### D3. « Nouveau dossier » (page « Nouveau client complet ») : des champs présentés comme facultatifs sont exigés par le serveur, et l’échec s’affiche en anglais technique

- **Gravité** : majeur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-063
- **Pour le reproduire** : « À traiter » → « Nouveau dossier » (ouvre /interface/clients/new). Remplir seulement les champs marqués d’un astérisque (prénom, nom, e-mail, adresse du bien, loyer, date d’effet) puis « Créer le client complet ».
- **Attendu** : Soit le client est créé, soit chaque champ manquant est signalé en français sous le champ.
- **Constaté** : Aucune erreur sous les champs ; le serveur répond 500 et la notification affiche « An error occurred in the Server Components render. The specific message is omitted in production builds… ». Rien n’est créé. La validation rejouée hors serveur (scripts/zod-client-complet.ts) donne le vrai motif, invisible pour l’utilisateur : profession, téléphone, adresse, nationalité, situation familiale, lieu et date de naissance sont exigés par le serveur, alors qu’à l’écran ils n’ont pas d’astérisque et ne sont pas contrôlés. Avec tous les champs remplis, la création réussit (cas ADM-1-051).
- **Capture(s)** : captures/adm1-063-client-complet-message-anglais.png
- **Code soupçonné** : lib/zod/client.ts (schéma des personnes de createFullClientWithPropertySchema / createFullClientSchema), components/clients/full-client-form.tsx (astérisques et contrôle à l’écran), app/interface/clients/new/page.tsx et lib/actions/clients.ts (erreur levée par l’action serveur).

### D4. « Créer un notaire » avec l’e-mail d’un compte existant change son rôle en notaire, sans avertissement

- **Gravité** : majeur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-094, ADM-1-085
- **Pour le reproduire** : Notaires → « Créer un notaire » → saisir l’e-mail d’un compte existant (client, autre notaire…) → valider.
- **Attendu** : Un refus (« adresse déjà utilisée ») ou une confirmation explicite avant de changer le rôle.
- **Constaté** : Message « Notaire créé avec succès » dans tous les cas. Si le compte était un client, son rôle passe à NOTAIRE : il perd son espace client alors que sa fiche client et ses dossiers existent toujours. Vérifié sur un locataire fictif ; le code traite de la même façon n’importe quel compte, y compris un compte de l’équipe (non essayé).
- **Capture(s)** : captures/adm1-094-creer-notaire-compte-existant.png
- **Code soupçonné** : lib/actions/notaires.ts (createNotaire : « si l’utilisateur existe, mettre à jour son rôle en NOTAIRE ») et components/notaires/notaire-create-dialog.tsx.

### D5. La tuile « Frais non payés » et la liste qu’elle ouvre n’annoncent pas le même nombre

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-013
- **Pour le reproduire** : « À traiter » → tuile rouge « Frais non payés ».
- **Attendu** : Le même nombre de dossiers des deux côtés.
- **Constaté** : La tuile compte les dossiers en cours non payés ; la liste ouverte (filtre « Frais : Non payés ») compte aussi les dossiers signés ou clos non payés. Les deux nombres sont justes au regard de la base, mais diffèrent.
- **Code soupçonné** : app/interface/page.tsx (lien /interface/baux?payment=unpaid sans filtre d’étape) et lib/actions/admin-dashboard.ts (unpaidCount limité aux statuts actifs).

### D6. Deux boutons « Nouveau dossier » qui ouvrent deux écrans différents

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-015
- **Pour le reproduire** : Cliquer sur « Nouveau dossier » dans « À traiter », puis sur « Nouveau dossier » dans « Dossiers ».
- **Attendu** : Le même parcours de création, ou deux libellés distincts.
- **Constaté** : Depuis « À traiter » : /interface/clients/new, page « Nouveau client complet » (propriétaire + bien + bail + locataire). Depuis « Dossiers » : /interface/baux/new, page « Nouveau bail » (bail sur un bien et un locataire existants).
- **Capture(s)** : captures/adm1-015-nouveau-dossier-depuis-a-traiter.png
- **Code soupçonné** : components/dashboard/dashboard-action-buttons.tsx et app/interface/baux/page.tsx.

### D7. Liste des dossiers : page d’erreur si l’adresse contient un statut inconnu ou un numéro de page négatif

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-034
- **Pour le reproduire** : Ouvrir /interface/baux?status=INCONNU ou /interface/baux?page=-3.
- **Attendu** : La liste (paramètre ignoré) ou un état vide.
- **Constaté** : « Application error: a server-side exception has occurred… ». Les autres paramètres invalides (page=abc, pageSize=xyz, page=0, filtres inconnus, notaire inconnu) sont bien tolérés. Ne se produit qu’avec une adresse modifiée à la main ou un ancien favori.
- **Capture(s)** : captures/adm1-034-dossiers-parametres-invalides.png
- **Code soupçonné** : lib/actions/leases.ts (getLeases : statut passé tel quel à Prisma, « skip » négatif) et lib/utils/pagination.ts.

### D8. Lead par téléphone : un numéro de trois chiffres est accepté

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-038
- **Pour le reproduire** : « Ajouter un lead » → « Téléphone » → saisir « +33 6 12 » → valider.
- **Attendu** : Erreur « Numéro de téléphone invalide ».
- **Constaté** : Le prospect est créé avec le numéro « +33612 » (puis « +33639 » lors de la confirmation), vérifié en base. La règle « numéro international » accepte tout numéro de 5 à 17 chiffres commençant par « + ».
- **Capture(s)** : captures/adm1-038-lead-numero-incomplet.png
- **Code soupçonné** : lib/utils/phone-validation.ts (isValidPhoneNumberSafe, expression « internationalRegex »).

### D9. Liste des dossiers : le bouton « Relancer » ouvre une fenêtre dont l’envoi est impossible tant que la relance n’est pas « due »

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-041
- **Pour le reproduire** : Dossiers → ligne d’un brouillon créé depuis moins de 24 h (ou relancé depuis moins de 48 h) → bouton « Relancer ».
- **Attendu** : Pouvoir envoyer (le bouton est proposé), ou lire pourquoi ce n’est pas possible.
- **Constaté** : La fenêtre montre bien l’e-mail et le destinataire, mais « Envoyer la relance » est grisé, sans explication et sans case à cocher (elle n’apparaît que s’il y a plusieurs destinataires). Depuis la fiche du dossier, la même fenêtre permet l’envoi. Dans « À traiter » le cas ne se présente pas : le bouton de relance n’y figure que lorsque la relance est due.
- **Capture(s)** : captures/adm1-041-relance-liste-envoi-grise.png
- **Code soupçonné** : components/leases/lease-table-cells.tsx (LeaseRowActionButton : RemindButton sans focus="all") et components/reminders/remind-dialog.tsx (applyDefaults : rien n’est présélectionné quand rien n’est dû).

### D10. « Formulaires envoyés » : le champ « Rechercher par token... » est sans effet

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-060
- **Pour le reproduire** : Formulaires envoyés → saisir le début d’un jeton dans la recherche.
- **Attendu** : La liste se réduit au lien cherché.
- **Constaté** : L’adresse reçoit bien « ?search=… » mais la liste ne change pas : la page ne transmet pas la recherche à la requête. Constaté deux fois.
- **Code soupçonné** : app/interface/intakes/page.tsx (getIntakeLinks appelé sans « search ») et lib/actions/intakes.ts.

### D11. Nouveau bail : un locataire choisi sans jour de paiement est refusé par le serveur sans que l’écran dise pourquoi (règle ajoutée par la branche)

- **Gravité** : mineur — **Origine** : branche — **Appareil(s)** : ordinateur — **Cas** : ADM-1-064
- **Pour le reproduire** : Dossiers → « Nouveau dossier » (/interface/baux/new) → choisir un bien et un locataire, saisir le loyer et la date d’effet, laisser « Jour de paiement mensuel » vide → « Créer le bail ».
- **Attendu** : Message sous le champ : « Le jour de paiement est requis quand un locataire est indiqué ».
- **Constaté** : Aucun message sous le champ ; le serveur répond 500 et la notification affiche le message technique en anglais (voir le défaut sur les refus du serveur). Le bail n’est pas créé. La règle « date d’effet et jour de paiement exigés dès qu’un locataire est indiqué » a été ajoutée par la branche dans le schéma serveur, mais le formulaire de l’écran n’a pas été mis à jour : sur staging, ce même envoi était accepté. La même règle a été ajoutée au schéma de « Nouveau client complet » (lib/zod/client.ts) : à vérifier de la même façon.
- **Capture(s)** : captures/adm1-064-nouveau-bail-sans-jour-de-paiement.png
- **Code soupçonné** : lib/zod/lease.ts (createLeaseSchema, modifié par la branche) ; components/leases/lease-form.tsx (schéma de l’écran, non modifié) ; app/interface/baux/new/page.tsx.

### D12. Nouveau lien de formulaire : le bail choisi n’est pas enregistré

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-065
- **Pour le reproduire** : Formulaires envoyés → « Nouveau lien » → choisir un bien et un bail → « Créer le lien ».
- **Attendu** : Le lien est rattaché au bail choisi.
- **Constaté** : En base, le lien n’a pas de bail : le formulaire envoie « leaseId », l’action lit « bailId ». Constaté sur deux liens.
- **Code soupçonné** : lib/actions/intakes.ts (createIntakeLink : « bailId: (validated as any).bailId ») et lib/zod/intake.ts (champ « leaseId »).

### D13. Modification d’un bien : une surface négative est acceptée et efface la surface connue

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-098
- **Pour le reproduire** : Fiche d’un bien → « Modifier » → saisir « -5 » dans « Surface (m²) » → « Modifier ».
- **Attendu** : Refus avec un message ; la surface reste inchangée.
- **Constaté** : « Bien modifié avec succès » ; en base la surface est vide (elle valait 42 m²).
- **Capture(s)** : captures/adm1-098-surface-negative.png
- **Code soupçonné** : components/properties/property-form.tsx et lib/zod/property.ts (surface négative transformée en valeur vide), app/interface/properties/[id]/edit/page.tsx.

### D14. Tablette (768 px) : avec le menu latéral déplié, des boutons et des champs sont coupés à droite et inaccessibles

- **Gravité** : mineur — **Origine** : staging — **Appareil(s)** : tablette — **Cas** : ADM-1-111, ADM-1-116, ADM-1-120
- **Pour le reproduire** : Sur une tablette en portrait (768 px), ouvrir « À traiter », « Clients » ou « Nouveau bail » sans replier le menu latéral.
- **Attendu** : Tout le contenu tient dans la largeur disponible, ou défile.
- **Constaté** : Le menu latéral reste affiché (256 px) et le contenu ne se resserre pas assez : « Inviter le propriétaire » et l’onglet « Chez le notaire » de « À traiter », « Nouveau client » et « Inviter un propriétaire » de « Clients », la liste « Locataire » de « Nouveau bail » dépassent du bord droit ; la page ne défile pas horizontalement, ce qui dépasse est donc hors d’atteinte tant que le menu n’est pas replié. Sur téléphone (menu en panneau) et sur ordinateur, rien ne dépasse.
- **Capture(s)** : captures/adm1-111-tablette-a-traiter-en-tete.png, captures/adm1-116-tablette-clients-en-tete.png, captures/adm1-120-tablette-nouveau-bail.png
- **Code soupçonné** : components/shell/app-shell.tsx (menu latéral fixe à partir de 768 px), app/interface/page.tsx et components/dashboard/dashboard-action-buttons.tsx (en-tête en ligne dès « sm »), components/dashboard/work-queue.tsx (onglets).

### D15. Listes déroulantes affichant des valeurs techniques en majuscules

- **Gravité** : cosmetique — **Origine** : staging — **Appareil(s)** : ordinateur — **Cas** : ADM-1-052
- **Pour le reproduire** : Ouvrir « Nouveau client complet », la page de modification d’un client ou celle d’un bien, et dérouler les listes.
- **Attendu** : « Célibataire », « Bail nu 3 ans », « Pleine propriété »…
- **Constaté** : « CELIBATAIRE », « MARIE », « BAIL NU 3 ANS », « COMMERCIAL 3 6 9 », « PLEIN PROPRIETE », « LOCAL ACTIVITE », profil « PROPRIETAIRE ».
- **Code soupçonné** : components/clients/full-client-form.tsx, components/clients/edit-client-form.tsx, components/properties/property-form.tsx.

### Cas partiels (vérification incomplète ou résultat mitigé)

| Cas | Fonctionnalité | Constaté | Gravité | Origine |
|---|---|---|---|---|
| ADM-1-027 | Recherche par le libellé du bien (nom affiché en gras dans la colonne « Dossier ») | 1 dossier trouvé : la recherche porte sur l'adresse, les noms et les e-mails, pas sur le libellé du bien, alors que l'indication du champ dit « adresse, nom, e-mail » | cosmetique | staging |

## 3. Parcours vérifiés, par domaine

### À traiter

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-001 | ordinateur | Ouverture de « À traiter » (titre, date du jour, message de bienvenue) | OK | Titre « À traiter », date « Lundi 16 Novembre », « Bienvenue, Équipe Recette ADM-1 » |  |
| ADM-1-002 | ordinateur | Compteurs par étape (six tuiles) conformes à la base | OK | Écran {"Constitution":54,"Attente locataire":19,"Vérification":19,"Notaire":15,"Signé":5,"Clos":7,"Frais non payés":60} ; base {"Constitution":54,"Attente locataire":19,"Vérification":19,"Notaire":15,"Signé":5,"Clos":7} ; aucun écart |  |
| ADM-1-003 | ordinateur | Compteur « Frais non payés » conforme à la base | OK | Écran 60 ; base 60 |  |
| ADM-1-004 | ordinateur | Onglets « À faire par nous / En attente du client / Chez le notaire » : compteurs et lignes | OK | Compteurs 75 + 17 + 15 = 107 ; dossiers en cours en base : 107 ; lignes = compteurs : oui |  |
| ADM-1-005 | ordinateur | Répartition des dossiers entre les onglets selon l'étape | OK | Chez le notaire : 15 lignes dont 0 hors étape Notaire ; En attente du client : 17 lignes dont 0 en Vérification |  |
| ADM-1-006 | ordinateur | Ordre des lignes : les plus anciens d'abord | OK | À faire par nous : décroissant ; En attente du client : décroissant ; Chez le notaire : décroissant |  |
| ADM-1-007 | ordinateur | Pastilles d'ancienneté (vert < 3 j, orange 3 à 7 j, rouge > 7 j) et légende | OK | 107 lignes : 45 vertes, 3 orange, 59 rouges ; 0 incohérente(s) |  |
| ADM-1-008 | ordinateur | Mes neuf dossiers fictifs : onglet, étape, badge de paiement et prochaine action | OK | Les huit dossiers en cours sont dans le bon onglet avec la bonne action et le bon badge ; le dossier signé n'apparaît pas. Exemple : Logement recette ADM-1 1 Constitution Non payé Camille ProprioADM11 → locataire à ajouter Relancer le propriétaire · Bail nu 3 ans · Brouillon · prochaine relance le 17/11 aujourd'hui Ouvrir le do… |  |
| ADM-1-009 | ordinateur | Texte d'aide de chaque onglet (rythme des relances) | OK | À faire par nous : « Dossiers où BailNotarie doit agir, dont les relances dues (24 h après le début de l'attente, puis toutes les 4… » / En attente du client : « Le propriétaire ou le locataire doit agir ; la prochaine relance est indiquée. Dès qu'elle est due, le dossier… » / Chez le notaire : « Suivi uniquement : le notaire a… |  |
| ADM-1-010 | ordinateur | Colonne de droite : frais non payés (6 plus anciens), demandes des notaires, formulaires reçus aujourd'hui | OK | Non payés : 6 ligne(s) ; demandes des notaires : 0 (base 0) ; reçus aujourd'hui : 10 (base 76) |  |
| ADM-1-011 | ordinateur | Aucune erreur technique à l'affichage de « À traiter » | OK | Console : 2, erreurs de page : 0, réponses 5xx : 0, requêtes échouées : 0 — {"console":[{"url":"http://localhost:3210/interface","texte":"Failed to load resource: the server responded with a status of 404 (Not Found)"},{"url":"http://localhost:3210/interface","texte":"Failed to load resource: the server responded with a status … |  |
| ADM-1-012 | ordinateur | Tuile d'étape → liste des dossiers filtrée sur l'étape | OK | Tuile 19 ; liste « 19 dossiers » ; base 19 ; onglet actif « Vérification 19 » |  |
| ADM-1-013 | ordinateur | Tuile « Frais non payés » → liste filtrée « Non payés » avec le même nombre | KO | Constaté deux fois. Cette fois : tuile 63 (dossiers en cours non payés, base 63) ; la liste ouverte annonce « 70 dossiers » (non payés tous statuts confondus, signés et clos compris, base 70). Chaque nombre est juste, mais ils ne désignent pas la même chose. |  |
| ADM-1-014 | ordinateur | Bouton d'action d'une ligne (« Vérifier le dossier ») et lien d'adresse → fiche du dossier | OK | Ligne « Logement recette ADM-1 4 Vérification Payé Hugo ProprioADM14 → Léa LocataireADM14 Bail nu 3 ans · En cours de validation » ; bouton → fiche du dossier 4 : oui ; adresse → fiche du dossier 6 : oui | captures/adm1-014-ligne-dossier4-a-traiter.png |
| ADM-1-015 | ordinateur | Bouton « Nouveau dossier » de « À traiter » | KO | « À traiter » → /interface/clients/new (page « Nouveau client complet ») ; « Dossiers » → /interface/baux/new (page « Nouveau bail »). Même libellé, deux écrans différents. | captures/adm1-015-nouveau-dossier-depuis-a-traiter.png |
| ADM-1-016 | ordinateur | Champ « Rechercher » de « À traiter » | OK | Adresse /interface/recherche?q=recette-adm1-proprio4 ; résultats : le propriétaire fictif 4 est trouvé ; son dossier est listé | captures/adm1-016-recherche-depuis-a-traiter.png |
| ADM-1-045 | ordinateur | « À traiter » après une relance : prochaine échéance repoussée de 48 h | OK | Ligne : « Logement recette ADM-1 1 Constitution Non payé Camille ProprioADM11 → locataire à ajouter Relancer le propriétaire · Bail nu 3 ans · Brouillon · prochaine relance le 18/11 aujourd'hui Ouvrir le dossier » | captures/adm1-045-a-traiter-apres-relance.png |
| ADM-1-054 | ordinateur | Dossier créé depuis l'interface : présent dans « À traiter », non payé | OK | Onglet « En attente du client » : « Logement recette ADM-1 créé rcfqm Constitution Non payé Aline CréationADM1 → recette-adm1-locataire-cree-rcfqm@example.invalid Relancer le propriétaire · Bail nu 3 ans · Brouillon · prochaine relance le 17/11 aujourd'hui Ouvrir le dossier » (bouton A:Ouvrir le dossier) | captures/adm1-054-a-traiter-dossier-cree.png |

### Créations

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-017 | ordinateur | Ajouter un lead : contrôles de saisie (e-mail vide, e-mail invalide) | OK | Champ vide : « L'email est requis » ; adresse invalide : « Email invalide » ; bulle du navigateur : « Please include an '@' in the email address. 'pas-une-adresse' is missing an '@'. » ; rien créé en base (0) | captures/adm1-017-lead-erreurs.png |
| ADM-1-018 | ordinateur | Ajouter un lead par e-mail | OK | Message : « Lead créé avec succès. Un email de conversion a été envoyé. » ; base : profil LEAD, adresse recette-adm1-lead-q7p7t@example.invalid, lien LEAD/PENDING ; e-mail de conversion mis en file (« Bienvenue chez BailNotarie - Choisissez votre profil », lien http://localhost:3210/intakes/<jeton>/convert) |  |
| ADM-1-019 | ordinateur | Ajouter un lead : adresse déjà connue refusée | KO | Constaté deux fois. Pas de doublon (1 fiche). Message affiché : « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error. » … | captures/adm1-019-lead-doublon-toast.png |
| ADM-1-020 | ordinateur | Ajouter un lead par téléphone | OK | Vide : « Le numéro de téléphone est requis » ; numéro complet saisi « +33 6 39 98 79 54 » : message « Lead créé avec succès. Le lien de conversion est disponible dans les détails du client. » ; base : profil LEAD, téléphone +33639987954, lien LEAD (le numéro incomplet fait l'objet du cas ADM-1-038) | captures/adm1-020-lead-telephone.png |
| ADM-1-021 | ordinateur | Inviter le propriétaire : contrôles puis envoi | OK | Fenêtre « Envoyer le formulaire par email » ; vide : « Email invalide » ; adresse neuve recette-adm1-invite-q7p7t@example.invalid : message « Client créé avec succès. Un email a été envoyé au client. » ; base : profil PROPRIETAIRE, lien OWNER/PENDING ; e-mail d'invitation mis en file vers recette-adm1-invite-q7p7t@example.inval… | captures/adm1-021-inviter-proprietaire.png |
| ADM-1-022 | ordinateur | Inviter le propriétaire : adresse déjà utilisée refusée | KO | Constaté deux fois. Pas de doublon (1 fiche). Message affiché : « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error. » … | captures/adm1-022-invitation-doublon-toast.png |
| ADM-1-038 | ordinateur | Lead par téléphone : numéro incomplet refusé | KO | Constaté deux fois. Saisi « +33 6 39 » : sous le champ « (rien) », message « Lead créé avec succès. Le lien de conversion est disponible dans les détails du client. » ; en base : prospect créé avec le numéro +33639. Un premier prospect « +33612 » avait été créé de la même façon. | captures/adm1-038-lead-numero-incomplet.png |
| ADM-1-050 | ordinateur | Nouveau client complet : champs obligatoires | OK | Champs marqués d'un astérisque : Prénom *, Nom *, Email *, Adresse complète du bien *, Type de bail *, Montant du loyer *, Date de prise d'effet * ; messages sous les champs : Email invalide / L'adresse du bien est requise ; notification : « 2 erreurs de validation email: Email invalide, propertyFullAddress: L'adresse du bien e… | captures/adm1-050-nouveau-client-complet-erreurs.png |
| ADM-1-051 | ordinateur | Nouveau client complet : création d'un propriétaire avec son bien, son bail et l'e-mail du locataire | OK | Message « Client créé avec succès » ; page /interface/clients/new ; base : client PROPRIETAIRE (Aline CréationADM1, +33639980822, Française) ; bien « Logement recette ADM-1 créé rcfqm », 35 m² ; bail DRAFT, BAIL_NU_3_ANS, loyer 650 €, charges 50, dépôt 650, jour 5, payé : non ; locataire LOCATAIRE ; liens de formulaire : TENANT… | captures/adm1-051-nouveau-client-complet-rempli.png |
| ADM-1-052 | ordinateur | Nouveau client complet : libellés des listes déroulantes | KO | Constaté sur trois écrans (Nouveau client complet, modification d'un client, modification d'un bien). Situation familiale : CELIBATAIRE, MARIE, DIVORCE, VEUF, PACS ; type de bail : BAIL NU 3 ANS, BAIL NU 6 ANS, BAIL MEUBLE 1 ANS, BAIL MEUBLE 9 MOIS, COMMERCIAL 3 6 9, COMMERCIAL DEROGATOIRE |  |
| ADM-1-053 | ordinateur | Nouveau client complet : e-mail déjà utilisé | KO | Message affiché : « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included  » ; réponses 5xx : 1 ; fiches avec cet e-mail : 1 (pas de doublon) ; bien « 14 Place Bonnyaud » créé : 0 |  |
| ADM-1-055 | ordinateur | Nouveau dossier (/interface/baux/new) : contrôles de saisie | OK | Page « Nouveau bail » ; champs : Bien *, Locataire, Famille de bail, Type de contrat, Statut, Date de prise d'effet *, Date de fin, Jour de paiement mensuel, Loyer mensuel *, Charges mensuelles, Dépôt de garantie ; vide : Le bien est requis / La date de prise d'effet est requise / Le montant du loyer est requis ; dépôt 5 000 € … | captures/adm1-055-nouveau-bail-erreurs.png |
| ADM-1-056 | ordinateur | Nouveau dossier (/interface/baux/new) : création de bout en bout | OK | Sans jour de paiement : (aucun message sous les champs) ; baux sur le bien à ce moment : 1 ; listes : Logement recette ADM-1 8 / Adam LocataireADM18 / Habitation / Bail nu 3 ans / Brouillon ; après correction : message « Bail créé avec succès », page /interface/baux ; base : statut AWAITING_TENANT_FORM, BAIL_NU_3_ANS, loyer 720… | captures/adm1-056-nouveau-bail-rempli.png |
| ADM-1-057 | ordinateur | Dossier créé par /interface/baux/new : visible dans la liste et dans « À traiter » | OK | Ligne du nouveau dossier : Habitation 8 Place Bonnyaud 23000 Guéret Bail nu 3 ans · Appartement ‖ Non payés à régler ‖ Attente locataire Formulaire locataire en attente ‖ Sarah ProprioADM18 Adam LocataireADM18 ‖ Relancer le locataire Locataire ‖ Non assigné ‖ moins d'1 j ‖ Relancer Ouvrir le menu ; fiche : « Toggle Sidebar Doss… | captures/adm1-057-liste-dossier-cree.png |
| ADM-1-058 | ordinateur | Nouveau lien de formulaire (/interface/intakes/new) pour un bien fictif | OK | Page « Nouveau lien d'intake » ; cibles proposées : Propriétaire, Locataire ; message « Lien d'intake créé avec succès » ; page /interface/intakes ; base : lien OWNER/PENDING, bien fictif 9, bail aucun, personne rattachée : aucune | captures/adm1-058-nouveau-lien-formulaire.png |
| ADM-1-063 | ordinateur | Nouveau client complet : seuls les champs marqués obligatoires sont remplis | KO | Aucun message sous les champs (0) ; le serveur répond 500 ; notification : « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included … » ; client créé : non. Motif réel (validation rejouée hors serveur) : profession… | captures/adm1-063-client-complet-message-anglais.png |
| ADM-1-064 | ordinateur | Nouveau bail : locataire choisi sans jour de paiement | KO | Constaté deux fois. Baux sur le bien : 2 → 2 ; page /interface/baux/new ; messages relevés pendant 6 s : « An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest p » ; réponses 5xx : 1 | captures/adm1-064-nouveau-bail-sans-jour-de-paiement.png |
| ADM-1-065 | ordinateur | Nouveau lien de formulaire : le bail choisi est enregistré | KO | Constaté deux fois (deux liens créés). Bien enregistré : oui ; bail enregistré : NON (vide) — le formulaire envoie « leaseId » mais l'action enregistre « bailId », jamais renseigné : le choix du bail est perdu sans message. |  |
| ADM-1-066 | ordinateur | Dossier créé par l'équipe : relance du propriétaire et accès du propriétaire | OK | Fenêtre « Relancer Aline CréationADM1 » ; message « Relance envoyée : propriétaire (recette-adm1-cree-rcfqm@example.invalid) » ; e-mail « [TEST] Votre dossier de bail notarié n'est pas terminé », liens : /logoSans.png, , /client ; ce propriétaire a 0 lien de formulaire et 1 compte utilisateur ; lien suivi → /client/login ; sais… | captures/adm1-066-proprietaire-cree-acces.png |
| ADM-1-067 | ordinateur | Conversion d'un lead (/intakes/<jeton>/convert) en propriétaire | OK | Écran : «  » ; sans choix : « bouton « Continuer » inactif tant qu’aucun profil n’est choisi » ; après choix : « Profil mis à jour ! Vous allez recevoir un email avec le formulaire propriétaire. », page /intakes/<jeton> («  ») ; base : profil PROPRIETAIRE, liens LEAD/SUBMITTED, OWNER/PENDING ; e-mails en file : Formulaire de ba… | captures/adm1-067-conversion-lead.png |
| ADM-1-068 | ordinateur | Lien de conversion déjà utilisé | OK | Écran : « Lien invalide Le lien de conversion est invalide, manquant ou a déjà été utilisé. Lien de conversion invalide ou déjà utilisé Support » ; notification « Lien de conversion invalide ou déjà utilisé » ; profil du client : PROPRIETAIRE, 2 liens (inchangé) | captures/adm1-068-lien-conversion-reutilise.png |
| ADM-1-069 | ordinateur | Lien de l'invitation du propriétaire : code de connexion puis formulaire | OK | Accueil : « Accès sécurisé Confirmez que c'est vous Recevez votre code d'accès Vos informations sont protégées. Nous envoyons un code à usage unique à l'adresse du dossier r••••••t@e » ; code reçu par e-mail : oui ; écran de saisie : 1 champ(s), boutons Accéder au formulaire / Renvoyer dans 59s / 07 68 09 86 24 / ; après « Accé… | captures/adm1-069-invitation-formulaire-ouvert.png |

### Dossiers

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-023 | ordinateur | Liste des dossiers : total, pagination par 10, colonnes | OK | « 120 dossiers » (base 120) ; 10 lignes ; page 1 / 12 ; pied « Affichage de 1 à 10 sur 120 résultats » ; colonnes : Dossier, Frais de dossier, Étape, Propriétaire → Locataire, Prochaine action, Notaire, Attente |  |
| ADM-1-024 | ordinateur | Onglets d'étape : compteurs et filtrage, comparés à la base | OK | Constitution : onglet 56, liste 56, base 56, étape des lignes « Constitution Brouillon » ; Attente locataire : onglet 19, liste 19, base 19, étape des lignes « Attente locataire En attente du locataire / Attente locatair » ; Vérification : onglet 21, liste 21, base 21, étape des lignes « Vérification En cours de validation » ; … |  |
| ADM-1-025 | ordinateur | Recherche par e-mail : mes neuf dossiers, libellés de statut, badge de paiement, prochaine action | OK | « 9 dossiers », 9 lignes ; les neuf lignes sont conformes ; exemple : Habitation 1 Place Bonnyaud 23000 Guéret Bail nu 3 ans · Appartement ‖ Non payés à régler ‖ Constitution Brouillon ‖ Camille ProprioADM11 Locataire à ajouter ‖ Relancer le propriétaire Propriétaire ‖ Non assigné ‖ moins  | captures/adm1-025-dossiers-recherche-recette-adm1.png |
| ADM-1-026 | ordinateur | Recherche par nom, par adresse, sans résultat, effacement | OK | Nom : 1 dossier (le dossier 4) ; adresse : 5 (base 5) ; introuvable : « Aucun résultat trouvé. », pied « Aucun résultat » ; libellé du bien « recette adm-1 » : 1 dossier(s) ; après la croix : 120 dossiers | captures/adm1-026-dossiers-recherche-vide.png |
| ADM-1-027 | ordinateur | Recherche par le libellé du bien (nom affiché en gras dans la colonne « Dossier ») | Partiel | 1 dossier trouvé : la recherche porte sur l'adresse, les noms et les e-mails, pas sur le libellé du bien, alors que l'indication du champ dit « adresse, nom, e-mail » |  |
| ADM-1-028 | ordinateur | Filtre « Frais » : payés / non payés, compteurs du menu | OK | Menu : Non payés 69 / Payés 52 ; non payés : 69 (base 69), lignes toutes teintées et « Non payé » : oui ; payés : 52 (base 52), aucune teinte : oui ; mes dossiers payés : 7 ; non payés : 2 (dossiers 1 et 9) ; onglets avec le filtre : {"Tous":2,"Constitution":2,"Attente locataire":0,"Vérification":0,"Notaire":0,"Signé":0,"Clos":… | captures/adm1-028-dossiers-filtre-non-payes-recette.png |
| ADM-1-029 | ordinateur | Filtre « Type de bail » : habitation / commercial | OK | Mes dossiers commerciaux : 2 (dossiers 5 et 9) ; habitation : 7 ; global habitation : 104 (base 104) ; global commercial : 17 (base 17) | captures/adm1-029-dossiers-filtre-commercial-recette.png |
| ADM-1-030 | ordinateur | Filtre « Notaire » : non assigné, notaire fictif | OK | Menu : 14 options pour 13 notaires + « Non assigné » ; non assigné : 91 (base 91) ; notaire 1 : 2 (dossiers 6 et 7) ; notaire 2 : 1 (dossier 8) | captures/adm1-030-dossiers-filtre-notaire-recette.png |
| ADM-1-031 | ordinateur | Filtres combinés et bouton « Effacer » | OK | Notaire 1 + payés : 2 dossiers (adresse /interface/baux?notaire=<id>&page=1&payment=paid) ; après « Effacer » : 121 dossiers |  |
| ADM-1-032 | ordinateur | Tri : « Attente la plus longue » (défaut) et « Plus récents » | OK | Défaut (« Attente la plus longue ») conforme à la base : oui ; « Plus récents » conforme : oui ; retour au tri par défaut : oui ; colonne « Attente » : moins d'1 j, — |  |
| ADM-1-033 | ordinateur | Pagination : page suivante, précédente, taille de page, dernière page | OK | Page 1 : 10 lignes, précédent inactif : oui ; page 2 : 10 lignes, 0 doublon, pied « Affichage de 11 à 20 sur 121 résultats » ; retour page 1 identique : oui ; 25 / page : 25 lignes, « 1 / 5 » ; dernière page (5) : 21 lignes, suivant inactif : oui, pied « Affichage de 101 à 121 sur 121 résultats » ; page 9999 : « Aucun résultat … |  |
| ADM-1-034 | ordinateur | Adresse de liste avec des paramètres invalides | KO | Constaté deux fois. ?page=abc → liste affichée (121 dossiers) ; ?pageSize=xyz → liste affichée (121 dossiers) ; ?status=INCONNU → ERREUR (« Application error: a server-side exception has occurred while loading localhost (see the s ») ; ?payment=autre&type=AUTRE&sort=zzz → liste affichée (121 dossiers) ; ?notaire=inconnu → liste… | captures/adm1-034-dossiers-parametres-invalides.png |
| ADM-1-035 | ordinateur | Ouverture d'une fiche depuis la liste et retour avec les filtres conservés | OK | Avant : 2 dossiers ; fiche du dossier 6 ouverte ; après retour : même adresse : oui, 2 dossiers, champ de recherche « recette-adm1 » ; liens de retour dans la fiche : Dossiers → /interface/baux ; Dossiers → /interface/baux ; Dossiers → /interface/baux ; Dossiers → /interface/baux |  |
| ADM-1-036 | ordinateur | Menu « … » d'une ligne et lien du notaire | OK | Boutons de la ligne : Ouvrir, Ouvrir le menu ; menu : Voir, Modifier, Assigner à un notaire, Supprimer ; lien du notaire → /interface/notaires/<id>/dossiers (« Dossiers de Maître Recette ADM-1 1 ») | captures/adm1-036-dossiers-menu-ligne.png |
| ADM-1-037 | ordinateur | Aucune erreur technique pendant le parcours de la liste des dossiers | OK | Erreurs de page : 0, réponses 5xx : 0, requêtes échouées : 0, messages d'erreur console : 2 |  |

### Relances

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-040 | ordinateur | Bouton « Relancer » de la liste des dossiers : fenêtre qui montre l'e-mail et dit à qui | OK | Titre « Relancer Camille ProprioADM11 » ; contenu : Relancer Camille ProprioADM11 1 Place Bonnyaud 23000 Guéret Pas encore relancé · prochaine relance conseillée le 17/11/2026 À Camille ProprioADM11 · Propriétaire recette-adm1-proprio1@example.invalid Objet Votre dossier de bail notarié n'est pas terminé BN BailNotarie Bonjour … | captures/adm1-040-fenetre-relance-depuis-liste.png |
| ADM-1-041 | ordinateur | Relancer depuis la liste quand la relance n'est pas encore due (moins de 24 h, ou moins de 48 h après une relance) | KO | Constaté sur deux dossiers. Dossier 9 : fenêtre ouverte, suivi « Relancé 1 fois, dernier contact le 16/11/2026 · prochaine relance conseillée le 18/11/2026 », bouton « Envoyer la relance » grisé, 0 case à cocher pour choisir le destinataire, aucune explication. Depuis la fiche du même dossier, l'envoi est possible (cas ADM-1-04… | captures/adm1-041-relance-liste-envoi-grise.png |
| ADM-1-042 | ordinateur | Relance du propriétaire (formulaire à terminer) : envoi, e-mail reçu, trace | OK | Fenêtre « Relancer Camille ProprioADM11 », bouton d'envoi actif : oui ; message « Relance envoyée : propriétaire (recette-adm1-proprio1@example.invalid) » ; e-mail capturé : « [TEST] Votre dossier de bail notarié n'est pas terminé » vers "recette-adm1-proprio1@example.invalid", mot de l'équipe présent : oui, lien vers le formul… | captures/adm1-042-fenetre-relance-fiche-avec-mot.png |
| ADM-1-043 | ordinateur | Lien contenu dans l'e-mail de relance du propriétaire | OK | Adresse /intakes/<jeton> ; début de page : « Comment ça marche Visite guidée Avantages Tarif FAQ Simulateur Blog Se connecter Constituer mon dossier Accès sécurisé Confirmez que c'est vous Recevez votre code d'accès Vos informations sont protégé » | captures/adm1-043-lien-email-relance-proprietaire.png |
| ADM-1-044 | ordinateur | Trace de la relance sur la fiche et délai avant la suivante (48 h) | OK | Encadré : « Relances Propriétaire · terminer son formulaire Relancé 1 fois · prochaine relance le 18/11 E-mail · propriétaire 16/11 21:56 Terminer son formulaire · recette-adm1-proprio1@example.invalid « Mot de l'équipe pour la recette ADM-1 : n'hésitez pas à nous appeler. » par Équipe Recette ADM-1 » | captures/adm1-044-fiche-resume-relances.png |
| ADM-1-046 | ordinateur | Après deux relances sans réponse : proposition d'appel et « Noter l'appel » | OK | Avant la 2e relance : « Relancé 1 fois, dernier contact le 16/11/2026  » ; après : « 2 relances sans réponse : un appel sera plus efficace. », numéro affiché « +33 6 12 34 56 78 » ; message « Appel noté : prochaine relance dans 48 h » ; trace : CALL / OWNER par Équipe Recette ADM-1 ; encadré de la fiche : « Relances Propriétair… | captures/adm1-046-fenetre-relance-escalade-appel.png |
| ADM-1-047 | ordinateur | Relance du locataire (formulaire en attente) : e-mail avec le lien de son formulaire, suivi des envois | OK | Fenêtre « Relancer le locataire » (destinataire locataire fictif 3) ; message « Relance envoyée : locataire (recette-adm1-locataire3@example.invalid) » ; e-mail : « [TEST] Votre formulaire locataire est en attente », lien du formulaire présent : oui ; envois du formulaire : 1 → 2 ; trace EMAIL/TENANT/TENANT_FORM ; « À traiter »… | captures/adm1-047-fenetre-relance-locataire.png |
| ADM-1-048 | ordinateur | Locataire pas encore trouvé : « Reporter les rappels » (7 jours) | OK | Fenêtre « Demander le locataire à Louis ProprioADM12 » ; durées proposées : 7 jours, 14 jours, 30 jours ; message « Rappels reportés de 7 jours » ; trace : SNOOZE jusqu'au 23/11/2026 ; fiche : « Relances Propriétaire · indiquer son locataire Rappels reportés jusqu'au 23/11 Report · propriétaire 16/11 21:59 Indiquer son locatair… | captures/adm1-048-fenetre-demander-locataire-report.png |
| ADM-1-049 | ordinateur | Double clic sur « Envoyer la relance » : un seul envoi ; « Fermer » n'envoie rien | OK | Après « Fermer » : 0 relance ; après le double clic : 1 relance(s) tracée(s), 1 e-mail(s) capturé(s) |  |

### Formulaires envoyés

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-059 | ordinateur | Liste « Formulaires envoyés » : total, statuts, ligne du lien créé | OK | Menu « Formulaires envoyés » → page « Intakes » ; colonnes : Token, Cible, Personne concernée, Statut, Soumis le, Actions ; pied « Affichage de 1 à 10 sur 282 résultats » (base 282) ; statuts affichés sur la page : En attente, Révoqué, Soumis ; cibles : Locataire, Propriétaire, Lead ; ligne du lien créé : 728bbf4b... ‖ Propriét… | captures/adm1-059-formulaires-envoyes-ligne-creee.png |
| ADM-1-060 | ordinateur | Recherche « par token » dans les formulaires envoyés | KO | Avant : 10 lignes ; après la saisie : 10 lignes, pied « Affichage de 1 à 10 sur 282 résultats » — la liste ne change pas : le champ de recherche est sans effet (la page ne transmet pas la recherche à la requête) |  |
| ADM-1-061 | ordinateur | Lien créé : « Voir », régénérer le jeton, révoquer | OK | « Voir » → /intakes/<jeton> ; confirmations : « Êtes-vous sûr de vouloir régénérer le token ? L'ancien lien ne fonctionnera plus. » ; « Êtes-vous sûr de vouloir régénérer le token ? L'ancien lien ne fonctionnera plus. » ; « Êtes-vous sûr de vouloir révoquer ce lien ? Cette action est irréversible. » ; après annulation, jeton in… | captures/adm1-061-lien-revoque-ligne.png |
| ADM-1-062 | ordinateur | Ouverture d'un lien de formulaire : valide, périmé (jeton régénéré), révoqué | KO | Lien neuf : « Accès sécurisé Confirmez que c'est vous Ce formulaire ne peut pas être ouvert Ce formulaire n'est rattaché à aucun dossier. Contactez-nous pour accéder à ce formulaire. Bailnotarie est une plateforme de constitution de dossier de bail notarié en ligne, en 1 semaine avec force exécutoire immédiate, pour les proprié… | captures/adm1-061-lien-cree-ouvert.png |
| ADM-1-095 | ordinateur | Relance depuis la liste « Formulaires envoyés » | Non testé | La liste ne propose que « Voir », « Régénérer le token » et « Révoquer » : il n'y a pas de relance sur cet écran (les relances se font depuis « À traiter », la liste des dossiers et la fiche dossier, vérifiées aux cas ADM-1-040 à 049). |  |

### Clients

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-070 | ordinateur | Liste des clients : compteurs par rôle comparés à la base | OK | Onglets {"Tous":276,"Propriétaires":195,"Locataires":76,"Prospects":5} ; base : tous 276, propriétaires 195, locataires 76, prospects 5 ; phrase « 276 clients » ; 25 lignes affichées ; colonnes : Client, Rôle, Contact, Dossiers, Pièces et informations, Activité, Actions ; boutons d'en-tête : Ajouter un prospect, Inviter un prop… |  |
| ADM-1-071 | ordinateur | Recherche de clients par e-mail : mes clients fictifs, rôle, état, dossiers, action | OK | « 19 clients » (base 19) ; onglets filtrés {"Tous":19,"Propriétaires":11,"Locataires":7,"Prospects":1} ; propriétaire 4 : Hugo ProprioADM14 Particulier ‖ Propriétaire ‖ recette-adm1-proprio4@example.invalid +33 6 12 34 56 78 ‖ 4 Place Bonnyaud 23000 Guéret ‖ À vérifier Formulaire rempli le 16/11 ‖ aujourd'hui ‖ Vérifier Ouvrir … | captures/adm1-071-clients-recherche-recette-adm1.png |
| ADM-1-072 | ordinateur | Filtres de la liste des clients : rôle, état, « Bloquants seulement », aucun résultat, « Afficher plus » | OK | Total 19 ; par rôle : Propriétaires 11 (Propriétaire), Locataires 7 (Locataire), Prospects 1 (Prospect) ; bloquants : 4 (« 4 clients qui bloquent un dossier en cours · les propriétaires et loca ») ; états proposés : Tous, Pas commencé, Incomplet, À vérifier, Vérifié ; par état : {"Pas commencé":"4 (Pas)","Incomplet":"3 (Incompl… | captures/adm1-072-clients-bloquants-recette.png |
| ADM-1-073 | ordinateur | Fiche d'un client fictif : identité, pièces, dossiers liés, biens, formulaires et accès, détails | OK | Rubriques : Identité, Pièces, Dossiers, Biens, Formulaires et accès, Détails, Notes internes ; en-tête : « Client depuis le 16/11/2026 · 1 dossier en cours · 1 bien » ; éléments attendus absents : aucun | captures/adm1-073-fiche-client-fictif.png |
| ADM-1-074 | ordinateur | Fiche client : liens vers le dossier et vers le bien | OK | Dossier ouvert : oui ; bien ouvert : oui |  |
| ADM-1-075 | ordinateur | Fiche client : modification d'un champ sur place (profession), annulation | OK | Message « Profession enregistré » ; enregistré en base : oui ; nouvelle valeur affichée sans recharger : oui (après 1.5 s) ; après « Annuler » la base contient toujours la valeur enregistrée : oui | captures/adm1-075-fiche-client-apres-edition.png |
| ADM-1-076 | ordinateur | Fiche client : champ obligatoire vidé, téléphone invalide | OK | Nom vidé : bouton « Enregistrer » inactif, nom en base ensuite « ProprioADM14 » ; téléphone (champ de type tel) : saisie « abc » → champ « +33 », message « (bouton inactif) », téléphone en base +33612345678 | captures/adm1-076-fiche-client-nom-vide.png |
| ADM-1-077 | ordinateur | Fiche client : pièces (voir, ajouter un fichier, supprimer le fichier ajouté) | OK | Voir : visionneuse « Pièce d'identité Ouvrir dans un onglet Close » ; ajout : message « Pièce ajoutée », enregistré : oui, affiché : oui ; suppression : confirmation « Êtes-vous sûr de vouloir supprimer ce document ? recette-piece-ajoutee-adm1.pdf sera supprimé définitivement. Cette action est irréversible. Annuler Supprimer C … | captures/adm1-077-fiche-client-piece-ajoutee.png |
| ADM-1-078 | ordinateur | Modification d'un client (/interface/clients/[id]/edit) | OK | Préremplissage : {"prenom":"Hugo","nom":"ProprioADM14","email":"recette-adm1-proprio4@example.invalid","profession":"Testeuse ADM-1 n5lh","adresse":"10 bis rue de Rivoli 75004 Paris","naissance":"01/01/1980"} ; e-mail invalide : « Please include an '@' in the email address. 'pas-une-adresse' is missing an '@'. » (e-mail en base… | captures/adm1-078-modifier-client.png |

### Biens

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-080 | ordinateur | Liste des biens et fiche d'un bien fictif | OK | /interface/properties renvoie vers /interface/clients ; fiche : éléments attendus absents : aucun ; fautes de texte : « Plein propriété », « Bail nue » ; liens du fil d'Ariane : Biens→/interface/properties ; Clients→/interface/clients | captures/adm1-080-fiche-bien-fictif.png |
| ADM-1-081 | ordinateur | DPE d'un bien : saisie de la date d'établissement | OK | Avant : « DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE C Énergie C Climat (GES) Date du DPE à saisir pour vérifier sa validité Saisir le  » ; fenêtre : « DPE du bien Classe énergie C Classe climat (GES) C Date d'établissement La date « Établi le » écrite en haut de la première page du DPE. La validité se calcule à partir de cette date… | captures/adm1-081-dpe-saisie.png |
| ADM-1-082 | ordinateur | Modification d'un bien (/interface/properties/[id]/edit) | OK | Enregistrement : « Bien modifié avec succès », base : libellé « Logement recette ADM-1 4 modifié », 43 m², adresse « 4 Place Bonnyaud 23000 Guéret », DPE C, propriétaire inchangé ; page /interface/properties/<id> ; sous-titre « Remplissez les informations pour créer un nouveau bien » sur une page de modification (préremplissage… | captures/adm1-082-modifier-bien.png |
| ADM-1-096 | ordinateur | Modification d'un bien : préremplissage et enregistrement sans changement | OK | En base avant : surface 43, code postal 23000, ville Guéret ; champs affichés : {"libelle":"Logement recette ADM-1 4 modifié","surface":"43","cp":"","ville":"","adresse":"4 Place Bonnyaud 23000 Guéret"} ; message « Bien modifié avec succès » ; valeurs changées par cet enregistrement « sans changement » : aucune | captures/adm1-096-modifier-bien-preremplissage.png |
| ADM-1-098 | ordinateur | Modification d'un bien : surface négative | KO | Constaté deux fois. Surface en base avant : 43 ; champ prérempli « 43 » (type number) ; saisi « -7 » ; messages : « Bien modifié avec succès » ; surface en base après : null (valeur ressaisie ensuite : 43). Au premier essai (« -5 »), « Bien modifié avec succès » s'était affiché et la surface (42) avait été effacée. | captures/adm1-098-surface-negative.png |

### Notaires

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-083 | ordinateur | Liste des notaires : total et nombre de dossiers assignés | OK | Colonnes : Nom, Email, Dossiers assignés, Créé le ; pied « Affichage de 1 à 10 sur 13 résultats » ; recherche « Recette ADM-1 » : 2 ligne(s) dont 2 à moi ; notaire 1 : Maître Recette ADM-1 1 ‖ recette-adm1-notaire1@example.invalid ‖ 2 dossiers Voir ‖ 16/11/2026 20:19 ; notaire 2 : Maître Recette ADM-1 2 ‖ recette-adm1-notaire2@… | captures/adm1-083-notaires-recherche-recette.png |
| ADM-1-084 | ordinateur | Création d'un notaire fictif : contrôles, création, e-mail de bienvenue | OK | Fenêtre « Créer un notaire » ; vide : Email invalide ; création : « Notaire créé avec succès » ; base : rôle NOTAIRE, nom « Maître Recette ADM-1 Créé » ; e-mail de bienvenue : mis en file (email, userName, loginUrl), lien http://localhost:3210/notaire/login | captures/adm1-084-creer-notaire.png |
| ADM-1-085 | ordinateur | Création d'un notaire : adresse déjà utilisée | KO | Message affiché : « Notaire créé avec succès » ; réponses 5xx : 0 ; comptes avec cette adresse : 1 |  |
| ADM-1-086 | ordinateur | Dossiers d'un notaire fictif | OK | « 2 dossiers assignés » ; lignes : Chloé ProprioADM17 ‖ 7 Place Bonnyaud 23000 Guéret ‖ BAIL_NU_3_ANS ‖ 16/11/2026 20:19 ‖  /// Manon ProprioADM16 ‖ 6 Place Bonnyaud 23000 Guéret ‖ BAIL_NU_3_ANS ‖ 16/11/2026 20:19 ‖  ; liens : /interface/clients/<id>, /interface/properties/<id>, /interface/baux/<id> ; fiche du dossier 6 ouverte… | captures/adm1-086-dossiers-notaire-fictif.png |
| ADM-1-094 | ordinateur | « Créer un notaire » avec l'e-mail d'un compte client existant | KO | Constaté deux fois (notaire fictif existant au cas ADM-1-085, compte client ici). Message « Notaire créé avec succès », aucune confirmation ; rôle du compte : UTILISATEUR → NOTAIRE (fiche client toujours rattachée : oui) ; e-mail de bienvenue notaire : 0 ; ce locataire qui ouvre /client arrive maintenant sur /notaire. Le code c… | captures/adm1-094-creer-notaire-compte-existant.png |

### Notifications

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-087 | ordinateur | Notifications : liste et compteur de non lues | OK | Base : 17 non lue(s) sur 17 ; page : « 17 notifications non lues » ; pastille de la cloche : « 9+ » ; boutons : Tout marquer comme lu (le marquage d'une seule notification fait l'objet du cas ADM-1-097) | captures/adm1-087-notifications.png |
| ADM-1-088 | ordinateur | « Tout marquer comme lu » | OK | Mes non lues en base : 0 ; phrase « Toutes les notifications sont lues » ; bouton encore présent : non ; non lues des autres comptes toujours présentes : 511 |  |
| ADM-1-097 | ordinateur | Marquer une seule notification comme lue | OK | « 6 notifications non lues » ; bouton à coche présent : oui (bouton sans libellé ni infobulle) ; non lues en base : 6 → 5 |  |

### Recherche

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-089 | ordinateur | Recherche globale : par nom, e-mail, adresse, libellé, société ; résultats cliquables | OK | Nom : 1 dossier, 1 client, 0 bien ; e-mail du locataire 3 : 1 dossier, 1 client ; adresse : 5 dossiers, 5 biens (base 5 biens) ; libellé « recette ADM-1 » : 10 dossiers, 10 biens ; société : 1 dossier, 1 client ; clic sur le dossier et sur le client : fiches ouvertes ; lien vers le bien présent : non | captures/adm1-089-recherche-nom.png |
| ADM-1-090 | ordinateur | Recherche globale : vide, un seul caractère, sans résultat, caractères spéciaux, texte très long | OK | Vide : « echercher Saisissez au moins deux caractères. » (aucune liste) ; « a » : aucune liste ; introuvable : « Aucun résultat pour « zzz-introuvable-adm1 ». » ; caractères spéciaux : Aucun résultat pour « %_'"<b> ». ; 150 caractères : aucun résultat, pas d'erreur ; réponses 5xx : 0 | captures/adm1-090-recherche-sans-resultat.png |

### Navigation

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-091 | ordinateur | Menu latéral : entrées, repli, entrée active | OK | Entrées : BailNotarie→/interface ; À traiter→/interface ; Dossiers→/interface/baux ; Clients→/interface/clients ; Notaires→/interface/notaires (active) ; Formulaires envoyés→/interface/intakes ; Notifications→/interface/notifications ; largeur 256 px (expanded) → 66 px (collapsed) après repli ; 256 px après rechargement ; navig… |  |
| ADM-1-092 | ordinateur | Fil d'Ariane | OK | Fiche client : Clients→/interface/clients ; modification : Fiche→/interface/clients/<id> ; bien : Biens→/interface/properties (le lien « Biens » renvoie à la liste des clients) ; nouveau bail : Dossiers→/interface/baux ; nouveau lien : Formulaires envoyés→/interface/intakes ; « Fiche » ramène à la fiche du client : oui |  |
| ADM-1-093 | ordinateur | Déconnexion | OK | Menu du compte : Déconnexion ; message «  » ; page après déconnexion : /login ; /interface/baux ensuite : renvoi vers /login | captures/adm1-093-apres-deconnexion.png |

### Droits

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-100 | ordinateur | Espace de l'équipe fermé à un propriétaire fictif (dossier 4) | OK | 14 adresses essayées ; 0 affichée(s) ; destinations : /login | captures/adm1-100-acces-interface-proprietaire.png |
| ADM-1-101 | ordinateur | Espace de l'équipe fermé à un locataire fictif (dossier 4) | OK | 14 adresses essayées ; 0 affichée(s) ; destinations : /login ; /login (pas de réponse) | captures/adm1-101-acces-interface-locataire.png |
| ADM-1-102 | ordinateur | Espace de l'équipe fermé à un notaire fictif | OK | 14 adresses essayées ; 0 affichée(s) ; destinations : /login | captures/adm1-102-acces-interface-notaire.png |
| ADM-1-103 | ordinateur | Espace de l'équipe fermé à un visiteur non connecté | OK | 14 adresses essayées ; 0 affichée(s) ; destinations : /login | captures/adm1-103-acces-interface-visiteur.png |
| ADM-1-104 | ordinateur | Actions serveur de l'équipe rejouées sans session ou avec un compte client / notaire | OK | sans session : lecture du panneau de relance → 500, aucune donnée ; envoi de relance → 500 ; création de lead → 500 / propriétaire : lecture du panneau de relance → 500, aucune donnée ; envoi de relance → 500 ; création de lead → 500 / locataire : lecture du panneau de relance → 500, aucune donnée ; envoi de relance → 500 ; cré… |  |

### Petits écrans

| Cas | Appareil | Fonctionnalité | Résultat | Constaté | Capture |
|---|---|---|---|---|---|
| ADM-1-110 | tablette | Menu latéral : ouverture, navigation, fermeture | OK | Menu visible avant le bouton : oui ; après : liens visibles ; « Clients » → /interface/clients ; panneau refermé : oui (pas de capture : la page des notaires affiche des données réelles) |  |
| ADM-1-111 | tablette | « À traiter » sur tablette : boutons d'en-tête et onglets | KO | Constaté trois fois. Écran 768 px, menu latéral 256 px. « Inviter le propriétaire » : bord droit à 897 px (coupé) ; onglet « Chez le notaire » : bord droit à 809 px (coupé) ; la page ne défile pas horizontalement : ce qui dépasse est hors d'atteinte. Menu replié : bord droit du bouton à 736 px (visible). Le reste de l'écran (tu… | captures/adm1-111-tablette-a-traiter-en-tete.png |
| ADM-1-112 | tablette | Fenêtres « Ajouter un lead » et « Inviter le propriétaire » | OK | Lead : fenêtre 512×404 px à (128, 310) dans 768×1024, bouton de validation visible, saisie « essai@example.invalid » ; invitation : fenêtre 512×262 px à (128, 381) dans 768×1024, bouton visible | captures/adm1-110-fenetre-lead-tablette.png |
| ADM-1-113 | tablette | Liste des dossiers : cartes ou tableau, onglets d'étape, pastilles de filtre | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; 10 cartes, tableau : tient en entier ; onglets d'étape : tiennent en entier ; menu « Frais » : dans l'écran ; dossier 1 : « Habitation 1 Place Bonnyaud 23000 Guéret Bail nu 3 ans · Appartement Non payés à régler Constitution Brouillon Camille ProprioADM11 Locat… | captures/adm1-110-dossiers-tablette.png |
| ADM-1-114 | tablette | Fenêtre de relance | OK | Fenêtre 600×805 px à (84, 109) dans 768×1024 ; contenu qui dépasse à droite : non ; aperçu en défilement interne : false ; bouton d'envoi visible ; « Fermer » visible | captures/adm1-110-fenetre-relance-tablette.png |
| ADM-1-115 | tablette | Fiche dossier lisible | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; titre « 4 Place Bonnyaud 23000 Guéret » ; bouton principal 231×44 px, dans l'écran ; plus petit texte : 11.5 px | captures/adm1-110-fiche-dossier-tablette.png |
| ADM-1-116 | tablette | Liste des clients sur tablette : boutons d'en-tête | KO | Constaté deux fois. « Nouveau client » : bord droit à 963 px pour un écran de 768 px (COUPÉ, pas de défilement possible). | captures/adm1-116-tablette-clients-en-tete.png |
| ADM-1-117 | tablette | Fiche d'un client fictif | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 102 px de large, dans l'écran | captures/adm1-110-fiche-d-un-client-fictif-tablette.png |
| ADM-1-118 | tablette | Fiche d'un bien fictif | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) | captures/adm1-110-fiche-d-un-bien-fictif-tablette.png |
| ADM-1-119 | tablette | Nouveau client complet (formulaire) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 183 px de large, dans l'écran | captures/adm1-110-nouveau-client-complet-formula-tablette.png |
| ADM-1-120 | tablette | Nouveau bail sur tablette : liste « Locataire » | KO | Constaté deux fois. Liste « Locataire » : bord droit à 806 px pour un écran de 768 px (COUPÉE) ; bloc le plus large : button.border-input.data-[placeholder]:text-muted-foreground.[&_svg:not([class*='text-'])]:text-muted-foreground.focus-visible:border (290 px). | captures/adm1-120-tablette-nouveau-bail.png |
| ADM-1-121 | tablette | Formulaires envoyés (tableau) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : défilement interne (957 px dans 454) ; pas de capture (données réelles à l'écran) |  |
| ADM-1-122 | tablette | Notaires (tableau) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : défilement interne (610 px dans 454) ; pas de capture (données réelles à l'écran) |  |
| ADM-1-123 | tablette | Notifications | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 193 px de large, dans l'écran ; pas de capture (données réelles à l'écran) |  |
| ADM-1-124 | tablette | Recherche (« ProprioADM14 ») | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) | captures/adm1-110-recherche-proprioadm14--tablette.png |
| ADM-1-125 | telephone | Menu latéral : ouverture, navigation, fermeture | OK | Panneau visible avant : non ; bouton du menu : [{"visible":true,"l":28,"h":28}] ; après le toucher : panneau ouvert, 288 px sur 412, dans l'écran ; liens : BailNotarie, À traiter, Dossiers, Clients, Notaires, Formulaires envoyés, Notifications ; « Clients » → /interface/clients ; panneau refermé : oui | captures/adm1-125-menu-telephone.png |
| ADM-1-126 | telephone | « À traiter » : tuiles, onglets, boutons d'en-tête, ligne d'un dossier | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; boutons d'en-tête : Dossier / Lead / Inviter ; onglets : À faire 77 / Client 20 / Notaire 12 ; rangée de tuiles : défile dans sa rangée (1112 px dans 412) ; ligne du dossier 4 : 378 px de large, bouton « Vérifier le dossier » 142×36 px ; textes coupés : aucun | captures/adm1-125-a-traiter-ligne-telephone.png |
| ADM-1-127 | telephone | Fenêtres « Ajouter un lead » et « Inviter le propriétaire » | OK | Lead : fenêtre 380×424 px à (16, 208) dans 412×839, bouton de validation visible, saisie « essai@example.invalid » ; invitation : fenêtre 380×282 px à (16, 279) dans 412×839, bouton visible | captures/adm1-125-fenetre-lead-telephone.png |
| ADM-1-128 | telephone | Liste des dossiers : cartes ou tableau, onglets d'étape, pastilles de filtre | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; 10 cartes, tableau : remplacé par des cartes ; onglets d'étape : défilent dans leur rangée ; menu « Frais » : dans l'écran ; dossier 1 : « Constitution Habitation Non payés moins d'1 j Ouvrir le menu 1 Place Bonnyaud 23000 Guéret Camille ProprioADM11 → Locatair… | captures/adm1-125-dossiers-telephone.png |
| ADM-1-129 | telephone | Fenêtre de relance | OK | Fenêtre 380×772 px à (16, 34) dans 412×839 ; contenu qui dépasse à droite : non ; aperçu en défilement interne : true ; bouton d'envoi visible ; « Fermer » visible | captures/adm1-125-fenetre-relance-telephone.png |
| ADM-1-130 | telephone | Fiche dossier lisible | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; titre « 4 Place Bonnyaud 23000 Guéret » ; bouton principal 380×44 px, dans l'écran ; plus petit texte : 11.5 px | captures/adm1-125-fiche-dossier-telephone.png |
| ADM-1-131 | telephone | Liste des clients (recherche « recette-adm1 ») | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) | captures/adm1-125-liste-des-clients-recherche-re-telephone.png |
| ADM-1-132 | telephone | Fiche d'un client fictif | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 102 px de large, dans l'écran | captures/adm1-125-fiche-d-un-client-fictif-telephone.png |
| ADM-1-133 | telephone | Fiche d'un bien fictif | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) | captures/adm1-125-fiche-d-un-bien-fictif-telephone.png |
| ADM-1-134 | telephone | Nouveau client complet (formulaire) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 183 px de large, dans l'écran | captures/adm1-125-nouveau-client-complet-formula-telephone.png |
| ADM-1-135 | telephone | Nouveau bail (formulaire) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 112 px de large, dans l'écran | captures/adm1-125-nouveau-bail-formulaire--telephone.png |
| ADM-1-136 | telephone | Formulaires envoyés (tableau) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : défilement interne (957 px dans 378) ; pas de capture (données réelles à l'écran) |  |
| ADM-1-137 | telephone | Notaires (tableau) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : défilement interne (610 px dans 378) ; pas de capture (données réelles à l'écran) |  |
| ADM-1-138 | telephone | Notifications | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 193 px de large, dans l'écran ; pas de capture (données réelles à l'écran) |  |
| ADM-1-139 | telephone | Recherche (« ProprioADM14 ») | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) | captures/adm1-125-recherche-proprioadm14--telephone.png |
| ADM-1-140 | iphone | Menu latéral : ouverture, navigation, fermeture | OK | Panneau visible avant : non ; bouton du menu : [{"visible":true,"l":28,"h":28}] ; après le toucher : panneau ouvert, 288 px sur 390, dans l'écran ; liens : BailNotarie, À traiter, Dossiers, Clients, Notaires, Formulaires envoyés, Notifications ; « Clients » → /interface/clients ; panneau refermé : oui | captures/adm1-140-menu-iphone.png |
| ADM-1-141 | iphone | « À traiter » : tuiles, onglets, boutons d'en-tête, ligne d'un dossier | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; boutons d'en-tête : Dossier / Lead / Inviter ; onglets : À faire 77 / Client 20 / Notaire 12 ; rangée de tuiles : défile dans sa rangée (1112 px dans 390) ; ligne du dossier 4 : 356 px de large, bouton « Vérifier le dossier » 142×36 px ; textes coupés : aucun | captures/adm1-140-a-traiter-ligne-iphone.png |
| ADM-1-142 | iphone | Fenêtres « Ajouter un lead » et « Inviter le propriétaire » | OK | Lead : fenêtre 358×444 px à (16, 110) dans 390×664, bouton de validation visible, saisie « essai@example.invalid » ; invitation : fenêtre 358×282 px à (16, 191) dans 390×664, bouton visible | captures/adm1-140-fenetre-lead-iphone.png |
| ADM-1-143 | iphone | Liste des dossiers : cartes ou tableau, onglets d'étape, pastilles de filtre | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; 10 cartes, tableau : remplacé par des cartes ; onglets d'étape : défilent dans leur rangée ; menu « Frais » : dans l'écran ; dossier 1 : « Constitution Habitation Non payés moins d'1 j Ouvrir le menu 1 Place Bonnyaud 23000 Guéret Camille ProprioADM11 → Locatair… | captures/adm1-140-dossiers-iphone.png |
| ADM-1-144 | iphone | Fenêtre de relance | OK | Fenêtre 358×611 px à (16, 27) dans 390×664 ; contenu qui dépasse à droite : non ; aperçu en défilement interne : true ; bouton d'envoi visible ; « Fermer » visible | captures/adm1-140-fenetre-relance-iphone.png |
| ADM-1-145 | iphone | Fiche dossier lisible | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; titre « 4 Place Bonnyaud 23000 Guéret » ; bouton principal 358×44 px, dans l'écran ; plus petit texte : 11.5 px | captures/adm1-140-fiche-dossier-iphone.png |
| ADM-1-150 | petit | Menu latéral : ouverture, navigation, fermeture | OK | Panneau visible avant : non ; bouton du menu : [{"visible":true,"l":28,"h":28}] ; après le toucher : panneau ouvert, 288 px sur 320, dans l'écran ; liens : BailNotarie, À traiter, Dossiers, Clients, Notaires, Formulaires envoyés, Notifications ; « Clients » → /interface/clients ; panneau refermé : oui | captures/adm1-150-menu-petit.png |
| ADM-1-151 | petit | « À traiter » : tuiles, onglets, boutons d'en-tête, ligne d'un dossier | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; boutons d'en-tête : Dossier / Lead / Inviter ; onglets : À faire 76 / Client 20 / Notaire 13 ; rangée de tuiles : défile dans sa rangée (1112 px dans 320) ; ligne du dossier 4 : 286 px de large, bouton « Vérifier le dossier » 142×36 px ; textes coupés : aucun | captures/adm1-150-a-traiter-ligne-petit.png |
| ADM-1-152 | petit | Fenêtres « Ajouter un lead » et « Inviter le propriétaire » | OK | Lead : fenêtre 288×464 px à (16, 52) dans 320×568, bouton de validation visible, saisie « essai@example.invalid » ; invitation : fenêtre 288×300 px à (16, 134) dans 320×568, bouton visible | captures/adm1-150-fenetre-lead-petit.png |
| ADM-1-153 | petit | Liste des dossiers : cartes ou tableau, onglets d'étape, pastilles de filtre | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; 10 cartes, tableau : remplacé par des cartes ; onglets d'étape : défilent dans leur rangée ; menu « Frais » : dans l'écran ; dossier 1 : « Constitution Habitation Non payés moins d'1 j Ouvrir le menu 1 Place Bonnyaud 23000 Guéret Camille ProprioADM11 → Locatair… | captures/adm1-150-dossiers-petit.png |
| ADM-1-154 | petit | Fenêtre de relance | OK | Fenêtre 288×523 px à (16, 23) dans 320×568 ; contenu qui dépasse à droite : non ; aperçu en défilement interne : true ; bouton d'envoi visible ; « Fermer » visible | captures/adm1-150-fenetre-relance-petit.png |
| ADM-1-155 | petit | Fiche dossier lisible | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; titre « 4 Place Bonnyaud 23000 Guéret » ; bouton principal 288×44 px, dans l'écran ; plus petit texte : 11.5 px | captures/adm1-150-fiche-dossier-petit.png |
| ADM-1-160 | portable | Menu latéral : ouverture, navigation, fermeture | OK | Menu visible avant le bouton : oui ; après : liens visibles ; « Clients » → /interface/clients ; panneau refermé : oui (pas de capture : la page des notaires affiche des données réelles) |  |
| ADM-1-161 | portable | « À traiter » : tuiles, onglets, boutons d'en-tête, ligne d'un dossier | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; boutons d'en-tête : Nouveau dossier / Ajouter un lead / Inviter le propriétaire ; onglets : À faire par nous 76 / En attente du client 22 / Chez le notaire 13 ; rangée de tuiles : tient en entier ; ligne du dossier 4 : 590 px de large, bouton « Vérifier le doss… | captures/adm1-160-a-traiter-ligne-portable.png |
| ADM-1-162 | portable | Fenêtres « Ajouter un lead » et « Inviter le propriétaire » | OK | Lead : fenêtre 512×404 px à (384, 158) dans 1280×720, bouton de validation visible, saisie « essai@example.invalid » ; invitation : fenêtre 512×262 px à (384, 229) dans 1280×720, bouton visible | captures/adm1-160-fenetre-lead-portable.png |
| ADM-1-163 | portable | Liste des dossiers : cartes ou tableau, onglets d'étape, pastilles de filtre | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; 10 cartes, tableau : tient en entier ; onglets d'étape : tiennent en entier ; menu « Frais » : dans l'écran ; dossier 1 : « Habitation 1 Place Bonnyaud 23000 Guéret Bail nu 3 ans · Appartement Non payés à régler Constitution Brouillon Camille ProprioADM11 Locat… | captures/adm1-160-dossiers-portable.png |
| ADM-1-164 | portable | Fenêtre de relance | OK | Fenêtre 600×662 px à (340, 29) dans 1280×720 ; contenu qui dépasse à droite : non ; aperçu en défilement interne : true ; bouton d'envoi visible ; « Fermer » visible | captures/adm1-160-fenetre-relance-portable.png |
| ADM-1-165 | portable | Fiche dossier lisible | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; titre « 4 Place Bonnyaud 23000 Guéret » ; bouton principal 231×44 px, dans l'écran ; plus petit texte : 11.5 px | captures/adm1-160-fiche-dossier-portable.png |
| ADM-1-166 | portable | Liste des clients (recherche « recette-adm1 ») | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : défilement interne (1078 px dans 950) | captures/adm1-160-liste-des-clients-recherche-re-portable.png |
| ADM-1-167 | portable | Fiche d'un client fictif | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 102 px de large, dans l'écran | captures/adm1-160-fiche-d-un-client-fictif-portable.png |
| ADM-1-168 | portable | Fiche d'un bien fictif | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) | captures/adm1-160-fiche-d-un-bien-fictif-portable.png |
| ADM-1-169 | portable | Nouveau client complet (formulaire) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 183 px de large, dans l'écran | captures/adm1-160-nouveau-client-complet-formula-portable.png |
| ADM-1-170 | portable | Nouveau bail (formulaire) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 112 px de large, dans l'écran | captures/adm1-160-nouveau-bail-formulaire--portable.png |
| ADM-1-171 | portable | Formulaires envoyés (tableau) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : défilement interne (957 px dans 950) ; pas de capture (données réelles à l'écran) |  |
| ADM-1-172 | portable | Notaires (tableau) | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : tient en entier ; pas de capture (données réelles à l'écran) |  |
| ADM-1-173 | portable | Notifications | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) ; bouton de validation 193 px de large, dans l'écran ; pas de capture (données réelles à l'écran) |  |
| ADM-1-174 | portable | Recherche (« ProprioADM14 ») | OK | Page : pas de défilement horizontal ; éléments hors écran : aucun ; tableaux : aucun tableau visible (cartes ou formulaire) | captures/adm1-160-recherche-proprioadm14--portable.png |

## 4. Observations (ne sont pas des défauts)

- Sur téléphone, le bouton qui ouvre le menu mesure 28 × 28 px : petit pour le doigt. Certaines notifications s’intitulent seulement « Nouvelle notification », sans dire de quoi il s’agit.
- Vocabulaire : le menu dit « Formulaires envoyés », la page s’intitule « Intakes — Gestion des liens d’intake », le bouton « Nouveau lien » ouvre « Nouveau lien d’intake », les colonnes s’appellent « Token » et « Cible ». Jargon interne visible par l’équipe.
- Les messages de saisie mélangent « Email » et « e-mail » ; la notification de « Nouveau client complet » affiche les noms techniques des champs (« propertyFullAddress: L’adresse du bien est requise ») ; prénom et nom, marqués obligatoires, ne sont pas signalés quand tout est vide.
- Dans les champs téléphone, la liste des pays est en anglais (« Afghanistan, Åland Islands… »). La bulle du navigateur sur un e-mail invalide est aussi en anglais ; c’est le seul contrôle de l’e-mail sur la page de modification d’un client.
- La recherche de la liste des dossiers porte sur l’adresse, les noms et les e-mails, mais pas sur le libellé du bien, pourtant affiché en gras en première colonne ; la page « Recherche » le trouve.
- Un dossier créé par « Nouveau client complet » reste « Brouillon — Relancer le propriétaire » alors que l’équipe a tout saisi ; le propriétaire n’a pas de lien de formulaire (la relance le renvoie vers /client, où il obtient bien un code de connexion) ; le locataire, lui, reçoit tout de suite son formulaire.
- Un propriétaire, un locataire ou un notaire connecté qui ouvre une adresse de /interface est renvoyé vers /login (et non vers son propre espace) : sûr, mais déroutant pour quelqu’un de déjà connecté.
- Le repli du menu latéral n’est pas mémorisé : après rechargement de la page, le menu revient déplié.
- Notifications : le bouton qui marque une notification comme lue est une coche sans libellé ni infobulle.
- Fiche d’un bien : « Plein propriété » (au lieu de « Pleine propriété ») et « Bail nue 3 ans » ; la page de modification d’un bien garde le sous-titre « Remplissez les informations pour créer un nouveau bien » et n’affiche pas le code postal ni la ville pourtant connus (ils sont conservés à l’enregistrement).
- Serveur de recette partagé : 10 à 20 s pour afficher certaines pages pendant la campagne (huit agents en parallèle) ; aucune lenteur attribuable à un écran en particulier.
- La file « À traiter » charge au plus 200 dossiers en cours (une centaine pendant la campagne) : au-delà, la somme des onglets ne correspondrait plus aux tuiles.

## 5. Non testé, et pourquoi

- ADM-1-095 — Relance depuis la liste « Formulaires envoyés » : La liste ne propose que « Voir », « Régénérer le token » et « Révoquer » : il n'y a pas de relance sur cet écran (les relances se font depuis « À traiter », la liste des dossiers et la fiche dossier, vérifiées aux cas ADM-1-040 à 049).
- Bouton « Relancer le propriétaire / le locataire » directement dans « À traiter » (relance « due ») : mes dossiers fictifs ont été créés le jour même, leur première relance ne devient due qu’après 24 h, et la base est en lecture seule pour les scripts (impossible d’antidater). La même fenêtre a été vérifiée depuis la liste des dossiers et depuis la fiche (cas ADM-1-040 à 049), y compris l’escalade « appel » après deux relances ; les libellés « Relancer ou classer sans suite » et « Relancer via le propriétaire » (contact sans téléphone) n’ont pas été vus à l’écran.
- « Classer sans suite » depuis la fenêtre de relance (proposé seulement pour un propriétaire sans téléphone relancé deux fois) : non rencontré.
- Rôles OPERATEUR et REVIEWER : aucun compte fictif de ce rôle dans mes données ; le code de app/interface/layout.tsx renvoie vers /login tout compte qui n’est pas ADMINISTRATEUR.
- Conversion d’un lead en locataire (avec e-mail du propriétaire) : seule la conversion en propriétaire a été faite, faute de temps.
- Lead par téléphone : le lien de conversion « disponible dans les détails du client » n’a pas été recherché sur la fiche du prospect.
- Client « Entreprise » dans « Nouveau client complet », personnes supplémentaires, et pièces jointes de ce formulaire : non essayés.
- Fiche dossier en profondeur (validation, envoi au notaire, changement de statut, messagerie) : périmètre de l’agent ADM-2 ; seule sa lisibilité sur petits écrans a été regardée ici.
- Création d’un notaire avec l’e-mail d’un compte de l’équipe : non essayé pour ne pas retirer son accès à un compte ; le code traite ce cas comme celui du locataire fictif (défaut « Créer un notaire »).

## 6. Données créées (pour le nettoyage)

- Prospect par e-mail : recette-adm1-lead-q7p7t@example.invalid (client cmwjq80g40036x100tzp4hzko).
- Prospect par téléphone : +33639987954 (client cmwjqhgb5006jx100c9kffwrt) ; deux autres prospects aux numéros incomplets « +33612 » et « +33639 » (défaut « numéro de trois chiffres accepté »).
- Propriétaire invité : recette-adm1-invite-q7p7t@example.invalid (client cmwjqaqex004fx100xzz2s0m1, lien de formulaire en attente).
- « Nouveau client complet » : propriétaire recette-adm1-cree-rcfqm@example.invalid (client cmwjrdg0j00d0x100zxo1ojof), bien cmwjrdgw200d3x100qx3ao770, bail cmwjrdisa00dax100dc2wa1e4, locataire recette-adm1-locataire-cree-rcfqm@example.invalid (client cmwjrdhx600d7x1000vxm0ewb).
- « Nouveau bail » : bail cmwjscnps00i1x100euigpj9m sur le bien fictif 8.
- Lien de formulaire cmwjsf04z00iux100iotra2rl (bien fictif 9), jeton régénéré puis lien révoqué.
- Notaire : recette-adm1-notaire-rsvcq@example.invalid (compte cmwjrw9z500hdx100o0n18dze).
- Comptes dont le rôle a changé : le locataire fictif du dossier 8 (recette-adm1-locataire8@example.invalid) est devenu NOTAIRE par le cas ADM-1-094.
- Fiche du propriétaire fictif 4 : profession, adresse (« 10 bis rue de Rivoli »), lieu de naissance (« Guéret ») modifiés ; bien fictif 4 : libellé « … modifié », surface 43 m², date de DPE 15/03/2024.
- Toutes mes notifications ont été marquées comme lues (cas ADM-1-088).
- Sur mes dossiers fictifs de départ : relances (e-mails, appel noté) sur les dossiers 1, 3 et 9 ; report des rappels de 7 jours sur le dossier 2.

_Rapport généré par scripts/rapport.cjs à partir de resultats.json ; les textes des défauts et des observations sont dans scripts/rapport-notes.cjs._
