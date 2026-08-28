# Audit — Facturation électronique & flux de paiement
### BailNotarie / DS SYNC — août 2026

> Périmètre : conformité de DS SYNC (BailNotarie) à la réforme française de la facturation
> électronique (e-invoicing + e-reporting), en conservant Stripe comme prestataire de paiement,
> et sans multiplier les plateformes de gestion au-delà de **Stripe + Qonto + Tiime**.
> Inclut les flux existants **et** les trois flux à venir (acompte notaire, solde émoluments,
> abonnement/frais mensuels notaires).

---

## 1. Verdict en une page

**Non, ce qui est en place ne suffit pas.** Et le problème est plus large que la réforme 2026 :
aujourd'hui la plateforme **n'émet aucune facture**, au sens juridique du terme.

| Question | Réponse |
|---|---|
| Suis-je conforme aujourd'hui ? | **Non.** Le client ne reçoit qu'un *reçu Stripe* (`charge.receipt_url`), qui n'est pas une facture ni une « note » au sens de l'arrêté du 3 octobre 1983 (obligatoire dès 25 € TTC en B2C). |
| Faut-il migrer pour la réforme ? | **Oui**, mais « migrer » est un abus de langage : il n'y a rien à migrer, il faut **construire** la brique facturation. |
| Faut-il quitter Stripe ? | **Non.** Stripe reste le PSP (encaissement). Il n'est simplement pas — et n'a pas vocation à être — une Plateforme Agréée (PA). Les deux couches sont distinctes. |
| Faut-il une 4ᵉ plateforme ? | **Non.** **Qonto est Plateforme Agréée (immatriculation DGFiP n°23)** et **Tiime est également Plateforme Agréée** (immatriculée le 18/12/2025). Votre stack actuelle couvre déjà l'obligation — il manque uniquement le câblage applicatif. |
| Échéance la plus proche | **1ᵉʳ septembre 2026** (dans quelques jours) : obligation de **réception** de factures électroniques pour **toutes** les entreprises assujetties à la TVA, quelle que soit leur taille. |
| Échéance d'émission pour DS SYNC | **1ᵉʳ septembre 2027** (TPE/PME). Mais les flux à venir (notaires B2B) rendent une mise en œuvre anticipée nécessaire. |

**Décision recommandée : Stripe (paiement) + Qonto PA (facturation & e-reporting) + Tiime (comptable).
Zéro plateforme supplémentaire. Le travail est un chantier de développement, pas un chantier d'achat.**

---

## 2. Le cadre légal, tel qu'il s'applique à vous

### 2.1 Calendrier

| Date | Obligation | Vous concerne ? |
|---|---|---|
| **1ᵉʳ sept. 2026** | **Réception** de factures électroniques — **toutes** les entreprises assujetties TVA | **OUI, immédiatement.** Il faut être raccordé à une PA et référencé dans l'annuaire. |
| 1ᵉʳ sept. 2026 | **Émission** + e-reporting — Grandes Entreprises et ETI | Non (DS SYNC est une TPE) |
| **1ᵉʳ sept. 2027** | **Émission** de factures électroniques **+ e-reporting** — PME, TPE, micro | **OUI.** C'est votre échéance d'émission. |

Le calendrier a été confirmé par le gouvernement : pas de nouveau report.

### 2.2 Les deux obligations distinctes

**a) E-invoicing** — factures **B2B domestiques** (entre assujettis établis en France).
Elles ne peuvent plus être envoyées en PDF par e-mail : elles transitent obligatoirement par une
**Plateforme Agréée (PA)** — nouveau nom des « PDP » — au format structuré **Factur-X, UBL ou CII**,
conforme à la norme européenne **EN 16931**. Un PDF, même parfait, n'est plus une facture.

