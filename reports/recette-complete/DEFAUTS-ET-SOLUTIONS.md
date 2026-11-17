# Défauts de la recette complète et solutions proposées

Recette du 16 et 17/11/2026 : huit agents, 1 239 vérifications, 99 en défaut et 72 partielles. Ces 171 constats
recouvrent **environ 55 défauts distincts**, regroupés ci-dessous (un même défaut vu sur plusieurs appareils ou par
plusieurs agents n'apparaît qu'une fois, avec tous ses numéros).

Origine : **branche** = code ajouté par `codex/prep-pr-main` ; **staging** = déjà présent sur staging (donc absent
de main ou présent aussi en production selon le cas) ; **montage** = dû à l'environnement de test.

Colonne « Plan » :
- **Fait** : corrigé et vérifié (à l'écran et par les tests serveur).
- **À valider** : défaut de notre propre branche ; je propose de le corriger, j'attends votre oui.
- **Proposé** : je propose de le corriger ; à ajouter si vous êtes d'accord.
- **Décision** : il faut d'abord votre choix, la bonne solution dépend du métier.

Mis à jour le 17/11/2026 au soir. Le récapitulatif de ce qui est fait et de ce qu'il reste à faire est en section 6.

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
| m1 | Jour de paiement 31 accepté alors que le champ annonce 1 à 28 ; jour 0 → erreur en anglais. | PRO-D-051, COM-026 | **branche** | Borner à 1-28 côté écran et serveur, avec un message clair. | **Fait** le 17/11 : 1 à 28 partout (formulaires, fiche de l'équipe, compléments), message « Le jour de paiement doit être compris entre 1 et 28. » ; un jour déjà enregistré (29 à 31) reste accepté pour ne pas bloquer les dossiers existants |
| m2 | Date de prise d'effet dans le passé (2020, 2021) acceptée sans avertissement. | PRO-D-051, PRO-M-050, COM-028 | branche / staging | Votre choix du 17/11 : refuser toute date passée (aujourd'hui accepté, heure de Paris). Contrôle côté serveur partout où la date se saisit ; jours passés grisés au calendrier et message sous le champ. Une date déjà enregistrée n'est jamais refusée, pour ne pas bloquer les dossiers en cours. | **Fait** (e3c711f), vérifié à l'écran (fiche de l'équipe, « Nouveau client complet ») et par 4 tests serveur ; s'applique aussi aux réponses aux compléments |
| m3 | Date de naissance future ou d'un mineur acceptée. | LOC-018, LOC-112, PRO-D-016 | staging | Refuser une date future ; refuser un âge inférieur à 18 ans. | **Fait** le 17/11 : date future et moins de 18 ans refusées (formulaires, fiche de l'équipe, compléments) |
| m4 | Téléphones incomplets ou inexistants acceptés (« +33 6 12 », « +33 12 »). | LOC-013, PRO-M-022, ADM-1-038, ADM-2-057 | staging | Valider avec la bibliothèque de numéros déjà utilisée par le champ (numéro réellement possible pour le pays). | **Fait** le 17/11 : contrôle par react-phone-number-input (numéro réellement possible pour le pays), même règle partout |
| m5 | E-mail et téléphone du syndic non contrôlés. | PRO-D-035, PRO-M-035, COM-010 | staging | Même validation que les autres adresses et numéros. | **Fait** le 17/11 : e-mail et téléphone du syndic contrôlés (formulaire, enregistrement d'étape, fiche du bien, compléments) |
| m6 | Surface négative ou démesurée acceptée (-7 m², 100 000 m²). | ADM-1-098, PRO-D-030 | staging | Refuser ≤ 0 ; avertir au-delà de 10 000 m². | **Fait** le 17/11 : 0 et négatif refusés partout ; au-delà de 10 000 m², avertissement orange sous le champ, sans blocage |
| m7 | Régime matrimonial conservé en base après retour à « célibataire ». | LOC-114 | staging | Effacer le régime quand le statut n'est plus « marié ». | **Fait** le 17/11 : régime effacé dès que la personne n'est plus mariée (formulaires, fiche de l'équipe) |
| m8 | Pièces exigées selon le régime matrimonial du locataire : écart signalé, à relire. | LOC-024 | staging | Vérifier contre la règle que vous avez validée (contrat de mariage selon le régime). | **Vérifié** le 17/11 : les pièces suivent la règle validée (contrat de mariage sauf communauté réduite aux acquêts, convention de PACS) ; l'écart venait du régime conservé (m7, corrigé) |
| m9 | E-mail du locataire principal modifiable alors qu'un verrou est prévu. | LOC-012 | staging | Lié à B3 : l'adresse de l'invitation, préremplie et grisée. | **Fait** (cbba25d), vérifié le 17/11 |
| m10 | « Une seconde personne » : sous un e-mail vide, « Email invalide » au lieu de « L'email est requis ». | LOC-043 | staging | Message adapté. | **Fait** le 17/11 : « L'email est requis » quand le champ est vide, « Email invalide » quand il est mal formé |

### Branche (petits défauts de notre code)

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m11 | En acceptant une « autre pièce », la fenêtre d'archivage propose les fichiers de la messagerie, sans rapport. | NOT-117 | **branche** | Exclure les fichiers de messagerie (et ne rien proposer pour une pièce libre). | **À valider** |
| m12 | « Nouveau bail » côté équipe : locataire sans jour de paiement refusé sans explication (le champ manque à l'écran). | ADM-1-064 | **branche** | Ajouter la date de prise d'effet et le jour de paiement au formulaire quand un locataire est choisi. | **À valider** |

### Libellés et textes

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m13 | Codes internes affichés : CELIBATAIRE, MARIE…, APPARTEMENT, BOUTIQUE, PLEIN PROPRIETE. | PRO-D-018, LOC-008, LOC-015, PRO-M-114, ADM-1-052, COM-062, COM-092 | staging | Libellés en clair partout (« Célibataire », « Marié(e) », « Pleine propriété », « Boutique »). | **Fait** le 17/11 : libellés en clair dans les formulaires, les fiches de l'équipe et le récapitulatif du locataire |
| m14 | Fautes : « Bail nue 3 ans », « Bail nue 6 ans », « Plein propriété » ; « bail nu 6 ans (SCI) » proposé à un particulier. | PRO-D-038 | staging | Corriger les libellés ; ne proposer « 6 ans » qu'à une personne morale. | **Fait** le 17/11 : « Bail nu », « Pleine propriété » ; « Bail nu 6 ans (société) » proposé seulement à une personne morale (ou s'il est déjà choisi) |
| m15 | Messages techniques en anglais : « Invalid input: expected string… », « OTP expired », messages de `/login`, « Please fill out this field ». | PUB-112, PUB-313, PUB-320, LOC-051, COM-067, COM-097 | staging | Traduire les messages de validation et de connexion. | **Fait** le 17/11 : messages de Zod en français partout, message « requis » pour un champ vide, erreurs de connexion traduites (code expiré compris), plus de bulle anglaise sur /login |
| m16 | Récapitulatif présenté au locataire d'un bail commercial : pas de « HT », ni périodicité, ni activité, « Type de bail » vide, vocabulaire « logement ». Info-bulle « surface habitable du logement » sur un local. | COM-061, COM-091, COM-062, COM-092, COM-045 | staging | Récapitulatif propre au bail commercial ; textes « local ». | **Fait** le 17/11 : « Les caractéristiques du local », « Loyer mensuel HT », paiement, TVA, activité autorisée, type et durée du bail ; info-bulle de surface propre au local |
| m17 | Nom des fichiers téléchargés depuis la messagerie précédé d'un horodatage et d'un identifiant ; pièces libres intitulées « Autre document ». | NOT-095, NOT-119 | staging | Nom d'origine au téléchargement ; intitulé « Pièce jointe — <nom> ». | **Fait** le 17/11 : téléchargement sous le nom d'origine ; carte « Pièces » et zip du notaire : « Pièce jointe — <nom> » |

### Formulaires et espace client

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m18 | Reprise du formulaire propriétaire : l'étape « Type de contrat » est sautée, bail nu 3 ans retenu d'office. | PRO-D-039 | staging | Ne pas considérer la valeur par défaut comme une réponse. | **Fait** le 18/11 : tant que le loyer n'est pas enregistré, la reprise se fait sur « Type de contrat », le choix par défaut présélectionné |
| m19 | Formulaire locataire repris toujours à l'étape 1. | LOC-021 | staging | Reprendre à la première étape incomplète. | **Fait** le 18/11 : reprise sur la première étape incomplète ; le récapitulatif n'est montré d'office qu'à un locataire qui n'a rien saisi |
| m20 | Étape « Le loyer » : il faut parfois toucher deux fois « Continuer ». | PRO-M-119 | staging | Un seul appui valide la question en cours et avance. | **Fait** le 18/11 : dernière question du loyer, réponse acceptée : le même appui passe à « Charges & dépôt » (non rejoué à l'écran) |
| m21 | Pièce supprimée sans confirmation ; boutons de 32 px sans intitulé ; suppression d'un fichier parfois sans effet. | PRO-M-058, PRO-M-059, PRO-D-056 | staging | Confirmation avant suppression, boutons de 44 px avec intitulé ; revérifier la suppression sans effet. | **Fait** le 18/11 : confirmation « Supprimer cette pièce ? » ; boutons de 44 px au doigt avec intitulé ; suppression sans effet non reproduite |
| m22 | Erreur React n° 418 à l'ouverture de plusieurs pages (date calculée dans le fuseau du serveur, puis du navigateur). | PRO-D-079, LOC-070, LOC-085, LOC-099, PRO-M-076 | staging | Formater toutes les dates dans le fuseau Europe/Paris. | **Fait** le 18/11 : heures dans le fuseau de la personne qui regarde, fuseau indiqué à côté (« 22:50 (UTC+2) »), espace client, notaire et équipe ; plus d'erreur n° 418 (vérifié depuis Israël) |
| m23 | La bulle « Support » recouvre le bouton principal sur iPhone et petit écran (accueil, `/commencer`, menu, fenêtre « Demander »). | PUB-543, 544, 554, PRO-M-132, 168, NOT-177 | staging | La remonter au-dessus du bouton principal, ou la masquer sur les formulaires en petit écran. | **Fait** le 18/11 (votre choix) : bulle toujours réduite à l'arrivée sur le site, dépliée seulement sur demande |
| m24 | Connecté, deux liens de l'accueil renvoient encore vers la saisie de l'e-mail. | PUB-105, 125, 145 | staging | Les faire pointer vers l'espace client. | **Fait** le 18/11 : connecté, les deux cartes mènent à l'espace client |
| m25 | « Mes informations » est en lecture seule ; « Mes dossiers » sans filtre. | PRO-D-078, PRO-D-071 | staging | Fonctionnalités absentes, pas des défauts : à décider pour plus tard. | **Laissé tel quel** pour l'instant (votre choix du 18/11) |

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
| m32 | Le notaire n'est prévenu de rien quand le client répond à sa demande. | NOT-075 | staging | Notification visible dans son espace et e-mail. | **Fait** le 18/11 (votre choix) : cloche de notifications dans l'espace notaire et e-mail « Réponse reçue » au notaire |
| m33 | Recherche sensible aux accents et limitée à l'onglet affiché ; pas de tri ; lien direct invalide sans message. | NOT-029, NOT-027, NOT-032 | staging | Recherche sans accents sur tous les onglets ; tri par date ; message « dossier introuvable ». | **Fait** le 18/11 : recherche sans accents dans tous les onglets, tri récents/anciens, message « Dossier introuvable » |

### Site public et routes d'API

| # | Défaut | Constats | Origine | Solution proposée | Plan |
|---|---|---|---|---|---|
| m34 | Page de maquette `/testFiches` publique et indexable. | PUB-017, 035, 053 | staging | La supprimer ou la réserver à l'équipe. | **Fait** le 18/11 : page de maquette supprimée (404) |
| m35 | Lien « Processus » du pied de page vers une ancre inexistante (`/#process`). | PUB-110, 130, 150, 505 | staging | Pointer vers `/#processus`. | **Fait** le 18/11 : lien vers `/#processus` |
| m36 | Bouton « S'abonner » du blog sans effet. | PUB-231, 271, 281 | staging | Brancher l'inscription, ou retirer l'encart. | **Fait** le 18/11 (votre choix) : encart d'abonnement retiré |
| m37 | Image absente dans l'article « Bail notarié ou bail classique ». | PUB-252, 267, 274, 284 | staging | Remettre le fichier. | **Fait** le 18/11 : photo de l'article (balance de la justice) servie comme les autres visuels du blog |
| m38 | Simulateur : montants négatifs ou nuls donnent des résultats négatifs ; textes sans accents. | PUB-203, 209, 215, 205 | staging | Refuser ≤ 0 ; corriger les textes. | **Fait** le 18/11 : loyer ≤ 0 refusé avec message, procurations 0 à 10, personnes 1 à 20 ; textes accentués |
| m39 | Une page privée ou de tunnel reste indexable ; quelques titres trop longs. | PUB-503, PUB-502 | staging | `noindex` sur toutes les pages privées et de tunnel. | **Fait** le 18/11 : balise `noindex` sur les espaces privés et les pages de tunnel, comme l'en-tête (titres longs non traités) |
| m40 | Routes d'API : refus renvoyés en 500 au lieu de 401/403. Aucune donnée ne fuit. | PUB-401 à 405, PUB-423 | staging | Renvoyer 401/403. | **Fait** le 18/11 : refus en 401/403/404 sur les routes d'API concernées |
| m41 | `check-user` et `prepare-login` disent publiquement si une adresse est cliente ou notaire (annuaire). | PUB-425 | staging | Réponse identique quelle que soit l'adresse. | **Fait** le 18/11 : même réponse pour toute adresse ; écrans : « Si un compte existe pour cette adresse, un code vient d'y être envoyé » |
| m42 | Anciennes routes de connexion par code encore exposées (sans effet pour se connecter). | PUB-426 | staging | Les supprimer. | **Fait** le 18/11 : anciennes routes de code supprimées (client et notaire) |
| m43 | `create-payment-intent-bail` délivre un ordre de paiement à un notaire ou à l'équipe. | PUB-420 | staging | Réserver aux clients propriétaires du dossier. | **Fait** le 18/11 : ordre de paiement réservé au client propriétaire (403 sinon) |

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

## 6. Récapitulatif au 18/11

### Ce qui est fait

| Point | Où il en est |
|---|---|
| B1, B2, B3 (bloquants) | Corrigés, vérifiés, sur staging |
| M1 à M10, M12 à M15 (majeurs) | Corrigés, vérifiés, sur staging. M16 non reproduit |
| Google Analytics et bandeau de cookies | Sur staging |
| m1 à m10, m13 à m17 | Corrigés, sur staging (f8d98fa) |
| m18 à m24, m32 à m43 (lot du 18/11) | Corrigés, 157 tests serveur au vert, vérifiés à l'écran (site public, routes d'API, heure depuis Israël, espace notaire, connexion client) ; **en local seulement, pas encore sur staging** |
| Section finale de l'accueil | Rendue plus sobre (bleu nuit uni, un bouton, prix et téléphone en petit) ; **en local seulement** |
| m25 | Laissé tel quel pour l'instant |

157 tests serveur au vert. Aucune PR, aucune fusion vers main, aucune migration, rien en production.

### Ce qu'il reste à faire

**1. Défauts de notre propre branche, à corriger avant la PR (je recommande oui)**
- m11 : l'archivage d'une « autre pièce » ne doit pas proposer les fichiers de la messagerie.
- m12 : « Nouveau bail » de l'équipe : ajouter la date de prise d'effet et le jour de paiement quand un locataire est choisi.

**2. Vos décisions (choix métier)**
- M11 : identité des parties modifiable sur un dossier chez le notaire ou signé.
- m27 : deux boutons « Nouveau dossier » qui mènent à deux écrans.

**3. Défauts mineurs proposés, pas encore traités**
m26, m28 à m31 (espace de l'équipe).

**4. Plus tard, uniquement sur votre demande explicite (mise en production)**
- PR vers main, avec revue de l'impact sur les données existantes : 23 migrations, dont une qui modifie des données (`intake_form_tracking`).
- Import des barèmes de loyers en production.
- Clé OpenAI en production.
- Migration du rôle par défaut des comptes à `UTILISATEUR` (sans effet sur les comptes existants).
- De votre côté : vérifier la liste des administrateurs en production (lié à B1).

**5. Rangement en fin de recette**
- Arrêter le serveur de recette et les doublures locales ; retirer l'entrée « recette » de `.claude/launch.json`.
