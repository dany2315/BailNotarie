# Encadrement des loyers : données des arrêtés

Un fichier par territoire encadré (`<id>.json`), importé en base par :

```bash
npm run rent-cap:import            # tous les territoires
npm run rent-cap:import -- paris   # un seul
```

L'import remplace le territoire dans une transaction (tables `RentCapTerritory`,
`RentCapZone`, `RentCapArea`, `RentCapReference`) et ne touche à aucune autre donnée.
À relancer après chaque nouvel arrêté, sur chaque base (staging, puis production).

## Plusieurs arrêtés par territoire

Un bail est contrôlé avec l'arrêté en vigueur à sa prise d'effet. `<id>.json` porte
l'arrêté actuel ; à chaque nouvel arrêté, l'ancien fichier est gardé sous
`<id>-<validFrom>.json` (son `id` devient `<id>-<validFrom>`), avec les mêmes `inseeCodes`.
Exemple : `lyon.json` (depuis le 01/11/2026) et `lyon-2025-11-01.json` (01/11/2025 → 31/10/2026).
Chaque territoire a aujourd'hui son arrêté actuel et le précédent (tableau ci-dessous).
Les contours des arrêtés précédents sont ceux de l'arrêté actuel : secteurs identiques d'une
année sur l'autre (vérifié sur les annexes ou les cartes officielles, voir chaque ligne).
Hors de toutes les périodes intégrées, le plus proche s'applique et la fiche dossier
demande une vérification à la main.

## Contenu d'un fichier

- `inseeCodes` : communes du territoire (Paris et Lyon : ville et arrondissements).
- `zoneMode` : `polygon` (zone trouvée sur la carte à partir de l'adresse),
  `manual` (l'équipe choisit la zone sur les cartes de l'arrêté) ou `pending`
  (commune encadrée, barème pas encore intégré : contrôle avec le simulateur officiel).
- `communeZones` : communes entièrement dans une zone (code INSEE → zone), sans contour.
- `partialInseeCodes` : communes encadrées en partie ; hors des contours, le logement
  n'a pas de plafond (au-delà d'une marge, sinon la zone est à confirmer).
- `precisionM` : contours relevés sur une carte ; à moins de cette distance d'une limite
  de zone (deux fois cette distance pour le périmètre), la zone est à confirmer à la main.
- `periods` : époques de construction de l'arrêté (4 par défaut, 5 à Lyon et Montpellier).
- `zones`, `areas` (contours GeoJSON, coordonnées arrondies au mètre), `references`
  (€/m² : minoré, référence, majoré, par zone, type de logement, pièces, époque, meublé).
- `validFrom` / `validTo` : période d'application de l'arrêté.