**b) E-reporting** — tout le reste :
- **transactions B2C** (vos ventes à des particuliers) → flux 10.1 ;
- **données de paiement** pour les prestations de services (TVA exigible à l'encaissement) → flux 10.2 ;
- opérations internationales → flux 10.3.

Ces données sont **agrégées et transmises via une PA** selon une périodicité liée à votre régime TVA
(régime réel normal mensuel : par décades, sous 10 jours ; régime simplifié : mensuel).

> **Point critique pour vous** : votre chiffre d'affaires actuel est **majoritairement B2C**
> (bailleurs particuliers). Vous n'échappez donc **pas** à la réforme — vous basculez simplement
> dans le volet **e-reporting**, qui exige lui aussi une PA.

### 2.3 Nouvelles mentions obligatoires (4 ajouts, 22 → 26 mentions)

1. **SIREN du client** assujetti (sert de **clé de routage** dans l'annuaire) ;
2. **adresse de livraison** si différente de l'adresse de facturation ;
3. **catégorie d'opération** : livraison de biens / prestation de services / mixte ;
4. mention de l'**option pour le paiement de la TVA sur les débits**, le cas échéant.

### 2.4 Sanctions

- **Absence de PA** : 500 € au 1ᵉʳ/09/2026, puis 1 000 € tous les 3 mois.
- **Facture non émise sous forme électronique** : 15 € par facture (art. 1737-II CGI), plafond 15 000 €/an.
- **Manquement e-reporting** : 250 € par transmission omise (art. 1788 D CGI), plafond 15 000 €/an.

Cumul théorique : ~30 000 €/an. Pour un ticket à 39,90 €, l'amende de 15 €/facture représente
**38 % du prix de vente**. À volume, c'est le risque financier n°1 du dossier.

---

## 3. Audit de l'existant (code)

### 3.1 Ce qui est en place

| Élément | Emplacement | État |
|---|---|---|
| SDK Stripe | `lib/stripe.ts` (API `2026-04-22.dahlia`) | OK |
| PaymentIntent parcours intake | `app/api/stripe/create-payment-intent/route.ts` | 3 990 c. en dur |
| PaymentIntent parcours client connecté | `app/api/stripe/create-payment-intent-bail/route.ts` | 3 990 c. en dur |
| UI paiement | `components/intakes/payment-step.tsx`, `components/client/bail-payment-step.tsx` | OK |
| Traçabilité | `IntakeLink.stripePaymentIntentId`, `Bail.stripePaymentIntentId` (`prisma/schema.prisma:475,573`) | Cache, pas une piste d'audit |
| Justificatif client | `app/commencer/success/page.tsx:68-82` → `charge.receipt_url` | **Reçu Stripe, pas une facture** |
| CGV | `app/cgv/page.tsx` | Tarif 39,90 € TTC, remboursement, mais **aucune clause facture / TVA** |

### 3.2 Écarts constatés — classés par gravité

#### 🔴 Bloquants

**E1 — Aucune facture n'est émise.**
Aucun modèle `Invoice` dans `prisma/schema.prisma` (vérifié : les 30 modèles ne comportent rien de
facturaire). Le seul document remis est le `receipt_url` de Stripe. Or, pour une prestation de
services à un particulier de 39,90 € TTC, la **remise d'une note est obligatoire dès 25 € TTC**
(arrêté n° 83-50/A du 3 octobre 1983), avec des mentions imposées (date, identité du prestataire,
nom du client, date et lieu d'exécution), en double exemplaire, conservée 2 ans et classée
chronologiquement. **Cette obligation est indépendante de la réforme 2026 et n'est pas remplie
aujourd'hui.**

**E2 — Aucune numérotation séquentielle, continue et sans rupture.**
Prérequis absolu (art. 242 nonies A ann. II CGI) et prérequis technique de toute PA. Aujourd'hui
inexistant. Le `paymentIntentId` Stripe (`pi_xxx`) n'est pas un numéro de facture.
**Correctif : déléguer la séquence à la PA** (numérotation automatique Qonto) plutôt que de
construire un compteur maison — cf. § 7.1.

**E3 — Aucun webhook Stripe.**
`app/api/stripe/` ne contient que les deux routes de création de PaymentIntent ; aucun
`constructEvent` dans le code. Le succès du paiement est constaté **côté navigateur**
(`components/intakes/payment-step.tsx:104-105`). Conséquences :
- un client qui ferme son onglet après un paiement réussi ne déclenche rien côté serveur ;
- il n'existe **aucun événement serveur fiable** sur lequel accrocher l'émission de la facture,
  l'e-reporting, ou la remontée d'un remboursement.
C'est la **brique manquante n°1**. Rien ne peut être construit proprement sans elle.

**E4 — Pas de raccordement à une Plateforme Agréée.**
Aucune PA, aucun référencement à l'annuaire. Or l'obligation de **réception** tombe le
**1ᵉʳ septembre 2026**. Vos propres fournisseurs français (Qonto, hébergeur, prestataires) vont
commencer à vous adresser des factures électroniques : sans PA, vous ne les recevez pas et vous
êtes en infraction.

#### 🟠 Majeurs

**E5 — Statut TVA jamais explicité.**
« 39,90 € TTC » apparaît partout (`app/cgv/page.tsx:72`, `components/*`) sans qu'aucune ventilation
HT / TVA / TTC n'existe. Deux cas :
- **franchise en base** (seuils 2026 inchangés : 37 500 € pour les services — la baisse à 25 000 €
  a été définitivement abandonnée par la loi du 4 novembre 2025) → mention
  *« TVA non applicable, art. 293 B du CGI »* obligatoire sur chaque facture ;
- **assujetti** → ventilation obligatoire : 33,25 € HT + 6,65 € TVA (20 %) = 39,90 € TTC.

C'est un **point d'entrée à trancher avant toute ligne de code** : il détermine le format des
factures, l'e-reporting, et la date de bascule (le franchissement du seuil de 37 500 € vous fait
basculer en cours d'année).

**E6 — Les clients personnes morales sont déjà des flux B2B.**
`ClientType.PERSONNE_MORALE` + modèle `Entreprise` avec un champ `registration`
(`prisma/schema.prisma:313-341`) : vous facturez **déjà** des SCI et des sociétés. Ces factures
devront transiter par une PA. Or `registration` est un `String` libre, non normalisé, non validé
— alors que le **SIREN est la clé de routage de l'annuaire**. Sans SIREN valide à 9 chiffres, la
facture est rejetée par la PA.

**E7 — Aucun processus d'avoir.**
L'article 6 des CGV prévoit un remboursement intégral de 39,90 €. Un remboursement se matérialise
par une **facture rectificative (avoir)** numérotée, référençant la facture d'origine — qui devra
elle aussi transiter par la PA en B2B et être remontée en e-reporting en B2C. Aucun code ne gère
cela ; les remboursements se font vraisemblablement à la main dans le dashboard Stripe, sans trace
comptable côté plateforme.

**E8 — Incohérence CGV / implémentation sur les moyens de paiement.**
Les CGV (art. 5) annoncent un règlement « par carte bancaire ». Le code active
`payment_method_types: ["card", "klarna", "link"]` dans les deux routes. Au-delà de l'incohérence
contractuelle, **Klarna est un paiement différé** : la date d'encaissement effectif diverge de la
date de commande, ce qui impacte directement l'exigibilité de la TVA et le **flux 10.2 (données de
paiement)** de l'e-reporting. À arbitrer : soit on retire Klarna, soit on gère explicitement la
date d'encaissement.

#### 🟡 À corriger

**E9 — Aucun `Customer` Stripe créé.** Uniquement des PaymentIntents nus avec `receipt_email`.
Pas d'objet client durable → pas d'adresse de facturation, pas de numéro de TVA, pas d'historique.
Bloquant pour la facturation récurrente des notaires (flux futur n°3).

**E10 — Montant en dur (`3990`) dupliqué à 2 endroits + ~10 occurrences d'affichage.**
Aucune notion de catalogue tarifaire ni de prix historisé. Une facture doit refléter le prix
**au jour de la vente** ; un changement de tarif rendrait tout l'historique incohérent.

**E11 — Aucune politique d'archivage.** Conservation des factures dans leur format d'origine :
6 ans au titre fiscal (art. L102 B LPF), 10 ans au titre comptable (art. L123-22 C. com.).
**Cette obligation ne se délègue pas** : une plateforme agréée n'est pas tenue d'archiver — ce
n'est pas dans son périmètre réglementaire, seulement une option commerciale. Rien n'est prévu,
alors que l'infra S3 déjà en place (`MIGRATION_S3.md`) s'y prête.

---

## 4. Analyse de marché — quelle solution, avec Stripe et sans nouvelle plateforme

### 4.1 Ce que Stripe fait et ne fait pas

Stripe **n'est pas** une Plateforme Agréée et ne figure pas sur la liste DGFiP (147 PA immatriculées
au 16-19 août 2026). Stripe Invoicing produit des factures commerciales en PDF — ce qui, après le
1ᵉʳ septembre 2027, **ne constitue plus une facture valide en B2B domestique**.

En revanche, Stripe reste **parfaitement légitime comme PSP** : la réforme ne porte pas sur
l'encaissement. Les deux couches doivent simplement être branchées l'une à l'autre.
Stripe propose d'ailleurs **Billit** (PA n°19) comme partenaire e-invoicing sur son App Marketplace,
ce qui confirme la doctrine : *Stripe encaisse, une PA facture*.

### 4.2 Les quatre architectures possibles

| # | Architecture | Nouvelles plateformes | Effort dev | Verdict |
|---|---|---|---|---|
| **A** | Stripe + **Qonto PA** (API) — votre app génère la facture, Qonto l'émet et fait l'e-reporting | **0** | Moyen | ✅ **Recommandé** |
| B | Stripe + **Tiime PA** | 0 | Moyen | ✅ Alternative sérieuse (voir 4.4) |
| C | Stripe + **Billit** (partenaire Stripe, no-code) | +1 | Faible | ⚠️ Rapide mais viole votre contrainte |
| D | Stripe + **Pennylane / Sellsy / Evoliz** | +1 (et remplace Tiime) | Élevé | ❌ Recompose toute votre stack compta |

### 4.3 Pourquoi Qonto (architecture A)

- **Plateforme Agréée immatriculée n°23** (obtenue le 18/12/2025), interopérable **PEPPOL**.
- **Format Factur-X** natif — le format recommandé pour les TPE/PME.
- **Inclus sans surcoût et sans limite dans toutes les offres Qonto** → coût marginal ≈ 0 €.
- **API disponible sur tous les plans**, avec un endpoint `POST /client_invoices`
  (scope OAuth `client_invoice.write`), numérotation automatique gérée côté Qonto.
- Rapprochement bancaire natif : la facture et l'encaissement vivent au même endroit.
- **Vous l'avez déjà.** Zéro nouvel abonnement, zéro nouvel outil à administrer.

**Limites et vérifications** : détaillées au § 4.4 ci-dessous.

### 4.4 Vérification technique de l'intégration Qonto

Vérifications menées le 28 août 2026 sur la spécification OpenAPI publique de la Qonto Business API
(miroir GitHub `api-evangelist/qonto`), la documentation d'aide Qonto et des sources tierces.
`qonto.com` et `docs.qonto.com` étant inaccessibles depuis l'environnement d'audit, les détails
d'endpoints sont **indicatifs** et doivent être reconfirmés sur la documentation officielle.

#### Ce qui est confirmé — l'intégration est simple

| Point | Constat |
|---|---|
| Base URL | `https://thirdparty.qonto.com` |
| **Sandbox** | `https://thirdparty-sandbox.staging.qonto.co` — **recette possible sans polluer la numérotation réelle** |
| Authentification | En-tête `Authorization: {login}:{secret-key}` — pas de Base64, pas d'OAuth pour sa propre organisation |
| Émission | `POST /v2/client_invoices`, scope `client_invoice.write` |
| Lecture | `GET /v2/client_invoices`, scope `client_invoices.read` |
| Numérotation | Automatique si activée au niveau de l'organisation — le numéro devient alors **facultatif** dans la requête |
| Formats | Factur-X, UBL, CII en natif ; génération du PDF Factur-X côté Qonto |
| Interopérabilité | PEPPOL, protocoles AS/2 et AS/4 |
| Avoirs | Couverts par la même API (« invoices, quotes, and credit notes ») |
| Réception fournisseurs | `GET/POST /v2/supplier_invoices`, scope `supplier_invoice.read` |
| Webhooks | Ressource `INVOICE`, événements `CREATED` et `UPDATED` → synchronisation des statuts |
| Plan requis | API REST dès le plan Basic ; e-invoicing inclus sans limite dans toutes les offres |
| Certifications | ISO 27001, SecNumCloud |

**Charge de développement du connecteur Qonto seul : 3 à 5 jours.** L'essentiel des 5 à 7 semaines
estimées reste votre propre plomberie — webhook Stripe, journal d'émission, archivage, avoirs,
routage B2B/B2C, back-office de réconciliation.

#### Les trois réserves

**R1 — L'e-reporting est en bêta, et c'est votre flux principal.** ⚠️
En juillet 2026, la fonction e-reporting de Qonto est encore présentée comme **en version bêta**,
accessible à un **nombre limité d'organisations françaises éligibles**. L'activation se fait par
une bannière dans la section Facturation, réservée au Titulaire ou à un Admin ; si la bannière
n'apparaît pas, l'organisation n'y a pas encore accès. Les critères d'éligibilité évoqués
mentionnent l'émission ou la réception de **factures B2B transfrontalières** — ce que DS SYNC ne
fait pas.

C'est **la** réserve qui compte&nbsp;: votre chiffre d'affaires est majoritairement B2C, donc
relève de l'e-reporting, pas de l'e-invoicing. Qonto couvre aujourd'hui de façon certaine votre
flux B2B (SCI, sociétés, futurs frais notaires) — **pas encore de façon certaine votre flux
principal**. L'échéance étant à septembre 2027, il reste douze mois&nbsp;: c'est confortable, mais
c'est une **dépendance à suivre, pas à supposer acquise**.
À noter : **Tiime, lui, propose l'e-reporting en disponibilité générale et gratuitement** (§ 4.5) —
c'est le point sur lequel Qonto est aujourd'hui en retard.

**R2 — Le déclenchement de l'émission via PA n'est pas explicite dans l'API.**
La spécification expose un scope `einvoicing.read` («&nbsp;Read e-invoicing settings&nbsp;») mais
**aucun `einvoicing.write`**. Cela suggère que la transmission via PA est pilotée par un **réglage
au niveau de l'organisation**, et non par un paramètre d'appel — le même schéma que pour les
organisations italiennes, où une facture créée avec l'e-invoicing activé part automatiquement vers
le SdI. C'est plutôt une bonne nouvelle (rien à coder), mais à faire confirmer&nbsp;: *une facture
créée par API pour une organisation française avec e-invoicing activé part-elle automatiquement
via la PA&nbsp;?*

**R3 — L'archivage n'est pas garanti.** Aucune source ne confirme une conservation 10 ans chez
Qonto. Et comme vu au § 7.1, l'obligation reste la vôtre de toute façon. La copie S3 n'est donc
pas une redondance&nbsp;: c'est le dispositif principal.

#### Les quatre questions à poser à Qonto

1. DS SYNC est-elle **éligible à l'e-reporting**, et quand sort-il de bêta&nbsp;? *(question n°1,
   elle conditionne tout)*
