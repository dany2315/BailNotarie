# Défauts de la recette complète et solutions proposées

Recette du 16 et 17/11/2026 : huit agents, 1 239 vérifications, 99 en défaut et 72 partielles. Ces 171 constats
recouvrent **environ 55 défauts distincts**, regroupés ci-dessous (un même défaut vu sur plusieurs appareils ou par
plusieurs agents n'apparaît qu'une fois, avec tous ses numéros).

Origine : **branche** = code ajouté par `codex/prep-pr-main` ; **staging** = déjà présent sur staging (donc absent
de main ou présent aussi en production selon le cas) ; **montage** = dû à l'environnement de test.

Colonne « Plan » :
- **Prévu** : fait partie des corrections programmées pour la reprise automatique de 14 h 07.
- **Proposé** : je propose de le corriger ; à ajouter si vous êtes d'accord.
- **Décision** : il faut d'abord votre choix, la bonne solution dépend du métier.
- **Fait** : déjà corrigé sur la branche (commit local, rien de poussé).

Rien n'est encore vérifié à l'écran après correction ; chaque correction le sera.

---

## 1. Bloquants

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| B1 | **N'importe quel visiteur peut se créer un compte administrateur.** `/register` et `POST /api/auth/sign-up/email` créent un compte au rôle par défaut du schéma (`ADMINISTRATEUR`), déjà connecté. Même code sur main, donc très probablement en production. | PUB-330, 331, 332 | staging (et main) | Inscription par mot de passe coupée côté serveur (`disableSignUp`), lien retiré ; à votre demande du 17/11, `/register` n'est plus accessible du tout et mène à la connexion client `/client/login` (redirection dans `next.config`, et en secours dans la page). En plus, plus tard : passer le rôle par défaut du schéma à `UTILISATEUR` (migration sans effet sur les comptes existants). À faire de votre côté : vérifier la liste des administrateurs en production. | **Fait** (ca67e38, c66a537), vérifié le 17/11 |
| B2 | **Un locataire « entreprise » ne peut pas envoyer son formulaire** : à l'étape « Informations de l'entreprise », « Continuer » ne fait rien et n'affiche rien. Le serveur exige un nom commercial que l'écran ne demande jamais. | LOC-056, COM-063, COM-093 | staging | Reprendre la raison sociale comme nom commercial quand il n'est pas saisi (comme le fait déjà le formulaire propriétaire), et afficher les erreurs de validation au lieu de les taire. | **Fait** (cbba25d), vérifié le 17/11 |
| B3 | **Sur ce même écran, le champ e-mail se grise dès la première lettre.** Le verrou est calculé sur la valeur en cours de frappe. | LOC-055 | staging | Validé avec vous le 17/11 : l'adresse saisie par le propriétaire pour inviter le locataire est son adresse de connexion. Elle est préremplie et grisée partout, y compris comme e-mail de la société quand le locataire choisit « Entreprise ». Plus aucun champ e-mail modifiable pour le locataire. | **Fait** (cbba25d), vérifié le 17/11 |