Chaque ligne a été contrôlée à la génération : majoré = référence + 20 %,
minoré = référence − 30 % (à l'arrondi près) et, quand l'arrêté le donne,
meublé = vide + majoration unitaire.

## Sources (octobre 2026)

| Territoire | Arrêté | Période | Valeurs | Zones |
|---|---|---|---|---|
| Paris | IDF-2026-06-12-00003 du 12/06/2026 | 01/07 → 24/11/2026 | annexe 2 de l'arrêté, recoupée avec les cartes de la DRIHL (0 écart) | quartiers, open data Ville de Paris |
| Plaine Commune | IDF-2026-04-28-00033 du 28/04/2026 | 01/06 → 24/11/2026 | cartes KML officielles de la DRIHL (referenceloyer) | communes et Saint-Denis infra 1/2 (DRIHL) |
| Est Ensemble | IDF-2026-04-28-00032 du 28/04/2026 | 01/06 → 24/11/2026 | cartes KML officielles de la DRIHL | communes et Montreuil infra 1/2 (DRIHL) |
| Lyon, Villeurbanne | DDT-69-2026-10-23-00004 du 23/10/2026 | 01/11 → 23/11/2026 (article 3 de l'arrêté) | couche officielle Métropole de Lyon `carencadrmtloyer_2026_2027`, recoupée avec l'annexe 1 de l'arrêté (100 lignes, 0 écart) | îlots IRIS de la même couche |
| Lille, Hellemmes, Lomme | 2026-02-10-00006 du 10/02/2026 (RAA Nord 2026-059) | 01/04 → 24/11/2026 | annexe 1 (tableaux relevés page par page) | secteurs officiels de la DDTM du Nord (cartes interactives du portail de Lille, 110 îlots), identiques à l'annexe 2 |
| Montpellier | DDTM34-2026-06-17135 du 09/06/2026 | 01/07 → 23/11/2026 | annexe 1 (tableaux relevés page par page) | îlots IRIS (IGN) : carte vectorielle de l'annexe 2 calée sur les IRIS (93 IRIS, chacun entièrement dans une zone) |
| Bordeaux | arrêté du 06/07/2026 | 15/07 → 24/11/2026 | simulateur officiel de Bordeaux Métropole (« à partir du 15 juillet 2026 », 256 catégories, chaque réponse contrôlée) | îlots IRIS, couche DDTM 33 `l_zonage_oll_bordeaux`, recoupée avec le simulateur (88/88) |
| Grenoble-Alpes Métropole | 38-2026-01-06-00018 du 06/01/2026 | 20/01 → 24/11/2026 | tableau ANIL diffusé par la préfecture (336 valeurs, identiques au texte du PDF) | 13 communes entières par code INSEE ; 8 communes partielles : îlots IRIS (IGN), la carte officielle du périmètre suivant exactement ces îlots |
| Pays basque | arrêté publié le 28/10/2025 | 25/11/2025 → 24/11/2026 | simulateur officiel de l'Agglomération (192 catégories) | îlots IRIS de la carte Géobasque (24 communes couvertes) |

### Arrêtés précédents

| Fichier | Arrêté | Période | Valeurs | Contrôle des zones |
|---|---|---|---|---|
| `paris-2025-07-01` | arrêté IDF de 2025 (Paris) | 01/07/2025 → 30/06/2026 | open data Ville de Paris « Logement - Encadrement des loyers », année 2025 (2 560 lignes) | les 80 quartiers dans les mêmes secteurs qu'en 2026 |
| `plaine-commune-2025-06-01` | arrêté IDF en vigueur le 01/06/2025 | 01/06/2025 → 31/05/2026 | annexe 2 du PDF de la DRIHL (`arrete_pco.pdf`) ; même lecture validée sur l'arrêté 2026 (512 valeurs, 0 écart) | annexe 1 identique à 2026 |
| `est-ensemble-2025-06-01` | arrêté IDF en vigueur le 01/06/2025 | 01/06/2025 → 31/05/2026 | annexe 2 du PDF de la DRIHL (`arrete_ee.pdf`) | annexe 1 identique à 2026 |
| `lyon-2025-11-01` | DDT 69-2025-10-23-00004 | 01/11/2025 → 31/10/2026 | couche officielle Métropole de Lyon `carencadrmtloyer_2025_2026` | îlots IRIS de la même couche |
| `lille-2025-04-01` | arrêté du Nord de 2025 | 01/04/2025 → 31/03/2026 | cartes interactives de la DDTM du Nord (période 2025-2026, 160 valeurs ; même lecture validée sur 2026, 0 écart ; coquille « 14;1 » lue 14,1) | 110 îlots dans les mêmes secteurs qu'en 2026 |
| `montpellier-2025-07-01` | DDTM34-2025-06-15975 | 01/07/2025 → 30/06/2026 | annexe 1 (scan relevé page par page, 100 lignes) | carte de l'annexe 2 comparée à celle de 2026 (à l'œil) |
| `bordeaux-2025-07-15` | arrêté de la Gironde de 2025 | 15/07/2025 → 14/07/2026 | simulateur officiel, « Entre le 15 juillet 2025 et le 14 juillet 2026 » (256 catégories, identifiants 769 à 1024) | zonage DDTM 33 inchangé dans le simulateur |
| `grenoble-2025-01-20` | arrêté de l'Isère du 11/12/2024 | 20/01/2025 → 19/01/2026 | annexe 1 (tableau ANIL d'octobre 2024, 48 lignes) | mêmes 21 communes (13 entières, 8 en partie) |
| `pays-basque-2024-11-25` | arrêté des Pyrénées-Atlantiques du 21/10/2024 | 25/11/2024 → 24/11/2025 | annexe 1 (appartements et maisons, 96 lignes) | même décret de 2023 (24 communes) |

Chaque ligne a été contrôlée comme pour les arrêtés actuels (majoré, minoré, meublé et, au Pays basque, maison = appartement + majoration).

L'expérimentation de l'encadrement (article 140 de la loi ELAN) se termine le
24 novembre 2026, sauf prolongation par la loi (examinée au Sénat en octobre 2026).
Un bail qui prend effet avant ou après les périodes des arrêtés intégrés n'est ni
contrôlé automatiquement ni bloqué : la fiche dossier demande une vérification à la main.
Toutes les zones sont trouvées à partir de l'adresse ; l'équipe ne choisit une zone qu'en cas d'erreur.