2. Une facture créée **par API** pour une organisation française avec e-invoicing activé est-elle
   **automatiquement transmise via la PA**, ou faut-il une action complémentaire&nbsp;?
3. Quelle **durée de conservation** des factures émises et reçues, et sous quelle forme sont-elles
   restituables&nbsp;?
4. Les **statuts de cycle de vie** de la PA (déposée, rejetée, encaissée) sont-ils exposés par
   l'API et poussés par webhook&nbsp;?
5. Une **synchronisation récurrente des factures clients vers Tiime** est-elle prévue, sur le
   modèle de celle qui existe pour Pennylane&nbsp;?

#### Verdict

**Oui, Qonto suffit — sous réserve R1.** Pour l'e-invoicing B2B, c'est acquis et l'intégration est
franchement simple. Pour l'e-reporting B2C, c'est probable mais non garanti à ce jour. Ne signez
pas la conception sans la réponse à la question 1&nbsp;; en attendant, tout le travail des phases 1
et 2 reste valable, puisqu'il est indépendant de la PA retenue — c'est précisément le rôle du
connecteur abstrait.

---

### 4.5 Tiime : la chaîne comptable et le cas d'un basculement

#### L'intégration Qonto → Tiime existe, mais elle est partielle

| Flux | Mode |
|---|---|
| Transactions bancaires + pièces jointes | **Automatique** (synchronisation Qonto → Tiime ; côté Tiime, agrégation via Powens, agréé ACPR) |
| Factures d'achat (fournisseurs) | **Automatique** — Qonto étant PA, elles arrivent dans l'espace sans téléchargement |
| **Factures de vente** | **Export de fichier** d'écritures comptables (achats, ventes, notes de frais, banque) avec justificatifs. Qonto génère nativement un format **Tiime** (parmi Agiris, Cegid Expert, EBP, FULLL, Pennylane, Sage 50/100, CSV/XLS) |
| Accès direct du comptable | Espace expert-comptable côté Qonto |