## 2. Majeurs

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| M1 | **Les refus du serveur s'affichent en anglais technique** (« An error occurred in the Server Components render… », réponse 500) : e-mail déjà utilisé, identique au propriétaire, mal formé, jour de paiement 0, champs manquants. Le défaut le plus répandu, vu par cinq agents. | PRO-D-023, 027, 049, 082 · PRO-M-044, 045, 078 · LOC-045 · ADM-1-019, 022, 053, 063, 064 · COM-024, 025 | staging | Les actions serveur lèvent une erreur que la version de production masque. Les faire renvoyer `{ error: "message en français" }` et l'afficher (formulaire propriétaire, formulaire locataire, ajout du locataire, lead, invitation, nouveau client, nouveau bail). | **Fait** (1eab42d), vérifié le 17/11 |
| M2 | **Fuite de confidentialité dans la messagerie : les fichiers échangés en privé entre le notaire et le propriétaire apparaissent dans les « Documents » du locataire**, qui peut les ouvrir, et inversement. | NOT-093, NOT-094 | staging | Ne montrer à un client que les fichiers de son propre fil, et refuser l'accès à un fichier de messagerie qui ne lui est pas destiné. | **Fait** (a70ef68), vérifié le 17/11 |
| M3 | **Fuite de confidentialité : `GET /api/bail/<id>/messages` renvoie à une partie tous les messages du bail**, y compris le fil de l'autre partie (l'écran, lui, filtre). | NOT-097 | staging | Filtrer côté serveur : un client ne reçoit que son fil ; notaire et équipe, tout. | **Fait** (a70ef68), vérifié le 17/11 |
| M4 | **E-mail du locataire « pas-un-mail » accepté** à l'étape « Locataire » du formulaire propriétaire, enregistré, et invitation déclenchée vers cette adresse. | PRO-D-048 | staging | Valider le format côté écran et côté serveur avant tout enregistrement ; aucune invitation sans adresse valide. | **Fait** (b5cefa5), vérifié le 17/11 |
| M5 | **La date de fin ne suit pas quand l'équipe change le type de bail ou la prise d'effet depuis la fiche** (meublé 9 mois affiché sur 3 ans). Contraire à votre règle : la date de fin est toujours calculée. | ADM-2-049, 066 | staging | Calculer la date de fin côté serveur à chaque modification du type ou de la prise d'effet ; ne plus la proposer à la saisie (sauf bail dérogatoire, calculé depuis sa durée). | **Fait** (64f8d18), vérifié le 17/11 |
| M6 | **Fausse erreur au client quand la base est lente** : il voit « Non enregistré » et un message technique, alors que sa réponse à une demande est enregistrée. | ADM-2-106 | **branche** | Sortir de la transaction de 5 secondes le calcul des pièces qui seraient demandées ensuite ; s'il échoue, la réponse reste un succès. | **Fait** (6eeb528), vérifié le 17/11 |
| M7 | **Paiement possible alors qu'une pièce obligatoire manque** : après suppression du Kbis, « Continuer vers le paiement » ouvre quand même le paiement. | PRO-M-060 | staging | Vérifier les pièces obligatoires côté serveur avant de créer l'ordre de paiement, et relire la liste à jour côté écran. | **Fait** (d377779), vérifié le 17/11 |
| M8 | **N'importe quel type de fichier est accepté comme pièce** (`.txt`, `.zip` enregistrés comme « Statuts »). | PRO-M-054, ADM-2-136 | staging | Liste fermée PDF, JPG, PNG, HEIC, DOC, DOCX : filtre du sélecteur de fichiers et contrôle côté serveur au moment de l'envoi. | **Fait** (e781167), vérifié le 17/11 |
| M9 | **Le bouton « retour » du téléphone fait quitter le formulaire** au lieu de revenir à l'étape précédente. | PRO-M-013 | staging | Inscrire chaque étape dans l'historique du navigateur et réagir au retour en revenant d'une étape. | **Fait** (ace41dd), choix A validé le 17/11, vérifié sur Android et iPhone |
| M10 | **Réassigner un dossier à un autre notaire laisse l'accès à l'ancien** ; la fiche n'affiche que le dernier. | ADM-2-115 | staging | Remplacer l'assignation (l'ancien notaire perd l'accès) dans la même opération. Si vous voulez que l'ancien garde un accès en lecture, il faut le dire. | **Fait** (95de6df), vérifié le 17/11 |
| M11 | **L'identité des parties reste modifiable, sans trace, sur un dossier déjà chez le notaire, et même signé.** | ADM-2-118 | staging | Verrouiller après « Signé » ; entre « Prêt pour notaire » et « Signé », garder la modification mais l'inscrire à l'historique et prévenir le notaire. | **Décision** |
| M12 | **« Créer un notaire » avec l'adresse d'un compte existant change son rôle sans avertissement** (un client perd son accès client). | ADM-1-094, ADM-1-085 | staging | Refuser si l'adresse appartient à un compte d'un autre rôle ; si c'est déjà un notaire, le dire. | **Fait** (46e2b94), refus avec message validé le 17/11, vérifié à l'écran |
| M13 | **Un lien de formulaire créé par l'équipe est inutilisable** (« rattaché à aucun dossier ») et le bail choisi n'est pas enregistré. | ADM-1-062, ADM-1-065 | staging | L'écran envoie `leaseId`, l'action lit `bailId` : aligner les deux. | **Fait** (7e1027e), vérifié à l'écran : le locataire ouvre bien son formulaire |
| M14 | **« Nouveau client complet » échoue si l'on ne remplit que les champs marqués obligatoires** : le serveur exige aussi profession, téléphone, adresse, nationalité, naissance. | ADM-1-063 | staging | Aligner l'écran et le serveur : soit marquer ces champs obligatoires, soit les rendre facultatifs pour une création par l'équipe (le client complétera). Je propose la seconde. | **Fait** (172b3bc), choix « facultatifs » validé le 17/11, vérifié à l'écran |
| M15 | **Rien ne prévient le locataire qu'il doit reconfirmer** après un changement de loyer : il ne le découvre qu'en ouvrant son espace. | LOC-122 | **branche** (voulu par le plan) | Un e-mail unique « vos conditions ont changé, merci de les confirmer », sans relance automatique. | **Fait** (7f8d559), e-mail unique validé le 17/11, vérifié (un seul envoi après deux modifications) |
| M16 | Paiement de 59,90 € encaissé par Stripe, puis quatre envois du formulaire en échec pendant un quart d'heure ; le rechargement suivant a abouti sans second débit. | COM-034 | montage probable | Probablement la surcharge (huit agents, base distante). Je le rejouerai seul à la vérification finale ; s'il se reproduit, allonger le délai de la transaction d'envoi. | **Non reproduit** le 17/11 : rejoué seul (compte neuf, dossier commercial complet, carte 4242), payé et soumis du premier coup, un seul paiement, aucune erreur serveur. Cause retenue : la surcharge du montage |

