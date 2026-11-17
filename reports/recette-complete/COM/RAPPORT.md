# Recette COM — Bail commercial de bout en bout (propriétaire, locataire société, équipe, notaire)

Serveur testé : `http://localhost:3210` (build de production de `codex/prep-pr-main`). Navigateurs pilotés par
Playwright : ordinateur (1440 × 900) et téléphone Android (Pixel 7, Chromium). Détail de chaque vérification dans
`resultats.json` (102 cas), preuves dans `captures/`, scripts relançables dans `scripts/`.

## 1. Synthèse

Le bail commercial fonctionne de bout en bout pour le **propriétaire**, l'**équipe** et le **notaire** : deux
dossiers ont été créés depuis l'accueil jusqu'au paiement de 59,90 € (un 3-6-9 sur ordinateur, un dérogatoire de
24 mois sur téléphone), un dossier a été vérifié puis envoyé au notaire, et une demande de complément sur le loyer
(plusieurs champs) a été demandée, répondue et acceptée sans faux conflit.
Le point noir est le **locataire société** : à l'étape « Informations de l'entreprise » de son formulaire, le
bouton « Continuer » ne fait rien et n'affiche rien, quelle que soit la saisie (défaut bloquant, reproduit sur deux
dossiers et deux appareils ; seul un détour par « Enregistrer » puis un rechargement permet de finir).
Deuxième défaut sérieux : tous les refus décidés par le serveur s'affichent sous la forme d'un message technique en
anglais. Il a rendu incompréhensible un incident survenu juste après un paiement (soumission en échec pendant un
quart d'heure, puis réussie sans rien changer — très probablement dû à la charge du montage de test).
Le reste relève de la finition : récapitulatif du locataire pensé pour l'habitation, quelques libellés
« logement », un e-mail de syndic non contrôlé.
**Verdict : parcours propriétaire, équipe et notaire bons pour la fusion ; le formulaire du locataire société doit
être corrigé avant d'ouvrir le bail commercial à de vrais locataires.**

| Rôle | Appareil | Cas | OK | KO | Partiels | Non testés |
|---|---|---:|---:|---:|---:|---:|
| Visiteur | ordinateur | 2 | 2 | 0 | 0 | 0 |
| Visiteur | téléphone | 1 | 0 | 0 | 1 | 0 |
| Propriétaire | ordinateur | 36 | 27 | 4 | 4 | 1 |
| Propriétaire | téléphone | 14 | 12 | 1 | 1 | 0 |
| Propriétaire | iPhone | 1 | 0 | 0 | 0 | 1 |
| Locataire | ordinateur | 11 | 6 | 4 | 0 | 1 |
| Locataire | téléphone | 10 | 6 | 4 | 0 | 0 |
| Équipe | ordinateur | 18 | 15 | 0 | 1 | 2 |
| Équipe | téléphone | 1 | 0 | 0 | 0 | 1 |
| Notaire | ordinateur | 8 | 7 | 0 | 1 | 0 |
| **Total** | | **102** | **75** | **13** | **8** | **6** |

Les 13 KO correspondent à 7 défauts distincts (plusieurs sont constatés sur ordinateur et sur téléphone).

## 2. Défauts, du plus grave au plus bénin

### D1 — Locataire société : impossible de passer l'étape « Informations de l'entreprise » (bloquant)

- **Cas** : COM-063 (ordinateur, dossier 3), COM-093 (téléphone, dossier 4) ; contournement : COM-068, COM-098.
- **Origine** : staging (les fichiers en cause sont identiques sur `staging`).
- **Reproduire** : ouvrir le formulaire d'un locataire invité sur un bail commercial, « Entreprise », puis au choix
  « Ma société n'est pas encore immatriculée » ou un SIREN retrouvé et confirmé ; remplir raison sociale, siège,
  représentant légal, fonction, téléphone, e-mail ; « Continuer ».
- **Attendu** : passage à « Pièces jointes ».
- **Constaté** : rien ne se passe — ni message, ni notification, ni enregistrement (aucune société en base).
  Quatre essais sur ordinateur, un sur téléphone, toujours le même résultat.
- **Cause trouvée dans le code** : le schéma du locataire exige un « nom commercial » (`entreprise.name`), mais
  l'écran du locataire n'a aucun champ pour le saisir et ne le recopie pas depuis la raison sociale
  (`syncTradeName={false}`) ; la validation échoue sur ce champ invisible et le formulaire s'arrête sans rien dire
  (`if (!valid) return`).
- **Contournement vérifié** : « Enregistrer » (en haut à droite) crée la société avec un nom commercial égal à la
  raison sociale ; après rechargement, « Continuer » fonctionne et le formulaire va jusqu'à la page de succès.
  Un locataire ne le devinera pas.
- **Captures** : `captures/com-060-locataire-ordinateur-societe.png`, `captures/com-090-locataire-telephone-societe.png`.
- **Fichiers** : `components/intakes/tenant-intake-form.tsx`, `lib/zod/client.ts` (schéma du locataire),
  `lib/rules/dossier-rules.ts` (`tenantFieldIssues`).

### D2 — Les refus du serveur s'affichent en anglais technique (majeur)

- **Cas** : COM-024, COM-025 (et COM-026, COM-034). **Origine** : staging.
- **Reproduire** : questionnaire propriétaire, étape « Locataire » : e-mail « pas-un-email », ou l'adresse du
  propriétaire lui-même, « Continuer ».
- **Attendu** : « Email du locataire invalide » ; « L'email du locataire ne peut pas être le même que l'email du
  propriétaire… » (ces textes existent dans le code).
- **Constaté** : notification « An error occurred in the Server Components render. The specific message is omitted
  in production builds… », réponse 500. La saisie est bien refusée, mais sans explication. Reproduit à deux
  exécutions. Tout message levé par `throw` dans une action serveur subit le même sort en build de production.
- **Captures** : `captures/com-024-locataire-email-invalide.png`, `captures/com-025-locataire-meme-email.png`.
- **Fichiers** : `lib/actions/intake-handlers.ts` (`validateTenantEmailForOwner`), `lib/actions/intakes.ts`,
  `lib/actions/clients.ts` ; affichage dans `components/intakes/owner-intake-form.tsx`.

### D3 — Paiement encaissé, dossier non soumis pendant un quart d'heure (majeur ; cause très probablement liée au montage)

- **Cas** : COM-034 (incident), COM-035 (reprise). **Appareil** : ordinateur.
- **Enchaînement exact** : dossier complet (société, copropriété, locataire invité, sept pièces) ; carte refusée
  `4000 0000 0000 0002` (refus correct) ; carte `4242 4242 4242 4242` acceptée par Stripe (59,90 €, 20:56 UTC).
  La soumission qui suit répond 500 ; l'écran reste sur « Traitement du paiement… ». Trois rechargements
  (la page relance la soumission d'elle-même) : trois nouveaux 500, écran « Initialisation du paiement sécurisé… »
  et message anglais du défaut D2.
- **État en base pendant l'incident** : paiement Stripe « succeeded » ; suivi du paiement « SUCCEEDED », non
  rattaché ; formulaire « PENDING » ; bail « DRAFT », non payé.
- **Dénouement** : au rechargement suivant (21:12 UTC), **sans aucune modification des données**, la soumission
  aboutit : formulaire « SUBMITTED », bail « AWAITING_TENANT_FORM », payé à la date du débit Stripe, une seule
  ligne d'historique « PAYMENT_RECEIVED », paiement rattaché, aucun second débit.
- **Ce qui a été écarté** : l'e-mail de syndic invalide saisi sur ce dossier (première hypothèse) — le schéma
  l'accepte, vérifié en rejouant le schéma sur les données envoyées ; les pièces (toutes présentes).
- **Origine retenue : montage**, avec réserve. Le journal du serveur n'est pas accessible à l'agent, la cause
  exacte n'est donc pas prouvée. Indices : au même moment, de simples enregistrements d'étape répondaient aussi 500
  puis réussissaient à l'identique (huit agents sur le même serveur et une base distante) ; le lendemain, serveur
  au calme, le second dossier a été payé et soumis du premier coup (COM-054). La soumission après paiement
  enchaîne plusieurs dizaines de requêtes, dont une transaction (code de la branche) soumise au délai par défaut.
- **Ce qui reste à corriger côté produit** : pendant un tel incident, le client qui vient de payer ne voit qu'un
  écran figé et un message en anglais ; il faudrait un message du type « Votre paiement est enregistré, nous
  finalisons votre dossier », et une transaction plus tolérante.
- **Captures** : `captures/com-034-paye-mais-soumission-en-echec.png`, `captures/com-034-apres-paiement-rechargement.png`.
- **Fichiers** : `lib/actions/clients.ts` (`submitOwnerForm`), `lib/payments/dossier-payment.ts`,
  `components/intakes/owner-intake-form.tsx` (`submitAfterPayment`), `components/intakes/payment-step.tsx`.

### D4 — Récapitulatif présenté au locataire : ni « HT », ni périodicité, ni activité (mineur)

- **Cas** : COM-061, COM-091. **Origine** : staging. **Appareils** : ordinateur et téléphone.
- Étape 1 du formulaire locataire : « LOYER MENSUEL 1 500,00 € » sans « HT », pas de périodicité, pas d'activité,
  ligne « TYPE DE BAIL » vide. Ces éléments n'apparaissent qu'à la dernière étape, dans la phrase de confirmation
  (qui, elle, est correcte : COM-065, COM-095).
- **Capture** : `captures/com-060-locataire-ordinateur-recapitulatif.png`. **Fichier** : `components/intakes/tenant-intake-form.tsx`.

### D5 — Formulaire du locataire société : messages bruts en anglais sous les champs (mineur)

- **Cas** : COM-067, COM-097. **Origine** : staging.
- « Continuer » à vide : « Invalid input: expected string, received undefined » sous le téléphone et sous le nom de
  la société. Le représentant légal vide n'est pas signalé. L'e-mail de la société n'est pas prérempli avec
  l'adresse invitée.
- **Fichiers** : `lib/zod/client.ts`, `components/intakes/tenant-intake-form.tsx`.

### D6 — E-mail du syndic invalide accepté dans le questionnaire (mineur)

- **Cas** : COM-010. **Origine** : staging. Étape 6, copropriété : « pas-un-email » est accepté et enregistré tel
  quel (constaté deux fois). L'équipe, elle, ne peut pas saisir une telle valeur. Sans conséquence sur la suite.
- **Fichier** : `lib/zod/client.ts` (`propertySyndicEmail`).

### D7 — Vocabulaire de l'habitation dans le parcours commercial (cosmétique)

- **Cas** : COM-062, COM-092 (récapitulatif du locataire : « Les caractéristiques du logement », codes internes
  « BOUTIQUE », « PLEIN PROPRIETE ») ; COM-045 (info-bulle de la surface du local : « Surface habitable du logement
  (loi Boutin)… »). **Origine** : staging.
- **Fichiers** : `components/intakes/tenant-intake-form.tsx`, `components/intakes/owner-intake-form.tsx`.

### Points partiels (pas des refus de fonctionnement)

| Cas | Constat | Gravité | Origine |
|---|---|---|---|
| COM-026 | Jour de paiement 31 accepté et enregistré, alors qu'un autre écran limite à 28 | mineur | staging |
| COM-028 | Date de prise d'effet dans le passé (2020) acceptée sans avertissement | mineur | inconnue |
| COM-046 | « Le statut légal est requis » reste affiché après avoir choisi le régime juridique | cosmétique | staging |
| COM-007 | Récapitulatif d'une société retrouvée au registre : ligne « Personne principale — Personne sans nom » | cosmétique | inconnue |
| COM-071, COM-100 | Répartition des charges absente ou contradictoire sur un dossier créé directement en base | mineur | montage |
| COM-029, COM-040 | Relevé incomplet du script (message lu trop tard, titre non relu sur téléphone) | cosmétique | montage |

## 3. Parcours vérifiés

### A. Création par le propriétaire — ordinateur (compte neuf, bail 3-6-9)

| Cas | Vérification | Résultat |
|---|---|---|
| COM-001 à 004 | Accueil → « bail commercial » → démarrage ; e-mail invalide ; code par e-mail ; « Commercial » présélectionné | OK |
| COM-005, 006 | Société retrouvée par SIREN, représentant légal prérempli ; numéro invalide ; téléphone obligatoire | OK |
| COM-008, 009 | Le local : champs obligatoires, adresse par suggestion, cinq types en cartes, surface | OK |
| COM-011 | Copropriété : syndic exigé (nom + e-mail ou téléphone) ; centre commercial ; dépendances | OK |
| COM-012, 023 | Reprise après rechargement ; retour arrière avec valeurs conservées | OK |
| COM-013, 014 | Activité obligatoire ; questions « déjà loué » affichées et exigées seulement si « Oui » | OK |
| COM-015, 016 | 3-6-9 par défaut, pas de dates à cette étape ; dérogatoire refusé si vide, 0 ou 40 mois | OK |
| COM-017, 018, 036 | Loyer « hors taxes », rappel annuel (30 000 €), périodicité, TVA, ILC proposé, franchise ; vide ou 0 refusé | OK |
| COM-019 | Provision, dépôt (« 3 mois de loyer hors taxes »), pas-de-porte, frais d'acte : tous contrôlés | OK |
| COM-020, 021 | Cinq lignes de charges modifiables, deux figées « Toujours au propriétaire (loi) » ; travaux passés et prévus | OK |
| COM-022 | Garant (nom exigé, e-mail invalide refusé), clauses, note libre | OK |
| COM-027 | Prise d'effet 01/02/2027 → « Le bail se terminera le 1 février 2036 », même date en base | OK |
| COM-030 | Pièces propres au cas (Kbis, statuts, règlement du centre commercial, diagnostics, titre, règlement de copropriété) déposées et enregistrées | OK |
| COM-031 à 033 | Paiement : 59,90 € TTC, honoraires « fixés librement », conditions générales obligatoires, carte refusée | OK |
| COM-035 | Reprise après échec : paiement reconnu, pas de second débit, dossier soumis | OK |

### A.4 Création par le propriétaire — téléphone (second compte, bail dérogatoire)

| Cas | Vérification | Résultat |
|---|---|---|
| COM-042 à 044 | Entreprise ; registre indisponible → saisie manuelle de la société et du représentant ; récapitulatif | OK |
| COM-046 | Lotissement (ancienneté exigée) et « autre ensemble immobilier » | Partiel (message d’erreur résiduel) |
| COM-047 | Dérogatoire : 37 mois refusé, 24 mois accepté, remise des clés | OK |
| COM-048, 049 | ILAT proposé pour un bureau, « Pas de révision » ; provision à 0, frais « à parts égales » | OK |
| COM-050 | Date impossible (31/02) refusée ; « Le bail se terminera le 1 mars 2029 » ; fin en base au 01/03/2029 | OK |
| COM-051, 052 | Refus sans pièces avec la liste ; pièces du lotissement et de l'association syndicale demandées ; dépôts | OK |
| COM-053, 054 | Écran de paiement sans débordement ; carte de test saisie dans le cadre Stripe ; page de succès, dossier soumis et payé | OK |
| COM-055 | Seize écrans sans défilement horizontal, bouton principal toujours visible | OK |

### B. Locataire société

| Cas | Vérification | Résultat |
|---|---|---|
| COM-060, 090 | Accès par code : mauvais code refusé (« Le code est incorrect… »), bon code accepté | OK |
| COM-061/091, 062/092 | Récapitulatif commercial de l'étape 1 | KO (D4, D7) |
| COM-063/093, 067/097 | Étape « Informations de l'entreprise » | KO (D1, D5) |
| COM-064, 094 | Statuts exigés (pas de Kbis pour une société non immatriculée) ; refus sans pièce avec la liste | OK |
| COM-065, 095 | Confirmation obligatoire ; texte « … hors taxes par mois (paiement mensuel) … et l'activité … » | OK |
| COM-066, 096 | Envoi, page de succès, accord enregistré avec le détail des conditions | OK |
| COM-105, 106 | Espace locataire : « LOYER MENSUEL HT », « LOYER ANNUEL HT », activité, « type de local », « € HT/mois » ; ordinateur et téléphone | OK |

### C. Équipe

| Cas | Vérification | Résultat |
|---|---|---|
| COM-070, 081 | Conformité légale fondée sur le Code de commerce : neuf règles, automatiques et manuelles, pastille, envoi bloqué ; validation manuelle enregistrée | OK |
| COM-072 | Loyer « HT », « Soit 18 000,00 € HT de loyer par an », frais de dossier « 59,90 € payés » | OK |
| COM-073 à 078, 080 | Lignes modifiables une à une : activité, franchise, pas-de-porte, garant, charges, travaux, TVA, indice — valeur invalide refusée avec message, valeur valide enregistrée | OK |
| COM-079 | Changer la périodicité archive l'accord du locataire et redemande sa confirmation ; les autres lignes n'y touchent pas | OK |
| COM-082 | Registre de la société : numéro fictif → « Ce numéro n'est pas valide. » | OK |
| COM-107 | Filtre « Type de bail → Commercial » : seules des lignes commerciales restent | OK |
| COM-115 | Pièce ajoutée par l'équipe, « Tout valider », envoi au notaire : statut « prêt pour le notaire », notaire assigné et prévenu | OK |

### D. Notaire

| Cas | Vérification | Résultat |
|---|---|---|
| COM-100, 101 | Conditions commerciales complètes, loyer hors taxes, aucune mention d'habitation | OK (répartition des charges absente sur le dossier de test : partiel, montage) |
| COM-102, 103 | Société locataire (raison sociale, immatriculation, représentant) ; zip des pièces valide | OK |
| COM-104 | Demande d'une pièce au locataire société, e-mail « 1 pièce à nous envoyer » | OK |
| COM-108 | Avancement « À contacter » → « En traitement » | OK |
| COM-110 à 112 | Demande de complément « Loyer et conditions de paiement » : demandée, répondue par le propriétaire (TVA, franchise de 2 mois), acceptée — aucun « dossier modifié depuis la réponse », valeurs appliquées | OK |

### E. Cohérences

« HT » présent partout où il faut côté propriétaire, équipe, notaire et espace locataire ; « local » et non
« logement » sauf aux trois endroits du défaut D7 ; dépôt de garantie « pas de limite légale pour un bail
commercial » ; aucun encadrement des loyers ni DPE exigé. Les dix e-mails réellement produits (codes, demandes de
complément, dossier assigné) ne contiennent aucun vocabulaire d'habitation (COM-113).

## 4. Observations (pas des défauts)

- L'étape « Type de client » propose « Particulier » par défaut, y compris pour un bail commercial.
- Indice ILAT choisi pour une boutique : la conformité affiche « adapté à des bureaux ou une profession libérale »
  et « Vérifié automatiquement », sans alerte.
- Loyer trimestriel : la fiche affiche « Par trimestre » et ne rappelle plus le jour de paiement.
- La date de fin d'un 3-6-9 est le même jour neuf ans plus tard (01/02/2027 → 01/02/2036), et non la veille.
- Après l'envoi du formulaire du locataire, le bail reste « en attente du locataire » : le passage en vérification
  dépend d'une tâche de fond non exécutée sur ce montage.
- Trois demandes de code rapprochées pour la même adresse : réponse 429, sans message visible relevé.
- Serveur lent sous la charge des huit agents (plusieurs réponses 500 passagères sur de simples enregistrements).

## 5. Non testé

- iPhone (WebKit) et tablette ; fiche équipe et fiche notaire sur téléphone (COM-120, COM-123).
- Questionnaire terminé sans locataire, propriétaire particulier (COM-121).
- Six lignes des conditions commerciales et les trois blocs « Le bail » de la fiche équipe (COM-122).
- Renouvellement de la confirmation par le locataire depuis son espace (COM-124).
- Texte des e-mails différés : tâches de fond capturées mais non exécutées (COM-114).
- Recherche d'une société réelle depuis la fiche équipe ; messagerie du dossier ; dossier 5 (sans locataire).

## 6. Données créées (pour le nettoyage)

- Comptes : `recette-com-nouveau1@example.invalid`, `recette-com-nouveau2@example.invalid` (propriétaires) ;
  locataires invités `recette-com-locnouveau1@example.invalid`, `recette-com-locnouveau2@example.invalid`.
- Dossiers : bail `cmwjqaqm7004jx1002976xu82` (« SARL Recette COM Nouveau Un », 7 Place Bonnyaud, 3-6-9) ;
  bail `cmwjso5mu00jxx1006gx5vjqy` (« SCI Recette COM Nouveau Deux », bureau, dérogatoire 24 mois). Les numéros
  SIREN de ces deux sociétés fictives sont le numéro de démonstration de l'écran et un numéro tapé au hasard :
  ils correspondent à des sociétés réelles, dont aucune donnée n'a été conservée dans les captures ni le rapport.
- Deux paiements Stripe de test de 59,90 €.
- Dossiers fournis modifiés : dossier 1 (conditions commerciales, accord du locataire à renouveler), dossier 2
  (envoyé au notaire), dossiers 3 et 4 (formulaires locataire envoyés, sociétés « SAS Recette COM Locataire 3 / 4 »),
  dossier 6 (statut « En traitement », TVA et franchise modifiées, une demande acceptée, une demande ouverte).
  Dossier 5 intact.
- Pièces `recette-*.pdf` déposées sur ces dossiers ; garant fictif `recette-com-garant1@example.invalid` et
  syndic fictif `recette-com-syndic@example.invalid` (simples valeurs de champ, pas des comptes).

## Note sur les scripts

Les scripts `a*`, `b*`, `c*`, `d*` enregistrent leurs cas au fil de l’eau ; `z1-corrections-cas.cjs` se lance en dernier : il requalifie les cas dont le statut automatique était faussé par le script lui-même (attente trop courte, contrôle erroné, second passage) et ajoute l’origine et le fichier soupçonné des défauts.