**L'asymétrie à connaître** : Qonto propose une intégration dédiée
« **Export des factures clients (récurrent)** » — synchronisation toutes les 3 heures des factures
émises et payées, avoirs compris — **pour Pennylane, pas pour Tiime**. Raison probable : Qonto et
Tiime sont concurrents sur le marché des experts-comptables (Qonto publie un comparateur
« Regate by Qonto ou Tiime »). **Ne comptez pas sur un approfondissement rapide de cette
intégration.**

**En pratique pour le comptable** : les encaissements et les justificatifs remontent seuls ; le
journal des ventes est un export périodique. Avec une seule ligne de produit et un flux Stripe,
c'est un geste mensuel, pas une charge. Et comme le journal d'émission local existe de toute façon
(§ 7.1), cet export peut aussi être produit depuis votre propre base.

#### Tiime plutôt que Qonto pour émettre ?

Deux avantages réels à Tiime, qu'il faut reconnaître :

1. **L'e-reporting est disponible et inclus dans l'offre gratuite** — émission Factur-X, réception
   des factures fournisseurs, e-reporting B2C et international, sans abonnement ni carte bancaire.
   **C'est exactement la réserve R1 du § 4.4, et Tiime la résout.**
2. C'est nativement le dossier du comptable : aucune passerelle, aucun export.

Un inconvénient rédhibitoire dans votre cas :

**Pas d'API publique** — elle figure encore sur la roadmap produit de Tiime. Or vous devez émettre
une facture **à chaque paiement Stripe**, automatiquement. Sans API, c'est de la saisie manuelle :
non viable dès quelques dizaines de dossiers par mois, et cela annule l'intérêt du projet.

Contournement possible : **Chift**, une API unifiée de comptabilité qui expose un connecteur Tiime.
Mais cela ajoute un quatrième prestataire payant — exactement ce que vous voulez éviter — et un
maillon de plus dans la chaîne.

**Conclusion : gardez Qonto pour l'émission.** L'API est le critère décisif et elle n'existe que
là. La bonne question n'est pas « Tiime ou Qonto » mais **« que fait-on si l'e-reporting Qonto ne
s'ouvre pas ? »** — et Tiime devient alors le plan B sérieux, via Chift ou via une émission
semi-manuelle transitoire.

#### ⚠️ Une piste séduisante mais à ne pas décider seul

On pourrait imaginer **Qonto qui émet et porte l'e-invoicing B2B**, et **Tiime qui porte
l'e-reporting B2C** depuis les écritures de vente importées. C'est tentant, et cela contournerait
R1. C'est aussi **risqué** : deux plateformes agréées sur des périmètres voisins, c'est un risque
de **double transmission ou de trou de transmission**.

Règle à poser noir sur blanc avec votre expert-comptable, et à faire confirmer par les deux
éditeurs : **une seule PA transmet, et le partage de périmètre est explicite.**

### 4.6 Qonto ou Tiime : l'arbitrage

Tiime est **également Plateforme Agréée** (immatriculée le 18/12/2025), gère Factur-X / UBL / CII,
et est **gratuit** pour les petites structures. Avantage décisif : **c'est déjà le canal de votre
comptable**, donc la facture arrive nativement dans le dossier comptable, sans passerelle.

**Arbitrage Qonto vs Tiime** :