## 3. Mineurs

### Dates, montants, contrôles de saisie

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m1 | Jour de paiement 31 accepté alors que le champ annonce 1 à 28 ; jour 0 → erreur en anglais. | PRO-D-051, COM-026 | **branche** | Borner à 1-28 côté écran et serveur, avec un message clair. | **Prévu** |
| m2 | Date de prise d'effet dans le passé (2020, 2021) acceptée sans avertissement. | PRO-D-051, PRO-M-050, COM-028 | branche / staging | Avertir sans bloquer pour une date passée (un bail peut déjà avoir commencé), refuser au-delà d'un an dans le passé. | **Décision** |
| m3 | Date de naissance future ou d'un mineur acceptée. | LOC-018, LOC-112, PRO-D-016 | staging | Refuser une date future ; refuser un âge inférieur à 18 ans. | **Proposé** |
| m4 | Téléphones incomplets ou inexistants acceptés (« +33 6 12 », « +33 12 »). | LOC-013, PRO-M-022, ADM-1-038, ADM-2-057 | staging | Valider avec la bibliothèque de numéros déjà utilisée par le champ (numéro réellement possible pour le pays). | **Proposé** |
| m5 | E-mail et téléphone du syndic non contrôlés. | PRO-D-035, PRO-M-035, COM-010 | staging | Même validation que les autres adresses et numéros. | **Proposé** |
| m6 | Surface négative ou démesurée acceptée (-7 m², 100 000 m²). | ADM-1-098, PRO-D-030 | staging | Refuser ≤ 0 ; avertir au-delà de 10 000 m². | **Proposé** |
| m7 | Régime matrimonial conservé en base après retour à « célibataire ». | LOC-114 | staging | Effacer le régime quand le statut n'est plus « marié ». | **Proposé** |
| m8 | Pièces exigées selon le régime matrimonial du locataire : écart signalé, à relire. | LOC-024 | staging | Vérifier contre la règle que vous avez validée (contrat de mariage selon le régime). | **Proposé** (vérification) |
| m9 | E-mail du locataire principal modifiable alors qu'un verrou est prévu. | LOC-012 | staging | Lié à B3 : l'adresse de l'invitation, préremplie et grisée. | **Fait** (cbba25d), vérifié le 17/11 |
| m10 | « Une seconde personne » : sous un e-mail vide, « Email invalide » au lieu de « L'email est requis ». | LOC-043 | staging | Message adapté. | **Proposé** |

