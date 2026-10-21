# Encadrement des loyers : données des arrêtés

Un fichier par territoire encadré (`<id>.json`), importé en base par :

```bash
npm run rent-cap:import            # tous les territoires
npm run rent-cap:import -- paris   # un seul
```

L'import remplace le territoire dans une transaction (tables `RentCapTerritory`,
`RentCapZone`, `RentCapArea`, `RentCapReference`) et ne touche à aucune autre donnée.
À relancer après chaque nouvel arrêté, sur chaque base (staging, puis production).

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
| Lyon, Villeurbanne | arrêté en vigueur depuis le 01/11/2025 | 01/11/2025 → 31/10/2026 (fin à confirmer) | couche officielle Métropole de Lyon `carencadrmtloyer_2025_2026` | îlots IRIS de la même couche |
| Lille, Hellemmes, Lomme | 2026-02-10-00006 du 10/02/2026 (RAA Nord 2026-059) | 01/04 → 24/11/2026 | annexe 1 (tableaux relevés page par page) | secteurs officiels de la DDTM du Nord (cartes interactives du portail de Lille, 110 îlots), identiques à l'annexe 2 |
| Montpellier | DDTM34-2026-06-17135 du 09/06/2026 | 01/07 → 23/11/2026 | annexe 1 (tableaux relevés page par page) | îlots IRIS (IGN) : carte vectorielle de l'annexe 2 calée sur les IRIS (93 IRIS, chacun entièrement dans une zone) |
| Bordeaux | arrêté du 06/07/2026 | 15/07 → 24/11/2026 | simulateur officiel de Bordeaux Métropole (« à partir du 15 juillet 2026 », 256 catégories, chaque réponse contrôlée) | îlots IRIS, couche DDTM 33 `l_zonage_oll_bordeaux`, recoupée avec le simulateur (88/88) |
| Grenoble-Alpes Métropole | 38-2026-01-06-00018 du 06/01/2026 | 20/01 → 24/11/2026 | tableau ANIL diffusé par la préfecture (336 valeurs, identiques au texte du PDF) | 13 communes entières par code INSEE ; 8 communes partielles : îlots IRIS (IGN), la carte officielle du périmètre suivant exactement ces îlots |
| Pays basque | arrêté publié le 28/10/2025 | 25/11/2025 → 24/11/2026 | simulateur officiel de l'Agglomération (192 catégories) | îlots IRIS de la carte Géobasque (24 communes couvertes) |

L'expérimentation de l'encadrement (article 140 de la loi ELAN) se termine le
24 novembre 2026, sauf prolongation par la loi (examinée au Sénat en octobre 2026).
Un bail qui prend effet avant ou après la période de l'arrêté intégré n'est ni
contrôlé automatiquement ni bloqué : la fiche dossier demande une vérification à la main.
Lyon : l'arrêté intégré se termine le 31/10/2026 ; à remplacer dès la publication du suivant.
Toutes les zones sont trouvées à partir de l'adresse ; l'équipe ne choisit une zone qu'en cas d'erreur.