| Critère | Qonto | Tiime |
|---|---|---|
| Statut PA | n°23, définitif | Immatriculée 18/12/2025 |
| Coût | Inclus dans votre abonnement | Gratuit |
| API publique documentée | Oui, tous les plans (+ sandbox) | **Non — encore sur la roadmap produit** |
| Rapprochement bancaire | Natif (c'est votre banque) | Via connexion bancaire |
| **E-reporting B2C** | **Bêta, accès restreint** | **Inclus dans l'offre gratuite** |
| Chaîne comptable | Export vers Tiime | **Direct** |

→ **Recommandation : Qonto pour l'émission** — c'est la seule des deux à exposer une API publique
avec sandbox, et sans API il n'y a pas d'automatisation possible. **Tiime reste la chaîne
comptable**, et devient le plan B si l'e-reporting Qonto ne s'ouvre pas. **Une seule PA émettrice**,
sinon vous fracturez votre numérotation.

### 4.7 Ce qu'il ne faut pas faire

- ❌ **Compter sur Stripe seul** : jamais conforme, quelle que soit l'évolution du produit.
- ❌ **Générer des PDF maison** avec une lib Node : après septembre 2027, un PDF n'est pas une
  facture. Et le format Factur-X (PDF/A-3 + XML CII embarqué) est trop coûteux à produire et
  maintenir soi-même — c'est précisément ce que vend une PA.
- ❌ **Ajouter Pennylane/Sellsy** : redondant avec Tiime, contraire à votre objectif.

---

## 5. Architecture cible

```
                       ┌──────────────────────────────────┐
   Client / Notaire ──►│  BailNotarie (Next.js)           │
                       │  • catalogue tarifaire           │
                       │  • modèle Invoice + numérotation │
                       │  • archivage S3 (10 ans)         │
                       └───────┬──────────────────┬───────┘
                               │                  │
                     encaissement            émission fiscale
                               │                  │
                       ┌───────▼──────┐   ┌───────▼─────────────────┐
                       │   STRIPE     │   │  QONTO — Plateforme     │
                       │   (PSP)      │   │  Agréée n°23            │
                       │  PI, Connect │   │  Factur-X • PEPPOL      │
                       │  webhooks    │   │  e-invoicing B2B        │
                       └───────┬──────┘   │  e-reporting B2C + pmt  │
                               │          └───────┬─────────────────┘
                               │                  │
                               │                  ▼
                               │            Annuaire / PPF (DGFiP)
                               │
                               └──────────► TIIME (comptable)
```

**Principe directeur : `Stripe = flux d'argent` / `Qonto PA = flux fiscal` / `Tiime = restitution
comptable`. Votre application est le chef d'orchestre — c'est elle qui détient la vérité métier
(qui, quoi, combien, quand), et elle seule.**

Le point d'articulation est le **webhook Stripe** : c'est l'événement `payment_intent.succeeded`
(et `charge.refunded`) qui déclenche l'émission de la facture chez la PA. Rien d'autre.

---

## 6. Les trois flux à venir

Ces flux ne sont pas encore développés, mais ils **conditionnent l'architecture**. Les concevoir
après coup coûterait une refonte.

### 6.1 Flux A — Acompte client avant intervention du notaire

**Nature juridique** : provision sur frais d'acte, encaissée **pour le compte du notaire**.

⚠️ **C'est le flux le plus sensible du dossier, et le risque n'est pas fiscal — il est
réglementaire.**

Trois contraintes se cumulent :

1. **Encaissement pour compte de tiers (EPCT)** — encaisser des fonds pour autrui est une activité
   réglementée par l'ACPR, normalement réservée aux établissements de paiement agréés. La voie
   praticable est **Stripe Connect**, qui vous fait bénéficier du statut d'**agent de paiement** de
   Stripe sous sa propre licence européenne — évitant un agrément propre (coût pouvant approcher
   le million d'euros, instruction > 3 ans). Stripe a spécifiquement échangé avec l'ACPR sur le
   fonctionnement de Connect en France ; les plateformes françaises doivent utiliser des
   *account tokens*.

2. **Maniement de fonds notariaux** — l'article 15 du décret n° 45-0117 du 19 décembre 1945 oblige
   les notaires à déposer les sommes détenues pour le compte de tiers sur des **comptes de
   disponibilités courantes ouverts à la Caisse des dépôts et consignations**. Le notaire est
   responsable de la **traçabilité des fonds**, des contrôles LCB-FT, de la vérification de
   l'origine des fonds et des bénéficiaires effectifs, avec obligation d'alerte TRACFIN. Une étude
   peut donc **refuser** des fonds transitant par un tiers non identifié.

3. **Vous n'êtes pas le vendeur.** L'acte notarié relève du monopole du notaire (rappelé à
   l'article 2 de vos propres CGV). Vous ne pouvez donc **jamais** facturer une provision sur
   émoluments en votre nom.

**Montage à retenir** :
- Stripe Connect, **destination charge** avec `on_behalf_of` = compte connecté de l'étude ;
- l'étude est le **compte connecté** (KYC/KYB porté par Stripe), le versement arrive sur l'IBAN
  que l'étude désigne (à cadrer avec elle : compte CDC ou compte office) ;
- **la facture / le reçu de provision est émis par le notaire**, jamais par BailNotarie ;
- côté BailNotarie : **aucune écriture de chiffre d'affaires**, aucun e-reporting sur ces sommes ;
  seuls vos frais de service éventuels constituent votre CA.

> **Action préalable indispensable** : validation par un avocat spécialisé **et** par les études
> partenaires (voire la chambre départementale). Ne développez pas ce flux avant.

### 6.2 Flux B — Solde du paiement client → notaire (émoluments)

Même schéma que le flux A, avec un point d'attention supplémentaire :

⚠️ **Vous ne pouvez pas prélever de commission sur les émoluments.** Les émoluments relèvent d'un
**tarif réglementé**, identique sur tout le territoire, et **leur partage ne peut avoir lieu
qu'entre notaires**. Toute commission `application_fee_amount` assise sur les émoluments serait
un partage d'émoluments avec un non-notaire.

**Conséquence structurante sur Stripe Connect** : sur les flux A et B, `application_fee_amount`
doit être **à 0**. Votre rémunération doit être **entièrement déportée** sur le flux C
(abonnement/frais de service facturé à l'étude), avec une assiette qui ne soit pas un pourcentage
des émoluments.

**Traitement fiscal** : sommes encaissées pour compte de tiers → **hors CA**, hors TVA, hors
e-reporting côté BailNotarie. Ce sont des **comptes de tiers** (classe 4), pas des produits.
À cadrer explicitement avec votre comptable via Tiime, sinon ces flux vont gonfler artificiellement
votre chiffre d'affaires apparent et fausser vos seuils TVA.

### 6.3 Flux C — Frais mensuels payés par les notaires

**C'est le flux le plus simple juridiquement, et le plus contraignant fiscalement.**

- Client = **étude notariale française assujettie à la TVA** → **B2B domestique pur**.
- ⇒ **E-invoicing obligatoire via Plateforme Agréée**, format Factur-X/UBL/CII.
- ⇒ **SIREN de l'étude obligatoire** sur la facture (clé de routage annuaire).
- ⇒ Gestion des **statuts de cycle de vie** (déposée, rejetée, encaissée) remontés par la PA.
- ⇒ Facturation **récurrente** → nécessite des `Customer` + `Subscription` Stripe (aujourd'hui
  inexistants, cf. E9).

⚠️ **Attention à l'assiette de facturation.** Une facturation « en fonction des dossiers signés »
s'apparente à une **commission d'apport d'affaires**. Combinée au tarif réglementé, c'est le point
que votre conseil doit sécuriser. Le contrat, et la facture elle-même, doivent décrire une
**prestation de services identifiable** (mise à disposition d'un outil, constitution et
vérification de dossiers, hébergement, support) — et non un pourcentage d'émoluments.
**Un abonnement forfaitaire par palier est nettement plus défendable qu'une commission au dossier.**

### 6.4 Synthèse des quatre flux

| Flux | Vendeur | Acheteur | Qualification | Obligation | Émetteur facture |
|---|---|---|---|---|---|
| Frais de dossier 39,90 € (particulier) | DS SYNC | Particulier | B2C | **E-reporting** (transaction + paiement) | BailNotarie via PA |
| Frais de dossier 39,90 € (SCI/société) | DS SYNC | Assujetti FR | **B2B** | **E-invoicing via PA** | BailNotarie via PA |
| A/B — Acompte + solde émoluments | **Notaire** | Client | EPCT — hors CA BailNotarie | Obligation du **notaire** | **L'étude** |
| C — Frais mensuels notaires | DS SYNC | Étude (assujettie) | **B2B** | **E-invoicing via PA** | BailNotarie via PA |

---

## 7. Plan d'action

### Phase 0 — Avant le 1ᵉʳ septembre 2026 (quelques jours) 🔴

| # | Action | Responsable |
|---|---|---|
| 0.1 | **Activer la facturation électronique dans Qonto** et se référencer à l'annuaire (obligation de **réception**) | Dirigeant, ~1 h |
| 0.2 | **Trancher le statut TVA** de DS SYNC (franchise en base vs assujetti) avec le comptable | Comptable |
| 0.3 | Poser à Qonto les **4 questions du § 4.4** — en priorité l'éligibilité à l'e-reporting | Dirigeant |
| 0.4 | Prendre un rendez-vous avocat sur les flux A/B/C (EPCT, partage d'émoluments) | Dirigeant |

> 0.1 est la seule action réellement **datée au 1ᵉʳ septembre 2026**. Elle est purement
> administrative et se règle en une heure. Ne la manquez pas pour une question de développement.

### Phase 1 — Fondations techniques (2–3 semaines)

1. **Webhook Stripe** (`app/api/stripe/webhook/route.ts`) — vérification de signature via
   `constructEvent`, idempotence, événements `payment_intent.succeeded`, `charge.refunded`,
   `charge.dispute.created`. **Corrige E3 et fiabilise l'ensemble du parcours de paiement,
   indépendamment de la facturation.**
2. **Modèle de données facturation** — un **journal d'émission**, pas une réimplémentation
   de la facturation (voir §&nbsp;7.1 pour la justification) :

```prisma
model Invoice {
  id String @id @default(cuid())

  // — rattachement métier : ce que la PA ne connaîtra jamais —
  clientId     String?
  bailId       String?
  intakeLinkId String?

  // — rattachement paiement : la clé de réconciliation —
  stripePaymentIntentId String  @unique
  stripeRefundId        String?            // avoir

  // — orchestration : la vraie raison d'être de cette table —
  status         IssuanceStatus @default(PENDING)  // PENDING|SUBMITTED|ISSUED|FAILED
  idempotencyKey String         @unique
  attempts       Int            @default(0)
  lastError      String?

  // — miroir de la PA : jamais calculé ici, toujours reçu —
  provider       String    @default("qonto")
  externalId     String?   @unique
  externalNumber String?                    // numéro attribué PAR la PA
  externalStatus String?                    // statut de cycle de vie
  issuedAt       DateTime?

  // — ce qui doit survivre à un changement de PA —
  payload    Json                           // exactement ce qui a été envoyé
  amountTTC  Int                            // réconciliation avec Stripe
  archiveKey String?                        // copie S3 du Factur-X

  createdAt DateTime @default(now())

  @@index([status])
}
```

3. **Numérotation : déléguée à la PA.** Activer la numérotation automatique côté Qonto et se
   contenter de recopier le numéro rendu dans `externalNumber`. Ne **pas** construire de compteur
   maison : une séquence légale à cheval entre votre base et la PA est une source de ruptures
   (environnements multiples, races, factures créées à la main depuis l'interface Qonto).
   Règle absolue en contrepartie : **une seule source émettrice**.

4. **Catalogue tarifaire** — sortir le `3990` du code (E10), historiser le prix sur la facture.
5. **Normaliser `Entreprise.registration` en SIREN** — validation 9 chiffres + clé de Luhn,
   migration des données existantes (E6).
6. **Archivage S3** — le PDF/Factur-X retourné par la PA est archivé et référencé
   (`Invoice.archiveKey`), avec une politique de rétention 10 ans (E11).

### Phase 2 — Raccordement PA (2–3 semaines)

7. Connecteur `lib/einvoicing/` derrière une **interface abstraite** (`EInvoicingProvider`) —
   pour pouvoir basculer Qonto ↔ Tiime ↔ autre sans réécrire le métier. C'est le point
   d'architecture le plus important de tout le chantier.
8. Émission automatique au webhook, en file d'attente **Inngest** (déjà présent dans la stack,
   cf. `INNGEST_IMPLEMENTATION.md`) avec retries — une PA peut être indisponible.
9. Routage B2B / B2C selon `ClientType` : e-invoicing pour `PERSONNE_MORALE`, e-reporting pour
   `PERSONNE_PHYSIQUE`.
10. Réception des **statuts de cycle de vie** de la PA (webhook entrant) → `Invoice.paStatus`.
11. **Gestion des avoirs** (E7) : `charge.refunded` → génération automatique d'une facture
    rectificative transmise à la PA.
12. Mise à jour des CGV : article facturation, mentions TVA, alignement des moyens de paiement
    sur l'implémentation réelle (E8).

### Phase 3 — Flux notaires (après validation juridique)

13. **Stripe Connect** — onboarding des études en comptes connectés (KYB Stripe), *account tokens*.
14. Flux A/B : destination charges, `on_behalf_of` = étude, **`application_fee_amount = 0`**.
15. Comptes de tiers en comptabilité (classe 4), exclusion du CA — à cadrer avec Tiime.
16. Flux C : `Customer` + `Subscription` Stripe pour les études, facture B2B mensuelle via PA,
    avec SIREN de l'étude.

### Phase 4 — Avant le 1ᵉʳ septembre 2027

17. E-reporting des données de paiement (flux 10.2) automatisé depuis `Invoice.paidAt` —
    ou **option TVA sur les débits**, qui **supprime purement et simplement le flux 10.2**.
    Cet arbitrage mérite une discussion avec votre comptable : c'est potentiellement plusieurs
    semaines de développement économisées.
18. Recette avec la PA : émission, rejet, avoir, cycle de vie complet.

---

### 7.1 Pourquoi une table locale si la plateforme agréée fait tout ?

Objection légitime : la PA génère le Factur-X, attribue le numéro, transmet à l'annuaire, fait
l'e-reporting et remonte les statuts. Pourquoi ne pas se contenter d'un champ
`qontoInvoiceId String?` sur `IntakeLink` ?

**Ce qu'il faut effectivement lui déléguer** — et que la version initiale de cet audit avait à
tort prévu de coder : la **numérotation séquentielle**, la génération du format structuré, la
transmission, l'e-reporting, les statuts de cycle de vie. Tout cela sort du périmètre applicatif.

**Ce qu'elle ne fait pas, et qui justifie la table :**

**a) L'idempotence — l'argument décisif.** Scénario réel : le webhook `payment_intent.succeeded`
déclenche l'appel API, qui expire au bout de 30 s. La PA a créé la facture et **consommé un
numéro** ; vous n'avez pas reçu la réponse. Stripe rejoue le webhook (jusqu'à 3 jours). Sans
enregistrement local écrit **avant** l'appel, vous rappelez l'API → **deuxième facture, deuxième
numéro**. Or une facture en trop dans une séquence légale **ne se supprime pas** : il faut émettre
un avoir pour l'annuler — et en B2B elle a déjà été transmise à l'acheteur via l'annuaire.
La table locale n'existe donc pas pour refaire ce que fait la PA : elle existe **parce que** la PA
fait quelque chose d'irréversible.

**b) La réconciliation.** « Quels paiements encaissés n'ont pas de facture ? » est une requête que
vous devez pouvoir passer à tout moment. Avec un simple `qontoInvoiceId` nullable, un `null` est
ambigu : jamais tenté, en cours, ou échoué ? Un statut explicite lève l'ambiguïté.

**c) L'archivage — obligation qui reste la vôtre.** Une PA **n'est pas tenue d'archiver** : ce
n'est pas dans son périmètre réglementaire, c'est une activité annexe que certaines proposent en
option. L'obligation de conservation pèse sur DS SYNC — **6 ans** au titre fiscal (art. L102 B LPF)
et **10 ans** au titre comptable (art. L123-22 C. com.), avec garantie d'authenticité, d'intégrité
et de lisibilité. D'où `archiveKey` et la copie S3.

**d) La portabilité.** C'est le corollaire du connecteur abstrait recommandé au §&nbsp;7 : si tout
l'historique de facturation vit chez un prestataire, en partir revient à n'emporter que des PDF.
147 PA se disputent un marché qui va se consolider.