### Branche (petits défauts de notre code)

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m11 | En acceptant une « autre pièce », la fenêtre d'archivage propose les fichiers de la messagerie, sans rapport. | NOT-117 | **branche** | Exclure les fichiers de messagerie (et ne rien proposer pour une pièce libre). | **Prévu** |
| m12 | « Nouveau bail » côté équipe : locataire sans jour de paiement refusé sans explication (le champ manque à l'écran). | ADM-1-064 | **branche** | Ajouter la date de prise d'effet et le jour de paiement au formulaire quand un locataire est choisi. | **Prévu** |

### Libellés et textes

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m13 | Codes internes affichés : CELIBATAIRE, MARIE…, APPARTEMENT, BOUTIQUE, PLEIN PROPRIETE. | PRO-D-018, LOC-008, LOC-015, PRO-M-114, ADM-1-052, COM-062, COM-092 | staging | Libellés en clair partout (« Célibataire », « Marié(e) », « Pleine propriété », « Boutique »). | **Proposé** |
| m14 | Fautes : « Bail nue 3 ans », « Bail nue 6 ans », « Plein propriété » ; « bail nu 6 ans (SCI) » proposé à un particulier. | PRO-D-038 | staging | Corriger les libellés ; ne proposer « 6 ans » qu'à une personne morale. | **Proposé** |
| m15 | Messages techniques en anglais : « Invalid input: expected string… », « OTP expired », messages de `/login`, « Please fill out this field ». | PUB-112, PUB-313, PUB-320, LOC-051, COM-067, COM-097 | staging | Traduire les messages de validation et de connexion. | **Proposé** |
| m16 | Récapitulatif présenté au locataire d'un bail commercial : pas de « HT », ni périodicité, ni activité, « Type de bail » vide, vocabulaire « logement ». Info-bulle « surface habitable du logement » sur un local. | COM-061, COM-091, COM-062, COM-092, COM-045 | staging | Récapitulatif propre au bail commercial ; textes « local ». | **Proposé** |
| m17 | Nom des fichiers téléchargés depuis la messagerie précédé d'un horodatage et d'un identifiant ; pièces libres intitulées « Autre document ». | NOT-095, NOT-119 | staging | Nom d'origine au téléchargement ; intitulé « Pièce jointe — <nom> ». | **Proposé** |

### Formulaires et espace client

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m18 | Reprise du formulaire propriétaire : l'étape « Type de contrat » est sautée, bail nu 3 ans retenu d'office. | PRO-D-039 | staging | Ne pas considérer la valeur par défaut comme une réponse. | **Proposé** |
| m19 | Formulaire locataire repris toujours à l'étape 1. | LOC-021 | staging | Reprendre à la première étape incomplète. | **Proposé** |
| m20 | Étape « Le loyer » : il faut parfois toucher deux fois « Continuer ». | PRO-M-119 | staging | Un seul appui valide la question en cours et avance. | **Proposé** |
| m21 | Pièce supprimée sans confirmation ; boutons de 32 px sans intitulé ; suppression d'un fichier parfois sans effet. | PRO-M-058, PRO-M-059, PRO-D-056 | staging | Confirmation avant suppression, boutons de 44 px avec intitulé ; revérifier la suppression sans effet. | **Proposé** |
| m22 | Erreur React n° 418 à l'ouverture de plusieurs pages (date calculée dans le fuseau du serveur, puis du navigateur). | PRO-D-079, LOC-070, LOC-085, LOC-099, PRO-M-076 | staging | Formater toutes les dates dans le fuseau Europe/Paris. | **Proposé** |
| m23 | La bulle « Support » recouvre le bouton principal sur iPhone et petit écran (accueil, `/commencer`, menu, fenêtre « Demander »). | PUB-543, 544, 554, PRO-M-132, 168, NOT-177 | staging | La remonter au-dessus du bouton principal, ou la masquer sur les formulaires en petit écran. | **Proposé** |
| m24 | Connecté, deux liens de l'accueil renvoient encore vers la saisie de l'e-mail. | PUB-105, 125, 145 | staging | Les faire pointer vers l'espace client. | **Proposé** |
| m25 | « Mes informations » est en lecture seule ; « Mes dossiers » sans filtre. | PRO-D-078, PRO-D-071 | staging | Fonctionnalités absentes, pas des défauts : à décider pour plus tard. | **Décision** |

### Espace de l'équipe

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m26 | Tuile « Frais non payés » (63) différente de la liste qu'elle ouvre (70, tous statuts). | ADM-1-013 | staging | Ouvrir la liste avec le même filtre que la tuile. | **Proposé** |
| m27 | Deux boutons « Nouveau dossier » mènent à deux écrans différents. | ADM-1-015 | staging | Un seul parcours, ou deux libellés distincts. | **Décision** |
| m28 | Adresse de liste avec un statut inconnu ou une page négative → page d'erreur. | ADM-1-034 | staging | Ignorer les paramètres invalides. | **Proposé** |
| m29 | Recherche « par token » des formulaires envoyés sans effet ; recherche des dossiers sans le libellé du bien. | ADM-1-060, ADM-1-027 | staging | Brancher la recherche ; ajouter le libellé. | **Proposé** |
| m30 | « Relancer » depuis la liste, bouton d'envoi grisé quand la relance n'est pas due, sans explication. | ADM-1-041 | staging | Dire pourquoi et quand la relance sera possible. | **Proposé** |
| m31 | Tablette (768 px) : boutons et listes coupés quand le menu est déplié. | ADM-1-111, 116, 120 | staging | Replier le menu par défaut sous 1 024 px, boutons qui passent à la ligne. | **Proposé** |

### Espace du notaire

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m32 | Le notaire n'est prévenu de rien quand le client répond à sa demande. | NOT-075 | staging | Notification visible dans son espace et e-mail. | **Décision** |
| m33 | Recherche sensible aux accents et limitée à l'onglet affiché ; pas de tri ; lien direct invalide sans message. | NOT-029, NOT-027, NOT-032 | staging | Recherche sans accents sur tous les onglets ; tri par date ; message « dossier introuvable ». | **Proposé** |

### Site public et routes d'API

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m34 | Page de maquette `/testFiches` publique et indexable. | PUB-017, 035, 053 | staging | La supprimer ou la réserver à l'équipe. | **Proposé** |
| m35 | Lien « Processus » du pied de page vers une ancre inexistante (`/#process`). | PUB-110, 130, 150, 505 | staging | Pointer vers `/#processus`. | **Proposé** |
| m36 | Bouton « S'abonner » du blog sans effet. | PUB-231, 271, 281 | staging | Brancher l'inscription, ou retirer l'encart. | **Décision** |
| m37 | Image absente dans l'article « Bail notarié ou bail classique ». | PUB-252, 267, 274, 284 | staging | Remettre le fichier. | **Proposé** |
| m38 | Simulateur : montants négatifs ou nuls donnent des résultats négatifs ; textes sans accents. | PUB-203, 209, 215, 205 | staging | Refuser ≤ 0 ; corriger les textes. | **Proposé** |
| m39 | Une page privée ou de tunnel reste indexable ; quelques titres trop longs. | PUB-503, PUB-502 | staging | `noindex` sur toutes les pages privées et de tunnel. | **Proposé** |
| m40 | Routes d'API : refus renvoyés en 500 au lieu de 401/403. Aucune donnée ne fuit. | PUB-401 à 405, PUB-423 | staging | Renvoyer 401/403. | **Proposé** |
| m41 | `check-user` et `prepare-login` disent publiquement si une adresse est cliente ou notaire (annuaire). | PUB-425 | staging | Réponse identique quelle que soit l'adresse. | **Proposé** |
| m42 | Anciennes routes de connexion par code encore exposées (sans effet pour se connecter). | PUB-426 | staging | Les supprimer. | **Proposé** |
| m43 | `create-payment-intent-bail` délivre un ordre de paiement à un notaire ou à l'équipe. | PUB-420 | staging | Réserver aux clients propriétaires du dossier. | **Proposé** |

## 4. Observation importante, hors défauts

**Google Analytics se charge sans consentement**, avec l'identifiant de production, sur le site public et aussi
dans l'espace de l'équipe ; l'identifiant du dossier figure dans les adresses envoyées à Google (PUB, ADM-2).
Conséquences : les navigateurs de test ont envoyé des pages vues à Google pendant la recette (visites sur
`localhost`, comptes fictifs), et en production les vrais visiteurs sont mesurés sans consentement.
**Fait le 17/11** (décision validée) : bandeau de consentement avant tout chargement, aucune mesure dans
`/interface`, `/client`, `/notaire`, `/intakes`, `/login` et le tunnel `/commencer/…`, lien « Gérer les cookies ». Vérifié à l'écran.

## 5. Dus au montage de test (non retenus)

Images du blog non chargées sous la charge des huit agents (PUB-230, 232, 236, 238, 239, 272, 282) ; notification
relevée trop tard par un script (COM-029) ; données créées directement en base sans répartition des charges
(COM-071) ; vérifications de lecture (COM-040, COM-100) ; COM-034 traité plus haut (M16).

## 6. État au 17/11 après les corrections

Corrigées et vérifiées à l'écran : B1 à M10 (M9 compris, choix A du 17/11), puis M12 à M15 selon vos choix du 17/11 et le consentement à Google Analytics. 137 tests serveur au vert. B1 à M10 sont sur staging depuis da5b701 ; le bandeau de cookies et M12 à M15 depuis e2af2dd (17/11). Aucune PR, aucune fusion, rien en production.
Toutes les autres lignes attendent votre accord, une par une.

Pour ajouter des lignes **Proposé**, dites lesquelles (« tout », ou des numéros). Pour les **Décision**, donnez
votre choix ; sans réponse, elles restent dans le rapport comme points ouverts.
