# Mission COM — Bail commercial de bout en bout, les quatre rôles

Appareils : `ordinateur` pour le parcours complet, `telephone` pour le questionnaire et les écrans clés.
Rôles : Propriétaire, Locataire (société), Équipe, Notaire — tu enchaînes les quatre sur un même dossier.
Données : `donnees-COM.json` — six dossiers commerciaux fictifs (deux en vérification, deux avec locataire invité,
un sans locataire, un chez le notaire), un compte équipe, un notaire.

## A. Création par le propriétaire (compte neuf `recette-com-nouveau1@example.invalid`)

1. Accueil → badge « bail commercial » → `/commencer` avec le bon type présélectionné.
2. Questionnaire commercial complet : propriétaire **société** (SIREN, représentant légal désigné) ; le local
   (type par cartes : boutique, bureau, local d'activité, entrepôt, autre ; surface ; régime juridique ; situation :
   immeuble / centre commercial / autre ensemble → pièces propres à chaque cas) ; l'activité (déjà loué : oui/non
   et questions qui en découlent) ; durée (3-6-9 ; **dérogatoire** : nombre de mois, 36 au plus, refus au-delà) ;
   loyer hors taxes (mensuel / trimestriel, TVA, indice ILC / ILAT / sans révision, franchise et sa durée) ;
   provision pour charges, dépôt, pas-de-porte, frais d'acte ; répartition des charges (lignes modifiables, lignes
   « toujours au propriétaire ») ; travaux passés et prévus ; garant ; clauses ; locataire avec e-mail + dates
   (date de fin calculée : 9 ans, ou la durée dérogatoire) ; pièces (obligatoires et facultatives) ; paiement
   (**59,90 €**, honoraires « fixés librement »), succès.
3. Mêmes contrôles que pour l'habitation : champs obligatoires, enregistrement, retour arrière, rechargement.
4. Refais le questionnaire sur `telephone` jusqu'au paiement avec un second compte (bail dérogatoire).

## B. Locataire société

Formulaire du locataire d'un dossier « invité » : récapitulatif commercial (loyer HT, périodicité, activité),
société (SIREN, représentant), pièces, confirmation des conditions, envoi. Espace locataire : page du bail
commercial, « HT » partout où il faut.

## C. Équipe

Fiche d'un dossier commercial : conformité légale du bail commercial (règles automatiques et manuelles, pastille),
registre de la société, **conditions commerciales modifiables ligne par ligne** (chaque ligne : modification,
valeur invalide refusée, effet sur l'accord du locataire), loyer annuel affiché, pièces du dossier commercial,
demande de complément portant sur une information commerciale à plusieurs champs (loyer, charges, travaux) puis
acceptation (pas de faux conflit), filtre « commercial » dans la liste, frais de 59,90 € dans le bloc paiement,
envoi au notaire.

## D. Notaire

Fiche notaire d'un dossier commercial : conditions commerciales complètes, société locataire, pièces, zip,
demande au locataire société, statuts.

## E. Cohérences

Aucune mention propre à l'habitation dans un bail commercial (dépôt « 1 mois », encadrement des loyers, DPE
obligatoire si non requis…) ; « HT » ; libellés « local » et non « logement » ; e-mails capturés corrects.