**e) L'affichage côté client.** La page de confirmation et l'espace client doivent proposer le
téléchargement de la facture. Appeler l'API de la PA à chaque rendu, c'est de la latence, du quota
et un couplage fort.

**f) Le contenu métier.** La PA ne sait pas quel dossier, quel bail, quel tarif au jour de la
vente. Vous construisez ce payload de toute façon — autant conserver ce que vous avez envoyé.

**Le test décisif.** Trois questions auxquelles vous devez pouvoir répondre sans appeler personne :
*ce paiement a-t-il une facture ?* — *y a-t-il des paiements sans facture depuis hier ?* —
*pouvez-vous ressortir cette facture dans huit ans, même après avoir quitté Qonto ?*
Si les trois réponses dépendent de l'API d'un tiers, vous avez externalisé non pas l'émission,
mais votre piste d'audit.

**En pratique** : le modèle passe de ~30 à ~15 champs et change de nature. Ce n'est plus un modèle
de facture, c'est un **journal d'émission** : à qui, pour quel paiement, envoyé quand, avec quel
résultat, archivé où.

---

## 8. Risques

| Risque | Impact | Probabilité | Mitigation |
|---|---|---|---|
| Absence de PA au 01/09/2026 | 500 €, puis 1 000 €/trimestre | **Élevée si inaction** | Action 0.1, ~1 h |
| Absence de facture B2C (arrêté 1983) | Sanction DGCCRF + risque contractuel | **Déjà réalisé** | Phase 1 |
| Facture B2B non électronique après 09/2027 | 15 €/facture, plafond 15 000 €/an | Élevée sans projet | Phases 1–2 |
| E-reporting non transmis | 250 €/transmission, plafond 15 000 €/an | Élevée sans projet | Phases 1–2 |
| Perte de paiement non tracée (pas de webhook) | Perte de CA, litige client | **Actuelle** | Phase 1, action 1 |
| EPCT sans cadre (flux A/B) | Exercice illégal d'activité réglementée | Élevée si mal monté | Stripe Connect + avocat |
| Partage d'émoluments (flux B/C) | Risque déontologique pour l'étude, remise en cause du modèle | Élevée si commission au dossier | `application_fee = 0` + abonnement forfaitaire |
| Franchissement du seuil TVA (37 500 €) en cours d'année | Redressement | Moyenne | Suivi mensuel via Tiime |

---

## 9. Ce qu'il faut retenir

1. **Le problème n'est pas la réforme 2026 — c'est qu'il n'y a pas de facturation du tout.**
   Vous seriez non conforme même sans la réforme (arrêté de 1983, note obligatoire dès 25 € TTC).
2. **Vous n'avez besoin d'aucune nouvelle plateforme.** Qonto (PA n°23) et Tiime (PA) couvrent
   déjà l'obligation. Stripe reste le PSP. Votre stack à 3 outils est la bonne.
3. **Le travail est du développement**, pas de l'achat : webhook, journal d'émission `Invoice`,
   connecteur PA, archivage. Estimation : **5 à 7 semaines** pour les phases 1–2.
   La numérotation, le format et la transmission sont délégués à la PA — ne les codez pas.
4. **Une seule chose est urgente à date** : activer la facturation électronique Qonto et se
   référencer à l'annuaire avant le **1ᵉʳ septembre 2026**. Une heure de travail administratif.
5. **Les flux notaires doivent être validés juridiquement avant d'être développés.** Le risque
   n'y est pas fiscal mais réglementaire (EPCT, partage d'émoluments) — et il porte sur votre
   modèle économique lui-même, pas sur votre code.
6. **Construisez le connecteur PA derrière une interface abstraite.** C'est ce qui vous permettra
   de changer de PA sans refaire le projet — et 147 PA se disputent un marché qui va se consolider.

---

## 10. Sources

**Cadre légal & calendrier**
- [economie.gouv.fr — Tout savoir sur la facturation électronique](https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises)
- [impots.gouv.fr — Facturation électronique et plateformes agréées](https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees)
- [francenum.gouv.fr — Guide de l'e-reporting](https://www.francenum.gouv.fr/guides-et-conseils/pilotage-de-lentreprise/dematerialisation-des-documents/facturation-1)
- [Bpifrance — La réforme à anticiper pour 2026](https://conseil.bpifrance.fr/publications/facturation-electronique-obligatoire-un-tournant-digital-pour-les-entreprises-francaises)
- [Cegid — Calendrier 2026-2027 par type d'entreprise](https://www.cegid.com/fr/facture-electronique-obligatoire/calendrier-facture-electronique/)
- [Pennylane — Dates clés et calendrier](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/facturation-electronique-dates-cles-et-calendrier)
- [KPMG Avocats — Le schéma initialement prévu est modifié](https://kpmg.com/av/fr/avocats/eclairages/2024/10/facturation-electronique-le-schema-initialement-prevu-est-modifie.html)

**E-reporting**
- [Pennylane — E-reporting : définition, obligations et calendrier](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/e-reporting)
- [Fiducial — Guide pratique e-reporting 2027](https://www.fiducial.fr/facturation-electronique/actualites-conseils/comment-faire-e-reporting-guide-etape-par-etape)
- [Tiime — Facturation électronique B2C en 2026](https://blog.tiime.fr/facturation-electronique-b2c-2026)
- [Compta Online — Opérations, données et fréquences](https://www.compta-online.com/ereporting-facture-electronique-ao8418)

**Mentions obligatoires & formats**
- [RECOV — Factur-X : les 4 nouvelles mentions obligatoires (22 → 26)](https://recov.pro/factur-x-mentions-obligatoires-2026.html)
- [Ma facture électronique — SIREN du client](https://ma-facture-electronique.org/reforme-2026/nouvelles-mentions-obligatoires/siren-client/)
- [Fiducial — Mentions obligatoires sur les factures électroniques](https://www.fiducial.fr/facturation-electronique/faq/mentions-obligatoires-facture-electronique)

**Sanctions**
- [Fiducial — Sanctions facture électronique 2026-2027](https://www.fiducial.fr/facturation-electronique/faq/sanctions-non-conformite-obligation-facturation-electronique)
- [AdvizExperts — Article 1737 CGI](https://advizexperts.fr/code-general-impots/article-1737-cgi-amendes-facturation-facture-fictive/)

**Plateformes Agréées**
- [data.gouv.fr — Liste DGFiP enrichie des Plateformes Agréées 2026](https://www.data.gouv.fr/datasets/plateformes-agreees-pa-ex-pdp-pour-la-facturation-electronique-liste-dgfip-enrichie-2026)
- [Comparateur e-Facturation — Liste des PA, août 2026](https://comparateur-efacturation.fr/guide/liste-plateformes-agreees)
- [Qonto — Liste officielle des Plateformes Agréées](https://qonto.com/fr/blog/gestion-entreprise/facturation/liste-des-plateformes-agreees)
- [Infos PA — Qonto est-il une Plateforme Agréée ? Statut DGFiP confirmé](https://www.infos-pa.com/articles/qonto-plateforme-agreee-dgfip)
- [Qonto — Facturation électronique obligatoire](https://qonto.com/fr/invoicing/e-invoicing)
- [Qonto Docs — Create a client invoice (API)](https://docs.qonto.com/api-reference/business-api/expense-management/client-quotes-notes/client-invoices/create-a-client-invoice)
- [Tiime — Tiime devient plateforme agréée](https://blog.tiime.fr/tiime-devient-plateforme-agreee)
- [Tiime — Facturation électronique gratuite : logiciel et plateforme agréée](https://www.tiime.fr/facturation-electronique)

**Stripe & e-invoicing**
- [Stripe — La facturation électronique entre entreprises](https://stripe.com/resources/more/e-invoicing-france)
- [Plateya — Stripe est-il conforme à la facturation électronique ? (2026)](https://www.plateya.fr/blog/detail/stripe-est-il-conforme-a-la-facturation-electronique-2026)
- [ComparePDP — Stripe et facturation électronique 2026](https://comparepdp.com/articles/stripe-facturation-electronique)
- [eFactureConnect — Facturation électronique française pour Stripe](https://efactureconnect.fr/)

**Encaissement pour compte de tiers / Stripe Connect**
- [Stripe — FAQ Stripe Connect et DSP2](https://stripe.com/guides/frequently-asked-questions-about-stripe-connect-and-psd2)
- [Deshoulières Avocats — Encaissement pour compte de tiers et marketplace](https://www.deshoulieres-avocats.com/encaissement-pour-compte-de-tiers-et-marketplace-quel-cadre-juridique/)
- [Victoire Digital — Stripe Connect marketplace France 2026](https://victoire-digital.fr/blog/stripe-connect-marketplace-guide-2026/)

**Réglementation notariale**
- [Légifrance — Décret n° 2023-1297 relatif au code de déontologie des notaires](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000048706693/)
- [Légifrance — Arrêté du 29 janvier 2024, règles professionnelles des notaires](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000049060695)
- [Légifrance — Arrêté du 26 février 2016 fixant les tarifs réglementés des notaires](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000032115585)
- [Banque des Territoires — La consignation au service des notaires](https://www.banquedesterritoires.fr/sites/default/files/2025-06/Webinaire%20Consignation_Notaires%20CA%20Rennes%20et%20dpt%2085_17%2006%2025.pdf)
- [Not-Compta — La réglementation comptable notariale](https://not-compta.fr/prestations/comptable-taxateur/reglementation-comptable-notariale/)

**TVA & obligation de facturation**
- [Bpifrance Création — PLF 2026 : franchise en base de TVA](https://bpifrance-creation.fr/entrepreneur/actualites/plf-2026-franchise-base-tva-annoncee-a-37-500-eu)
- [Le Coin des Entrepreneurs — Franchise en base de TVA, règles 2026](https://www.lecoindesentrepreneurs.fr/franchise-en-base-de-tva-nouvelles-regles-2026/)

**Chaîne comptable Qonto ↔ Tiime**
- [Qonto Support — Comment puis-je intégrer Tiime avec Qonto ?](https://support-fr.qonto.com/hc/fr/articles/48579753282833-Comment-puis-je-int%C3%A9grer-Tiime-avec-Qonto)
- [Qonto — Intégration Tiime](https://qonto.com/en/integrations/tiime)
- [Qonto — Intégration Pennylane, export des factures clients (récurrent)](https://qonto.com/fr/integrations/pennylane-client-invoices-sync)
- [Tiime — Synchronisation bancaire](https://www.tiime.fr/synchronisation-bancaire)
- [Tiime Aide — Comment ajouter mon compte Qonto](https://support.tiime.fr/fr/articles/26264-comment-ajouter-mon-compte-qonto)
- [Tiime — Plateforme agréée : facturation électronique gratuite](https://www.tiime.fr/facturation-electronique)
- [Chift — API unifiée de comptabilité](https://www.chift.eu/fr/tools/tiime)

**Intégration technique Qonto**
- [Spécification OpenAPI Qonto Business API (miroir GitHub)](https://github.com/api-evangelist/qonto)
- [Qonto Docs — Create a client invoice](https://docs.qonto.com/api-reference/business-api/expense-management/client-quotes-notes/client-invoices/create-a-client-invoice)
- [Qonto Docs — Authentification par clé API](https://docs.qonto.com/get-started/business-api/authentication/api-key)
- [Qonto Docs — Webhooks : setup and supported events](https://docs.qonto.com/api-reference/onboarding-api/webhooks/webhooks)
- [Qonto Support — Comment activer et utiliser l'e-reporting avec Qonto](https://support-fr.qonto.com/hc/fr/articles/48509023125521-Comment-activer-et-utiliser-l-e-reporting-avec-Qonto)
- [Selectra — Qonto et la facturation électronique 2026](https://selectra.info/finance/banques/qonto/facturation-electronique)
- [Comparateur — Fiche produit Qonto, plateforme agréée](https://www.comparateur-facturation-electronique.fr/produit/qonto/)
- [Tiime — Roadmap produit : API publique](https://roadmap.tiime.fr/c/458-api-publique)

**Archivage & conservation**
- [Kohen Avocats — Qui doit conserver les factures 10 ans si la plateforme ne les archive pas ?](https://kohenavocats.fr/2026/08/24/facture-electronique-conservation-10-ans-plateforme-agreee-2026/)
- [Pennylane — Archivage facture électronique : durée, règles et sanctions](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/archivage-des-factures-electroniques)
- [Tiime — Archivage des factures électroniques : ce que dit la loi en 2026](https://blog.tiime.fr/archivage-des-factures-electroniques-tout-sera-automatique)
- [Mon Expert en Gestion — Archivage : obligations légales et durée](https://www.mon-expert-en-gestion.com/ressources/archivage-facture-electronique-obligations-duree/)
- [Légifrance — Arrêté n° 83-50/A du 3 octobre 1983](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000494187/)
- [Sénat — Remise d'une note pour prestation de service supérieure à 25 €](https://www.senat.fr/questions/base/2026/qSEQ260207523.html)

---

*Audit réalisé le 27 août 2026 sur la base du code de la branche `main` et des sources publiques
listées ci-dessus. Ce document est une analyse technique et opérationnelle ; il ne constitue pas
un conseil juridique ou fiscal. Les points marqués ⚠️ (encaissement pour compte de tiers, partage
d'émoluments, statut TVA) doivent être validés par un avocat et par votre expert-comptable.*
