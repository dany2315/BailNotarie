# Recette BailNotarie — rapport de l'agent NOT (espace notaire, ordinateur et téléphone)

Branche testée : `codex/prep-pr-main` sur le serveur local de recette. Dernière mise à jour : 17/11/2026 03:15:13.

## 1. Synthèse

- **Ce qui marche** : tout le cœur de l'espace notaire, sur ordinateur comme sur téléphone (Android et iPhone) : connexion par code et ses cas d'erreur, tableau de bord, liste (onglets, compteurs, recherche, lien direct), fiche du dossier (habitation, locataire marié, bail commercial hors taxes, locataire société, accord du locataire), copie de chaque ligne, aperçu et téléchargement des pièces, archive zip, changements de statut et leurs effets chez les clients et l'équipe.
- **Demandes du notaire** : le cycle complet fonctionne — composition (les quatre motifs, autre pièce, informations à corriger ou à confirmer), aperçu et envoi de l'e-mail, réponse du client, acceptation, conflit quand l'équipe a modifié la fiche entre-temps (un champ et plusieurs champs, sans faux conflit), « Redemander », acceptation d'une pièce en archivant l'ancienne, réouverture de la pièce archivée, « Tout accepter », demande « Terminée », « Relancer », « Annuler ». Les corrections récentes de la branche sont vérifiées.
- **Cloisonnement entre notaires** : étanche partout où il a été sollicité (liste, lien direct, zip, pièces, pièce archivée, messagerie en lecture et en écriture, accès sans session).
- **Ce qui ne va pas** : la messagerie « Discuter » n'est pas étanche **entre les deux parties d'un même bail** — les fichiers échangés en privé entre le notaire et le propriétaire apparaissent dans les documents du locataire (et inversement), et une adresse technique rend tous les messages du bail à n'importe laquelle des parties. Ces deux défauts majeurs existent déjà sur staging. Les autres défauts sont mineurs ou cosmétiques (un seul vient de la branche : la liste d'archivage proposée pour une « autre pièce »).
- **Verdict** : l'espace notaire est bon pour la mise en production du point de vue du notaire ; la fuite de fichiers et de messages entre propriétaire et locataire mérite une correction avant ou juste après, car elle touche à la confidentialité.

**Totaux : 178 cas — 162 OK, 3 KO, 9 partiels, 4 non testés.**

| Rôle | Appareil | Cas | OK | KO | Partiels | Non testés |
|---|---|---:|---:|---:|---:|---:|
| Visiteur | ordinateur | 5 | 5 | 0 | 0 | 0 |
| Notaire | ordinateur | 108 | 98 | 0 | 7 | 3 |
| Notaire | telephone | 18 | 17 | 0 | 1 | 0 |
| Notaire | iphone | 17 | 17 | 0 | 0 | 0 |
| Propriétaire | ordinateur | 15 | 13 | 1 | 1 | 0 |
| Locataire | ordinateur | 8 | 6 | 2 | 0 | 0 |
| Équipe | ordinateur | 7 | 6 | 0 | 0 | 1 |

## 2. Défauts, du plus grave au plus bénin

### D1. Les fichiers échangés en privé dans « Discuter » sont visibles par l'autre partie du bail (NOT-093, NOT-094)

- **Gravité** : Majeur — **statut du cas** : KO
- **Origine** : staging (déjà présent sur staging) — code soupçonné : `lib/actions/bail-messages.ts (les fichiers de la messagerie sont enregistrés comme documents du bail, sans destinataire) ; app/client/(protected)/locataire/baux/[id]/page.tsx et proprietaire/baux/[id]/page.tsx (affichent tous les documents du bail sans client) ; lib/document-access.ts (toute partie du bail peut lire un document du bail)`
- **Appareil(s)** : tous (défaut côté serveur)
- **Pour le reproduire** : Dossier n° 1. Le notaire ouvre « Discuter » avec le propriétaire et lui envoie un fichier ; le propriétaire répond avec un fichier. Le locataire du même bail ouvre ensuite la fiche de son bail (/client/locataire/baux/<id>), bloc « Documents ». Réciproquement, le notaire envoie un fichier au locataire et le propriétaire ouvre la fiche de son bail.
- **Attendu** : Aucun fichier du fil privé du propriétaire dans les documents du locataire ; accès refusé (403)
- **Constaté** : Le bloc « Documents » du locataire liste les deux fichiers du fil privé notaire ↔ propriétaire, et il peut les ouvrir (adresse de téléchargement accordée, fichier servi). Dans l'autre sens, la fiche du bail du propriétaire affiche le fichier que le notaire a envoyé au seul locataire. Les fils de discussion eux-mêmes, à l'écran, sont bien séparés (NOT-088, NOT-089) : la fuite passe par les documents du bail. Un notaire qui envoie une pièce d'identité, un avis d'imposition ou un projet d'acte à une partie l'expose donc à l'autre.
- **Confirmation** : Constaté trois fois : reconnaissance, script 05b, puis script 07 (captures `not-093-documents-locataire.png` et `not-094-documents-proprietaire.png`). Les fichiers concernés ne diffèrent pas entre la branche et staging.
- **Capture** : `captures/not-093-documents-locataire.png`

### D2. Une adresse technique rend à une partie tous les messages du bail, y compris ceux de l'autre partie (NOT-097)

- **Gravité** : Majeur — **statut du cas** : KO
- **Origine** : staging (déjà présent sur staging) — code soupçonné : `app/api/bail/[bailId]/messages/route.ts ; lib/actions/bail-messages.ts (getBailMessages : aucun filtre par destinataire pour un client)`
- **Appareil(s)** : tous (défaut côté serveur)
- **Pour le reproduire** : Connecté comme locataire du dossier n° 1, appeler GET /api/bail/<identifiant de son bail>/messages (même chose avec le propriétaire).
- **Attendu** : Seuls ses propres échanges avec le notaire
- **Constaté** : La réponse contient les messages échangés entre le notaire et le propriétaire ; avec la session du propriétaire, elle contient ceux du fil du locataire. L'écran « Discuter », lui, filtre correctement : il faut appeler l'adresse à la main, ce qui reste à la portée d'un client curieux connecté à son espace.
- **Confirmation** : Vérifié avec les deux comptes clients (NOT-097 et NOT-094) et à la lecture du code ; identique sur staging. Un notaire, en revanche, n'obtient rien sur le bail d'un autre notaire (NOT-054, NOT-058).

### D3. Recherche de la liste : sensible aux accents et limitée à l'onglet affiché (NOT-029)

- **Gravité** : Mineur — **statut du cas** : partiel
- **Origine** : staging (déjà présent sur staging) — code soupçonné : `components/notaire/notaire-sidebar.tsx (filtre `shown`)`
- **Appareil(s)** : ordinateur
- **Pour le reproduire** : Dans le menu, saisir « ines » (le propriétaire s'appelle « Inès ») ; puis, sur l'onglet « En cours », saisir le nom d'un propriétaire dont le dossier est signé.
- **Attendu** : Idéalement : « ines » trouve « Inès » ; un dossier d'un autre onglet est signalé
- **Constaté** : « ines » ne trouve pas « Inès » ; un dossier rangé dans un autre onglet n'est pas trouvé et rien n'indique qu'il existe ailleurs (« Aucun dossier »).
- **Confirmation** : Comportement confirmé par la lecture du filtre (comparaison en minuscules, sans retrait des accents, restreinte à l'onglet courant).

### D4. Le notaire n'est prévenu de rien quand le client répond à sa demande (NOT-075)

- **Gravité** : Mineur — **statut du cas** : partiel
- **Origine** : staging (déjà présent sur staging) — code soupçonné : `lib/actions/complement-requests.ts (submitComplementRequest crée une notification interne) ; components/notaire/notaire-sidebar.tsx et app/notaire/(protected)/page.tsx (aucun affichage de cette notification)`
- **Appareil(s)** : ordinateur
- **Pour le reproduire** : Le notaire envoie une demande ; le client y répond et clique « Envoyer au notaire » ; regarder les e-mails et tâches de fond capturés, puis le tableau de bord et la liste du notaire.
- **Attendu** : Le notaire reçoit un e-mail (ou une notification) l'informant de la réponse
- **Constaté** : Aucun e-mail ni tâche de fond pour le notaire. Une notification interne « réponse reçue » est bien créée en base pour lui, mais l'espace notaire n'a aucun écran ni pastille pour l'afficher : ni le tableau de bord ni la liste ne signalent qu'une réponse attend. Le notaire ne le découvre qu'en ouvrant le dossier (« Mes demandes · 1 à vérifier »).
- **Confirmation** : Vérifié sur la demande au propriétaire puis sur celle au locataire ; code identique sur staging.

### D5. En acceptant une « autre pièce », le notaire se voit proposer d'archiver des fichiers sans rapport (ceux de la messagerie) (NOT-117)

- **Gravité** : Mineur — **statut du cas** : partiel
- **Origine** : branche (code propre à codex/prep-pr-main) — code soupçonné : `lib/actions/complement-requests.ts (replaceableDocuments : « même type au même endroit du dossier » ; pour le type « Autre » rattaché au bail, cela ramène tous les fichiers de la messagerie)`
- **Appareil(s)** : ordinateur
- **Pour le reproduire** : Le notaire demande une « Autre pièce » (ex. attestation d'assurance) ; des fichiers ont par ailleurs été échangés dans « Discuter ». Le client dépose la pièce. Le notaire clique « Accepter » sur cette ligne.
- **Attendu** : Acceptée directement : il n’existe aucune ancienne version à retirer
- **Constaté** : Au lieu d'une acceptation directe, le panneau « Anciennes pièces à retirer des pièces actives » s'ouvre et liste trois fichiers de la messagerie (aucun n'est coché d'avance). « Accepter sans rien retirer » fonctionne ; mais un notaire qui coche par réflexe archiverait un fichier de discussion qui n'a rien à voir, et la ligne annonce à tort « vous choisirez en l'acceptant les anciennes pièces à retirer ».
- **Confirmation** : Constaté deux fois (script 04c puis 04d, capture `not-117-autre-piece-archivage.png`) et expliqué par le code ; la fonction n'existe pas sur staging.
- **Capture** : `captures/not-117-autre-piece-archivage.png`

### D6. Sur téléphone, la bulle « Support » recouvre le bouton principal de la fenêtre « Demander » (NOT-177)

- **Gravité** : Mineur — **statut du cas** : partiel
- **Origine** : staging (déjà présent sur staging) — code soupçonné : `components/contact-bubble.tsx (bulle flottante au-dessus des fenêtres)`
- **Appareil(s)** : telephone, iphone
- **Pour le reproduire** : Sur téléphone, fiche d'un dossier → « Demander » → « Au propriétaire », cocher une pièce.
- **Attendu** : Le bouton « Voir l’e-mail » est entièrement visible et touchable
- **Constaté** : La bulle flottante « Support » et sa croix se posent sur la moitié droite du bouton « Voir l'e-mail · 2 pièces » : le libellé est en partie masqué et un toucher à droite du bouton ouvre le support au lieu de l'aperçu. Le bouton reste utilisable par sa moitié gauche.
- **Confirmation** : Visible sur les captures `not-telephone-demander.png` et `not-iphone-demander.png`.
- **Capture** : `captures/not-telephone-demander.png`

### D7. Pas de tri dans la liste des dossiers (NOT-027)

- **Gravité** : Cosmétique — **statut du cas** : partiel
- **Origine** : staging (déjà présent sur staging) — code soupçonné : `components/notaire/notaire-sidebar.tsx`
- **Appareil(s)** : ordinateur
- **Pour le reproduire** : Ouvrir /notaire/dossiers et chercher une commande de tri.
- **Attendu** : Une commande de tri (demandée par la feuille de mission) ou, à défaut, un ordre stable
- **Constaté** : La feuille de mission mentionne un tri ; la liste n'en propose pas. L'ordre est fixe : du dossier confié le plus récemment au plus ancien.
- **Confirmation** : Vérifié à l'écran (ordinateur et téléphone) et dans le code.

### D8. Lien direct vers un dossier inexistant ou non autorisé : le dossier par défaut s'affiche sans message (NOT-032)

- **Gravité** : Cosmétique — **statut du cas** : partiel
- **Origine** : staging (déjà présent sur staging) — code soupçonné : `app/notaire/(protected)/dossiers/page.tsx (repli sur le dossier par défaut)`
- **Appareil(s)** : ordinateur
- **Pour le reproduire** : Ouvrir /notaire/dossiers?dossierId=<identifiant inventé ou dossier d'un autre notaire>.
- **Attendu** : Pas d'erreur ; idéalement un message « dossier introuvable »
- **Constaté** : La page affiche silencieusement le premier dossier en cours du notaire, alors que l'adresse garde l'identifiant demandé : un notaire qui suit un lien périmé peut croire qu'il regarde le dossier du lien. Le message « Ce dossier n'est pas accessible », prévu dans le code, n'apparaît que si le notaire n'a aucun dossier.
- **Confirmation** : Reproduit avec un identifiant inventé (NOT-032) et avec le dossier du second notaire (NOT-051) : aucune fuite, seulement l'absence de message.

### D9. Le message personnalisé du notaire est présenté au client comme « Message de l'équipe BailNotarie » (NOT-071)

- **Gravité** : Cosmétique — **statut du cas** : partiel
- **Origine** : staging (déjà présent sur staging) — code soupçonné : `components/client-v2/complement-request-view.tsx`
- **Appareil(s)** : ordinateur
- **Pour le reproduire** : Le notaire envoie une demande avec un message personnalisé ; le client ouvre la page de la demande.
- **Attendu** : Titre « Demande du notaire », 4 informations puis 4 pièces avec motif et précision, message du notaire attribué au notaire, envoi bloqué tant que tout n'est pas prêt
- **Constaté** : La page s'intitule bien « Demande du notaire » et le bouton « Envoyer au notaire », mais la bulle du message porte le titre fixe « Message de l'équipe BailNotarie » (pastille « BN »), alors que le texte a été écrit par le notaire. L'e-mail, lui, ne nomme pas le notaire non plus.
- **Confirmation** : Constaté sur la demande au propriétaire et sur la demande au locataire ; libellé identique sur staging.

### D10. Un fichier téléchargé depuis la messagerie porte un nom technique (NOT-095)

- **Gravité** : Cosmétique — **statut du cas** : partiel
- **Origine** : staging (déjà présent sur staging) — code soupçonné : `components/notaire/notaire-bail-chat-sheet.tsx (téléchargement à partir de la clé de stockage)`
- **Appareil(s)** : ordinateur
- **Pour le reproduire** : Fil « Discuter » du propriétaire : cliquer un fichier reçu.
- **Attendu** : Le fichier se télécharge sous son nom d'origine
- **Constaté** : Le fichier est enregistré sous « <horodatage>-<identifiant technique>-recette-reponse-proprio-….pdf » au lieu du nom d'origine, alors que les pièces du dossier, elles, se téléchargent avec un nom lisible.
- **Confirmation** : Constaté deux fois (scripts 05 et 05b).

### D11. Les pièces libres et les fichiers de la messagerie apparaissent tous sous le nom « Autre document » (NOT-119)

- **Gravité** : Cosmétique — **statut du cas** : partiel
- **Origine** : staging (déjà présent sur staging) — code soupçonné : `lib/notaire/dossier-view.ts (libellé du type « Autre ») ; lib/actions/bail-messages.ts (fichiers de discussion rattachés au bail)`
- **Appareil(s)** : ordinateur
- **Pour le reproduire** : Dossier n° 1 après une « autre pièce » acceptée et des fichiers échangés dans « Discuter » : lire la carte « Pièces », groupe « Le bail », puis ouvrir le zip.
- **Attendu** : La pièce libre porte le libellé donné par le notaire ; les fichiers de discussion ne sont pas mêlés aux pièces du dossier
- **Constaté** : L'attestation d'assurance demandée par le notaire et les fichiers de la messagerie sont tous intitulés « Autre document » ; dans le zip : « 4 - Le bail/Autre document.pdf », « Autre document (2).pdf », « Autre document (3).pdf ». Le libellé donné par le notaire dans sa demande n'est pas repris, et les fichiers de discussion gonflent le compteur « Pièces ».
- **Confirmation** : Constaté sur la carte et dans le zip (NOT-114).
- **Capture** : `captures/not-112-apres-archivage.png`

## 3. Parcours vérifiés, par domaine

### Connexion

| Cas | Rôle | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|---|
| NOT-001 | Visiteur | ordinateur | Accès à /notaire sans session | Redirigé vers /notaire/login, formulaire « Connexion à votre Espace Notaire » affiché | OK |
| NOT-002 | Visiteur | ordinateur | Adresse mal formée refusée | Blocage par le navigateur : « Please include an '@' in the email address. 'pas-une-adresse' is missing an '@'. » | OK |
| NOT-003 | Visiteur | ordinateur | Adresse inconnue | Message « Aucun compte trouvé pour cet email », 0 e-mail capturé | OK |
| NOT-004 | Visiteur | ordinateur | Adresse d'un client refusée sur la connexion notaire | Message « Cet email n'est pas associé à un compte notaire », 0 e-mail capturé | OK |
| NOT-005 | Notaire | ordinateur | Envoi du code au notaire (adresse saisie avec des majuscules) | Étape code affichée ; e-mail capturé « [TEST] ###### – votre code de connexion BailNotarie », code à 6 chiffres reçu | OK |
| NOT-006 | Notaire | ordinateur | Code incomplet | Message « Le code doit contenir 6 chiffres » | OK |
| NOT-007 | Notaire | ordinateur | Code faux refusé | Message affiché : « Erreur de connexion Le code OTP est incorrect » ; on reste sur la page de connexion | OK |
| NOT-008 | Notaire | ordinateur | Renvoi du code | Message « Code renvoyé » ; nouveau code reçu (différent du premier) | OK |
| NOT-009 | Notaire | ordinateur | L'ancien code ne fonctionne plus après un renvoi | Refusé, toujours sur la page de connexion | OK |
| NOT-010 | Notaire | ordinateur | Connexion avec le bon code | Tableau de bord « Bienvenue, Maître Recette NOT 1 » ; 1 session créée en base | OK |
| NOT-011 | Notaire | ordinateur | Page de connexion quand on est déjà connecté | Redirigé vers /notaire | OK |
| NOT-012 | Notaire | ordinateur | Notaire sur /interface | Adresse finale : /notaire — aucun contenu de l'autre espace | OK |
| NOT-013 | Notaire | ordinateur | Notaire sur /client | Adresse finale : /notaire — aucun contenu de l'autre espace | OK |
| NOT-014 | Notaire | ordinateur | Notaire sur /interface/baux/<id> | Adresse finale : /notaire — aucun contenu de l'autre espace | OK |
| NOT-015 | Notaire | ordinateur | Déconnexion | Renvoyé sur /notaire/login ; /notaire/dossiers mène ensuite à /notaire/login | OK |

### Tableau de bord

| Cas | Rôle | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|---|
| NOT-020 | Notaire | ordinateur | Compteurs du tableau de bord | Affiché : {"enCours":5,"aContacter":4,"enTraitement":1,"signes":1} | OK |
| NOT-021 | Notaire | ordinateur | « Dossiers en cours » du tableau de bord | Les 5 dossiers en cours sont listés ; le dossier signé n'y figure pas ; le dossier du notaire n° 2 est absent | OK |
| NOT-022 | Notaire | ordinateur | Ouvrir un dossier depuis le tableau de bord | Fiche « 3 Place Bonnyaud » ouverte (?dossierId=<id>) | OK |
| NOT-023 | Notaire | ordinateur | Lien « Voir tous » | Adresse : /notaire/dossiers | OK |

### Liste

| Cas | Rôle | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|---|
| NOT-024 | Notaire | ordinateur | Menu latéral unique | 1 menu ; entrées : Tableau de bord / Dossiers 5 ; dossier ouvert par défaut : « 5 Place Bonnyaud 23000 Guéret » | OK |
| NOT-025 | Notaire | ordinateur | Onglets « En cours / Signés / Classés » et compteurs | En cours 5 / Signés 1 / Classés 0 | OK |
| NOT-026 | Notaire | ordinateur | Contenu de chaque onglet | Signés : 1 (Théo ProprioNOT6 → Sarah LocataireNOT6 6 Plac) ; Classés : 0 (« Aucun dossier ») ; En cours : 5 | OK |
| NOT-027 | Notaire | ordinateur | Tri de la liste | Aucune commande de tri dans le menu ; ordre affiché des dossiers en cours : n° 5,4,3,2,1 (du plus récemment confié au plus ancien) | partiel |
| NOT-028 | Notaire | ordinateur | Recherche par nom ou adresse | 1, 1, 1, 1, 0, 0, 1 résultat(s) dans cet ordre | OK |
| NOT-029 | Notaire | ordinateur | Recherche : accents et onglet courant | « ines » : 0 résultat ; « ProprioNOT6 » depuis « En cours » : 0 résultat (la recherche ne porte que sur l'onglet affiché et tient compte des accents) | partiel |
| NOT-030 | Notaire | ordinateur | Sélection d'un dossier dans la liste | Fiche affichée ; ligne active : « Inès ProprioNOT2 → Hugo LocataireNOT2 2 Place Bonn » ; adresse : ?dossierId=<id> | OK |
| NOT-031 | Notaire | ordinateur | Lien direct ?dossierId= vers un dossier signé | Onglet actif : « Signés 1 » ; statut affiché : « Signé » | OK |
| NOT-032 | Notaire | ordinateur | Lien direct avec un identifiant inexistant | La page affiche sans avertissement le dossier par défaut : « Location vide, 3 ans · Habitation 5 Place Bonnyaud 23000 Guéret Propriétaire : Nathan ProprioNOT5 · Locataire … » | partiel |

### Fiche

| Cas | Rôle | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|---|
| NOT-033 | Notaire | ordinateur | Conditions du bail d'habitation conformes à la base | Toutes les lignes correspondent (type « Location vide, 3 ans », usage « Habitation », dates, loyer, charges, dépôt, jour de paiement) | OK |
| NOT-034 | Notaire | ordinateur | Mention de l'accord du locataire | « Confirmé par le locataire : Loyer, charges et date d'entrée confirmés le 16/11/2026 » | OK |
| NOT-035 | Notaire | ordinateur | Bien, propriétaire et locataire (personnes physiques) | Blocs : LE BAIL, LE BIEN, LE PROPRIÉTAIRE, LE LOCATAIRE ; 36 lignes copiables ; état civil du propriétaire complet ; bien : Type de bail : Location vide, 3 ans, Type : Appartement, Surface : 42 m², Pièces principales : 2 pièces, Classe énergétique (DPE) : Cla… | OK |
| NOT-036 | Notaire | ordinateur | Icône de copie sur chaque ligne (presse-papiers) | 36 lignes copiées, presse-papiers identique à la valeur affichée à chaque fois ; coche verte visible sur la dernière ligne | OK |
| NOT-037 | Notaire | ordinateur | Copie au clavier | Presse-papiers : « ProprioNOT1 » | OK |
| NOT-038 | Notaire | ordinateur | Locataire marié : situation et régime matrimonial | Lignes : Régime juridique : Monopropriété ; Situation familiale : Célibataire ; Situation familiale : Marié(e) ; Régime matrimonial : Séparation de biens | OK |
| NOT-039 | Notaire | ordinateur | Bail commercial : conditions commerciales et loyer hors taxes | Blocs : Conditions du bail / Conditions commerciales / Le bien / Manon ProprioNOT4 / SAS Recette NOT 4 ; lignes de loyer : Loyer mensuel hors taxes et hors charges : 1 500 € ; Loyer annuel hors taxes : 18 000 € ; mentions hors taxes : Loyer mensuel hors taxes… | OK |
| NOT-040 | Notaire | ordinateur | Locataire société | Sous-titre société présent ; lignes : Raison sociale : SAS Recette NOT 4 ; Siège social : 3 rue de l’Essai 23000 Guéret ; Représentant légal : Louis Recette, Président | OK |

### Pièces

| Cas | Rôle | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|---|
| NOT-041 | Notaire | ordinateur | Pièces groupées par partie | Pièces · 4 ; groupes : PROPRIÉTAIRE - CAMILLE PROPRIONOT1 / LOCATAIRE - LOUIS LOCATAIRENOT1 / LE BIEN ; 4 lignes | OK |
| NOT-042 | Notaire | ordinateur | Aperçu d'une pièce | Fenêtre « Pièce d'identité » ; document chargé dans un cadre (réponse 200 du stockage) | OK |
| NOT-043 | Notaire | ordinateur | Téléchargement d'une pièce avec un nom lisible | Fichiers reçus : Pièce d'identité - Camille ProprioNOT1 - ms2xij.pdf (58 octets, PDF valide) ; Diagnostics - Camille ProprioNOT1 - 1 Place Bonnyaud 23000 Guéret - idfkh3.pdf (53 octets, PDF valide) ; message « Téléchargement réussi » | OK |
| NOT-044 | Notaire | ordinateur | « Tout télécharger » / « Zip » : archive valide | Réponse 200, signature PK, 2467 octets, 5 entrées (5 déclarées) : Fiche du dossier.txt / 1 - Propriétaire - Camille ProprioNOT1/Pièce d'identité.pdf / 2 - Locataire - Louis LocataireNOT1/Pièce d'identité.pdf / 3 - Le bien/Diagnostics.pdf / 3 - Le bien/Titre d… | OK |
| NOT-045 | Notaire | ordinateur | Bouton « Tout télécharger » (téléchargement réel) | Fichier proposé : « Dossier - 1 Place Bonnyaud 23000 Guéret.zip », 2467 octets, 5 entrées | OK |
| NOT-046 | Notaire | ordinateur | Lien « Zip » de la carte Pièces | Fichier proposé : « Dossier - 1 Place Bonnyaud 23000 Guéret.zip » | OK |
| NOT-047 | Notaire | ordinateur | Fiche du dossier en texte dans le zip | Le texte contient l'adresse, le propriétaire, le locataire et le loyer | OK |
| NOT-119 | Notaire | ordinateur | Intitulé des pièces libres et des fichiers de messagerie dans la carte « Pièces » et dans le zip | Carte « Pièces », groupe « Le bail » : « Autre document — recette-assurance-not-1.pdf », « Autre document — recette-message-notaire-….pdf », « Autre document — recette-reponse-proprio-….pdf » ; zip : « 4 - Le bail/Autre document.pdf », « Autre document (2).pd… | partiel |

### Cloisonnement

| Cas | Rôle | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|---|
| NOT-050 | Notaire | ordinateur | Le dossier du notaire n° 2 est absent de la liste du notaire n° 1 | Absent des trois onglets | OK |
| NOT-051 | Notaire | ordinateur | Lien direct ?dossierId= vers le dossier d'un autre notaire | Dossier n° 7 non affiché ; la page montre le dossier par défaut « 5 Place Bonnyaud 23000 Guéret », sans message | OK |
| NOT-052 | Notaire | ordinateur | Zip du dossier d'un autre notaire | Réponse 403 : {"error":"Accès refusé"} | OK |
| NOT-053 | Notaire | ordinateur | Pièce du dossier d'un autre notaire | Dossier n° 7 : 403, 403, 403, 403 ; témoin : 200 | OK |
| NOT-054 | Notaire | ordinateur | Messagerie du dossier d'un autre notaire (lecture) | Bail n° 7 : réponse 500 « {"error":"Non autorisé"} » ; témoin : 200 | OK |
| NOT-055 | Notaire | ordinateur | Interlocuteurs de la messagerie d'un autre dossier | Bail n° 7 : 403 « {"error":"Non autorisé"} » ; témoin : 200 | OK |
| NOT-056 | Visiteur | ordinateur | Zip, pièce et messages sans être connecté | Zip : 403 ; pièce : 403 ; messages : 401 | OK |
| NOT-057 | Notaire | ordinateur | Réciproque : le notaire n° 2 ne voit que son dossier | 1 dossier listé (Adam ProprioNOT7 → Camille LocataireNOT7) ; lien direct → fiche « 7 Place Bonnyaud 23000 Guéret » ; zip : 403 | OK |
| NOT-058 | Notaire | ordinateur | Messagerie du dossier d'un autre notaire (écriture) | Réponse 500 « {"error":"Non autorisé"} » ; messages du bail n° 7 en base : 0 → 0 | OK |
| NOT-059 | Notaire | ordinateur | Le notaire n° 2 n'accède ni à la pièce archivée ni aux fichiers de messagerie du dossier n° 1 | Pièce archivée : 403 ; fichier de messagerie : 403 | OK |
| NOT-093 | Locataire | ordinateur | Les fichiers échangés dans la messagerie entre le notaire et le propriétaire restent invisibles pour le locat… | Le bloc « Documents » du locataire contient 2 fichier(s) du fil privé notaire ↔ propriétaire (recette-reponse-proprio-….pdf, recette-message-notaire-….pdf) ; accès direct avec la session du locataire : recette-message-notaire-….pdf : adresse 200, fichier 200 … | KO |
| NOT-094 | Propriétaire | ordinateur | Réciproque : le fichier envoyé par le notaire au locataire reste invisible pour le propriétaire | La fiche du bail du propriétaire affiche le fichier envoyé par le notaire au locataire (1 fichier) ; accès direct : 200 ; messages du fil locataire par l'API : PRÉSENTS | KO |
| NOT-097 | Locataire | ordinateur | Le locataire ne peut pas lire par l'API les messages échangés entre le notaire et le propriétaire | Réponse 200 ; messages du fil propriétaire PRÉSENTS dans la réponse | KO |
| NOT-143 | Notaire | ordinateur | Le notaire ne voit pas les pièces archivées par l’équipe | Une fois le dossier transmis au notaire, la fiche de l’équipe ne propose plus de bouton « Demander », et la demande du notaire y est en lecture seule (aucun bouton « Accepter », cas NOT-141) : il n’a pas été possible de créer à l’écran une demande de l’équipe… | non testé |
| NOT-155 | Notaire | ordinateur | Le notaire ne voit pas les demandes de l’équipe | Une fois le dossier transmis au notaire, la fiche de l’équipe ne propose plus de bouton « Demander », et la demande du notaire y est en lecture seule (aucun bouton « Accepter », cas NOT-141) : il n’a pas été possible de créer à l’écran une demande de l’équipe… | non testé |
| NOT-176 | Notaire | telephone | Cloisonnement vu du téléphone (notaire n° 2) | 1 dossier : Adam ProprioNOT7 → Camille LocataireNOT7 7 Pl | OK |
| NOT-196 | Notaire | iphone | Cloisonnement vu du téléphone (notaire n° 2) | 1 dossier : Adam ProprioNOT7 → Camille LocataireNOT7 7 Pl | OK |

### Demandes

| Cas | Rôle | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|---|
| NOT-060 | Notaire | ordinateur | Fenêtre « Demander au propriétaire » | Demander au propriétaire — Camille ProprioNOT1 · recette-not-proprio1@example.invalid ; bouton « Choisissez quoi demander » inactif | OK |
| NOT-061 | Notaire | ordinateur | Motifs proposés pour une pièce déjà reçue | Motifs proposés : Illisible/Expirée/Mauvais document/Incomplète ; motif par défaut : « Illisible » ; mention « Le fichier actuel restera dans le dossier… » présente | OK |
| NOT-062 | Notaire | ordinateur | « Autre pièce » (pièce libre) | Avec « A » : « Voir l'e-mail · 3 pièces » ; avec le libellé complet : « Voir l'e-mail · 4 pièces » | OK |
| NOT-063 | Notaire | ordinateur | Informations à corriger / à confirmer | Motifs : À corriger/À confirmer ; bouton : « Voir l'e-mail · 4 pièces et 4 informations » ; mention « Le client verra la valeur actuelle… » présente | OK |
| NOT-064 | Notaire | ordinateur | Aperçu de l'e-mail avant envoi | Les 8 éléments figurent dans l'aperçu ; destinataire affiché ; message vide → bouton « Envoyer la demande » inactif | OK |
| NOT-065 | Notaire | ordinateur | Aller-retour aperçu ↔ sélection | 7 cases cochées au retour ; message personnalisé conservé | OK |
| NOT-066 | Notaire | ordinateur | Envoi de la demande au propriétaire | Message « Demande envoyée — E-mail envoyé à recette-not-proprio1@example.invalid » ; en base : 1 demande d'origine notaire, ouverte, créée par « Maître Recette NOT 1 », 8 éléments (pièces : illisible, expirée, mauvais document, manquante ; informations : 2 à … | OK |
| NOT-067 | Propriétaire | ordinateur | E-mail reçu par le propriétaire | Les 8 éléments y figurent ; message personnalisé présent ; précision « Recto et verso » présente ; lien /client/demande présent ; mot « notaire » présent | OK |
| NOT-068 | Notaire | ordinateur | Bloc « Mes demandes » après envoi | MES DEMANDES Pièces et informations demandées par le notaire au propriétaire Camille ProprioNOT1 · Envoyée le 16/11 En attente du client Pièce d'identité de Camille ProprioNOT1 Illisible « Recto et verso sur la même page (recette)… | OK |
| NOT-069 | Notaire | ordinateur | Fenêtre rouverte pendant une demande en cours | Bandeau présent ; 3 ligne(s) « Déjà demandée » ; case de la pièce d'identité désactivée | OK |
| NOT-070 | Propriétaire | ordinateur | La demande du notaire est annoncée sur l'accueil du propriétaire | Encart présent : « … vous attend Nouveau dossier 1 En cours 1 À faire 0 Signés À faire maintenant 1 À FAIRE · DEMANDE DU NOTAIRE Logement recette NOT 1 4 pièces et 4 informations à compléter : Pièce d'identité de Camille ProprioNOT1 · Diagnostics du bien · Ti… | OK |
| NOT-071 | Propriétaire | ordinateur | Page « Demande du notaire » du propriétaire | Page « Demande du notaire », compteur « 0 / 8 prêt », bouton « Envoyer au notaire » inactif tant que tout n'est pas prêt (« Encore 8 éléments avant l'envoi. ») ; mais le message personnalisé écrit par le notaire est présenté sous le titre fixe « Message de l'… | partiel |
| NOT-072 | Propriétaire | ordinateur | Le propriétaire répond aux informations (corriger et confirmer) | Profession vide : refusée (« La profession est requise », constaté au premier passage) ; 4 informations sur 4 marquées renseignées en base ; fiche en base inchangée pour l'instant : prénom « Camille », profession « Testeuse », nationalité « Française » | OK |
| NOT-073 | Propriétaire | ordinateur | Le propriétaire dépose les pièces demandées | 4 pièces sur 4 reçues en base ; compteur « 8 / 8 prêts » ; après retrait (0 fichier restant en base pour cette pièce) : « 7 / 8 prêts », envoi bloqué | OK |
| NOT-074 | Propriétaire | ordinateur | Envoi de la réponse au notaire | « Retour Accueil Demande du notaire DEMANDE DU NOTAIRE Merci, c'est bien reçu Logement recette NOT 1 · 1 Place Bonnyaud 23000 Guéret Votre réponse est envoyée. Le notaire vérifie votre réponse (envoi du » ; statut en base : SUBMITTED | OK |
| NOT-075 | Notaire | ordinateur | Le notaire est prévenu de la réponse du client | Aucun e-mail ni tâche de fond pour le notaire : il ne découvre la réponse qu'en rouvrant le dossier | partiel |
| NOT-076 | Propriétaire | ordinateur | Demande rouverte par le client après envoi | Écran « Merci, c'est bien reçu » ; 0 champ de dépôt, 0 bouton « Enregistrer » | OK |
| NOT-077 | Locataire | ordinateur | La demande adressée au propriétaire est invisible pour le locataire | Adresse finale : /client/locataire ; aucun contenu de la demande | OK |
| NOT-100 | Équipe | ordinateur | L'équipe modifie la fiche du propriétaire après la réponse du client | En base : prénom « Camille-Marie », profession « Ingénieure (modifiée par l'équipe) » ; message « Client modifié avec succès » | OK |
| NOT-101 | Notaire | ordinateur | Réponse du client à vérifier | Bloc « Mes demandes · 1 à vérifier » ; carte « réponse reçue le 16/11 », pastille « À vérifier · 8 » ; 8 boutons « Accepter » et 8 « Redemander », « Tout accepter » présent ; pour chaque information, valeur avant → après (Prénom : Camille → Camille Rose ; Pro… | OK |
| NOT-102 | Notaire | ordinateur | Accepter une information (sans conflit) | Acceptée ; message « Information acceptée et enregistrée dans le dossier » ; en base : nationalité « Belge », appliquée par « Maître Recette NOT 1 » ; fiche du notaire : « Copier Nationalité : Belge » | OK |
| NOT-103 | Notaire | ordinateur | Information à plusieurs champs non modifiée par l'équipe : pas de faux conflit | Acceptée directement ; aucun avertissement ; message « Information acceptée et enregistrée dans le dossier » | OK |
| NOT-104 | Notaire | ordinateur | Conflit : l'équipe a modifié une information à un champ | Avertissement affiché : « Le dossier a été modifié depuis la réponse du client. Profession lors de la réponse : Testeuse aujourd'hui : Ingénieure (modifiée par l'équipe) Accepter remplacera la valeur actuelle par la réponse du client. Sinon, laissez la ligne … | OK |
| NOT-105 | Notaire | ordinateur | Conflit : « Ne rien changer » | Avertissement fermé ; ligne : PROVIDED ; profession en base : « Ingénieure (modifiée par l'équipe) » | OK |
| NOT-106 | Notaire | ordinateur | Conflit : « Appliquer la réponse du client » | Ligne acceptée ; profession en base : « Architecte (réponse de recette) » | OK |
| NOT-107 | Notaire | ordinateur | Conflit : l'équipe a modifié une information à plusieurs champs | « Le dossier a été modifié depuis la réponse du client. Prénom lors de la réponse : Camille aujourd'hui : Camille-Marie Accepter remplacera la valeur actuelle par la réponse du client. Sinon, laissez la ligne telle quelle ou redemandez-la. Ne rien changer App… | OK |
| NOT-108 | Notaire | ordinateur | Redemander une information | Motifs proposés : À corriger/À confirmer ; ligne : PENDING ; demande : OPEN ; message « Information redemandée : le client a reçu un e-mail » ; e-mail : « [TEST] Rappel : 1 information à compléter pour votre bail notarié » avec la précision | OK |
| NOT-109 | Notaire | ordinateur | Voir le fichier reçu avant de l'accepter | Ligne : « Pièce d'identité de Camille ProprioNOT1 Illisible « Recto et verso sur la même page (recette) » Reçue · à vérifier · vous choisirez en l'acceptant les anciennes pièces à retirer recette-identite-proprio-not-1-v2.pdf Accepter Redemander » ; aperçu af… | OK |
| NOT-110 | Notaire | ordinateur | Accepter une pièce : choix des anciennes pièces à retirer | Panneau affiché : ancienne pièce listée, « visée par la demande » ; 0 case cochée d'avance ; bouton « Accepter sans rien retirer » | OK |
| NOT-111 | Notaire | ordinateur | Accepter une pièce en archivant l'ancienne (droit du notaire sur ses demandes) | Pièce acceptée ; ancienne pièce « recette-identite-proprio-not-1.pdf » : archivée par « Maître Recette NOT 1 », fichier conservé ; nouvelle pièce « …-v2.pdf » : active (relu en base après coup : la vérification automatique du premier passage avait été coupée … | OK |
| NOT-112 | Notaire | ordinateur | Carte « Pièces » après archivage | Pièces actives : nouvelle pièce présente, ancienne absente ; bloc des pièces archivées : « Pièces archivées Remplacées par une nouvelle pièce : conservées, hors du dossier actif 1 Pièce d'identité — recette-identite-proprio-not-1.pdf Archivée le 16/11 » | OK |
| NOT-113 | Notaire | ordinateur | Rouvrir la pièce archivée | Aperçu affiché (« Pièce d'identité ») | OK |
| NOT-114 | Notaire | ordinateur | Zip après archivage et nouvelles pièces | 10 entrées : Fiche du dossier.txt / 1 - Propriétaire - Camille-Marie ProprioNOT1/Pièce d'identité.pdf / 2 - Locataire - Louis LocataireNOT1/Pièce d'identité.pdf / 3 - Le bien/Diagnostics.pdf / 3 - Le bien/Diagnostics (2).pdf / 3 - Le bien/Titre de propriété.p… | OK |
| NOT-115 | Notaire | ordinateur | Accepter une pièce sans rien retirer | Acceptée ; message « Pièce acceptée » ; 2 fichier(s) de diagnostics actif(s), 0 archivé | OK |
| NOT-116 | Notaire | ordinateur | Redemander une pièce avec un autre motif | Motifs proposés : Illisible/Expirée/Mauvais document/Incomplète ; ligne : PENDING, motif INCOMPLETE ; message « Pièce redemandée : le client a reçu un e-mail » ; e-mail : « [TEST] Rappel : 1 pièce et 1 information à compléter pour votre bail notarié » avec la… | OK |
| NOT-117 | Notaire | ordinateur | Accepter une « autre pièce » (pièce libre, sans ancienne version) | Un panneau « Anciennes pièces à retirer » s’ouvre et propose 3 fichier(s) sans rapport : recette-message-notaire-….pdf · reçue le 16/11 ; recette-reponse-proprio-….pdf · reçue le 16/11 ; recette-message-notaire-locataire-….pdf · reçue le 16/11 — dont 3 fichie… | partiel |
| NOT-118 | Notaire | ordinateur | État de la demande après traitement partiel | Demande rouverte (statut « ouverte », pastille « En attente du client ») ; 5 lignes acceptées, 2 en attente du client (les deux redemandées), 1 encore à vérifier (l’attestation d’assurance, traitée ensuite : NOT-117) | OK |
| NOT-140 | Propriétaire | ordinateur | Le propriétaire répond aux éléments redemandés | Compteur avant envoi : « 2 / 2 prêts » ; précisions du notaire affichées ; réponse envoyée ; demande : SUBMITTED | OK |
| NOT-141 | Équipe | ordinateur | L'équipe voit la demande du notaire et la réponse du client | « Pièces et informations demandées par le notaire au propriétaire Camille-Marie ProprioNOT1 · réponse reçue le 16/11 À vérifier · 2 Pièce d'identité de Camille ProprioNOT1 Illisible « Recto et verso sur » ; bouton « Accepter » pour l'équipe : absent (lecture … | OK |
| NOT-142 | Équipe | ordinateur | L’équipe accepte une pièce de la demande du notaire en archivant l’ancienne | Une fois le dossier transmis au notaire, la fiche de l’équipe ne propose plus de bouton « Demander », et la demande du notaire y est en lecture seule (aucun bouton « Accepter », cas NOT-141) : il n’a pas été possible de créer à l’écran une demande de l’équipe… | non testé |
| NOT-145 | Notaire | ordinateur | « Tout accepter » | Bouton présent ; message « Tout est accepté » ; lignes : 8/8 acceptées ; prénom en base : « Camille Rose » | OK |
| NOT-146 | Notaire | ordinateur | Demande « Terminée » | Statut en base : ACCEPTED ; pastille « Terminée » affichée ; boutons restants dans la carte : 0 ; titre de la fiche : « Remplacées par une nouvelle pièce : conservées, hors du dossier actif » | OK |
| NOT-147 | Propriétaire | ordinateur | Le client voit que sa demande est validée | « Tout a été validé. » | OK |
| NOT-148 | Notaire | ordinateur | Demande au locataire (pièce « Incomplète » + information « À confirmer ») | Demander au locataire — Louis LocataireNOT1 · recette-not-locataire1@example.invalid ; envoyée ; en base : OPEN ; e-mail : « [TEST] Votre bail notarié : 1 pièce et 1 information à compléter » | OK |
| NOT-149 | Locataire | ordinateur | Le locataire répond à la demande du notaire | Compteur « 2 / 2 prêts » ; écran « Merci, c'est bien reçu » ; demande : SUBMITTED | OK |
| NOT-150 | Notaire | ordinateur | « Tout accepter » d'un seul geste (demande au locataire) | « Le client a confirmé les valeurs, sans rien changer » affiché ; message « Tout est accepté » ; demande : ACCEPTED ; pièces d'identité du locataire actives : 2, archivées : 0 | OK |
| NOT-151 | Notaire | ordinateur | « Relancer » une demande en attente | Message « Rappel envoyé à recette-not-locataire5@example.invalid » ; e-mail : « [TEST] Rappel : 1 pièce à nous envoyer pour votre bail notarié » ; envois en base : 2 ; carte : « Pièces demandées par le notaire au locataire Chloé LocataireNOT5 · Envoyée le 16/… | OK |
| NOT-152 | Notaire | ordinateur | « Annuler la demande » | Confirmation « Annuler la demande ? » affichée ; après « Non » : inchangée ; après « Oui » : annulée en base, message « Demande annulée », carte retirée de la fiche ; côté locataire : /client/locataire — Tableau de bord Mes baux Mes informations ESPACE LOCATA… | OK |
| NOT-153 | Notaire | ordinateur | Fenêtre « Demander » pour un locataire société (bail commercial) | Destinataire : SAS Recette NOT 4 ; éléments proposés : Kbis Reçue le 16/11/2026 ; Statuts de la société Manquante ; Représentant légal de la société Loui | OK |

### Messagerie

| Cas | Rôle | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|---|
| NOT-080 | Notaire | ordinateur | Ouverture de « Discuter » avec le propriétaire | Panneau : « CP Camille ProprioNOT1 Propriétaire Communiquez avec le propriétaire Fermer Aucun message pour le moment Commencez la co » ; bouton « Envoyer » inactif à vide, inactif avec des espaces seuls | OK |
| NOT-081 | Notaire | ordinateur | Envoi d'un message au propriétaire | Message visible dans le fil ; en base : 1 message, destinataire propriétaire ; zone de saisie vidée | OK |
| NOT-082 | Notaire | ordinateur | Le client est prévenu d'un nouveau message | Tâche de fond capturée : email/chat-message.send (non exécutée dans le montage) | OK |
| NOT-083 | Notaire | ordinateur | Double clic sur « Envoyer » | 1 message enregistré | OK |
| NOT-084 | Notaire | ordinateur | Envoi d'un fichier au propriétaire | Fichier annoncé avant envoi ; message avec fichier enregistré en base (1 ligne), fichier « recette-message-notaire-714p.pdf » ; fil : fichier visible | OK |
| NOT-085 | Propriétaire | ordinateur | Le propriétaire lit le message et le fichier du notaire | Message du notaire visible ; fichier visible (premier passage : fil lu trop tôt, avant la fin du chargement, qui prend plusieurs secondes) | OK |
| NOT-086 | Propriétaire | ordinateur | Le propriétaire répond (texte puis fichier) | 2 message(s) du propriétaire en base ; texte présent ; fichier présent | OK |
| NOT-087 | Notaire | ordinateur | La réponse du propriétaire est visible côté notaire | Réponse visible ; fichier du propriétaire visible | OK |
| NOT-088 | Notaire | ordinateur | Fil séparé avec le locataire | Fil du locataire à l'ouverture : aucun message du fil propriétaire ; message enregistré : 1, destinataire locataire | OK |
| NOT-089 | Locataire | ordinateur | Le locataire lit son fil, sans voir celui du propriétaire | Message du notaire visible ; fichier visible ; aucun message du fil propriétaire | OK |
| NOT-090 | Locataire | ordinateur | Le locataire répond au notaire | Message enregistré en base et affiché dans le fil : oui | OK |
| NOT-091 | Notaire | ordinateur | La réponse du locataire est visible côté notaire | Réponse visible ; fil propriétaire non mélangé | OK |
| NOT-092 | Notaire | ordinateur | Suppression d'un de ses messages par le notaire | En base : 1 → 0 ; fil sans recharger : message encore affiché ; après rechargement : retiré (le retrait immédiat dépend du temps réel, désactivé dans le montage) | OK |
| NOT-095 | Notaire | ordinateur | Téléchargement d'un fichier reçu dans la messagerie | Fichier proposé sous le nom « <horodatage>-<identifiant technique>-recette-reponse-proprio-714p.pdf » : le nom est précédé d'un horodatage et d'un identifiant technique | partiel |

### Statuts

| Cas | Rôle | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|---|
| NOT-120 | Notaire | ordinateur | Menu « Avancement du dossier » | Menu : « Avancement du dossier À contacter En traitement Signé Désisté Classé sans suite » | OK |
| NOT-121 | Notaire | ordinateur | « À contacter » → « En traitement » | Message « Statut mis à jour » ; base : CLIENT_CONTACTED ; bouton : « En traitement » ; ligne de la liste : « aud 23000 Guéret En traitement » ; onglets : En cours 5 / Signés 1 / Classés 0 | OK |
| NOT-122 | Notaire | ordinateur | Tableau de bord à jour après un changement de statut | À contacter : 3 ; En traitement : 2 | OK |
| NOT-123 | Propriétaire | ordinateur | Espace du propriétaire quand le dossier est « En traitement » chez le notaire | Dossier « À contacter » : « Chez le notaire — Un notaire a pris votre dossier en charge. Il vous contacte bientôt. » ; dossier « En traitement » : « Avec votre notaire Vous préparez ensemble la signature. » | OK |
| NOT-124 | Équipe | ordinateur | Fiche de l'équipe quand le notaire passe « En traitement » | En-tête de la fiche : « + Dossiers Notaire Frais payés le 16/11 Client contacté · activité aujourd'hui · chez le notair » | OK |
| NOT-125 | Notaire | ordinateur | « En traitement » → « Signé » : passage dans l'onglet « Signés » et compteurs | Dossier n° 3 : statut « Signé » enregistré en base aux deux passages ; au premier, compteurs et onglet « Signés » à jour tout de suite ; au second, compteurs encore anciens 12 s après le changement. Mesure sur le dossier n° 6 : « En traitement » (base : CLIEN… | OK |
| NOT-126 | Propriétaire | ordinateur | Espace du propriétaire après « Signé » | Fiche du bail : Signé, signé ; accueil : 1 Signés | OK |
| NOT-127 | Équipe | ordinateur | Fiche de l'équipe après « Signé » | Mentions relevées : Signé, transmis au notaire | OK |
| NOT-128 | Locataire | ordinateur | Espace du locataire après « Signé » | Mentions relevées : Signé, signé | OK |
| NOT-129 | Notaire | ordinateur | Retour en arrière depuis « Signé » | Signé → En traitement : accepté sans confirmation ; → À contacter : accepté ; remis à « Signé » : oui. Le retour en arrière est donc libre, sans confirmation ni trace visible. | OK |
| NOT-130 | Notaire | ordinateur | Choisir le statut déjà en place | Aucun message, statut inchangé (SIGNED) | OK |
| NOT-131 | Notaire | ordinateur | « Désisté » | Message « Statut mis à jour » ; base : DESISTE ; bouton : « Désisté » ; onglets : En cours 4 / Signés 2 / Classés 0 ; ligne dans « Classés » : « T2 2 Place Bonnyaud 23000 Guéret Désisté » | OK |
| NOT-132 | Propriétaire | ordinateur | Espace du propriétaire après « Désisté » | Fiche du bail : Désistement ; début de la fiche : « Retour Mes dossiers Logement recette NOT 2 Le bail LE BAIL Logement recette NOT 2 Bail d'habitation · 2 Place Bonnyaud 23000 Guéret Désistement Loyer 600,00 € C » | OK |
| NOT-133 | Équipe | ordinateur | Fiche de l'équipe après « Désisté » | Mentions relevées : Désisté, Signé, transmis au notaire | OK |
| NOT-134 | Notaire | ordinateur | Fiche d'un dossier désisté | Onglet actif : « Classés 1 » ; en-tête : « t Propriétaire : Inès ProprioNOT2 · Locataire : Hugo LocataireNOT2 Désisté Tout télécharger · 5 pièces Discuter Demander » — « Demander » et « Discuter » restent proposés sur un dossier désisté, et le statut peut êtr… | OK |
| NOT-135 | Notaire | ordinateur | « Classé sans suite » | Message « Statut mis à jour » ; base : CLASSE_SANS_SUITE ; onglets : En cours 2 / Signés 2 / Classés 2 ; onglet « Classés » : Place Bonnyaud 23000 Guéret Classé sans suite ; ireNOT2 2 Place Bonnyaud 23000 Guéret Désisté | OK |
| NOT-136 | Locataire | ordinateur | Espace du locataire (société) après « Classé sans suite » | Mentions relevées : Classé sans suite ; début : « Retour Mes baux Local recette NOT 4 ESPACE LOCATAIRE Local recette NOT 4 Classé sans suite 4 Place Bonnyaud 23000 Guéret Contacter le notaire LE BAIL TYPE DE BA » | OK |
| NOT-137 | Équipe | ordinateur | Fiche de l'équipe après « Classé sans suite » | Mentions relevées : Classé sans suite, Signé, transmis au notaire | OK |
| NOT-138 | Notaire | ordinateur | Onglets et tableau de bord après tous les changements | En cours 2 / Signés 2 / Classés 2 ; tableau de bord : En cours 2, Signés 2 ; aucun compteur « Classés » sur le tableau de bord | OK |
| NOT-139 | Notaire | ordinateur | Retour en arrière depuis « Signé », « Désisté » et « Classé sans suite » | dossier n° 3 : SIGNED → À contacter accepté (onglet affiché ensuite : « Signés 2 ») ; dossier n° 2 : DESISTE → À contacter accepté (onglet affiché ensuite : « Classés 2 ») ; dossier n° 4 : CLASSE_SANS_SUITE → À contacter accepté (onglet affiché ensuite : « Cl… | OK |
| NOT-156 | Notaire | ordinateur | Changement de statut par un notaire non assigné | Le menu de statut n’existe que sur les dossiers du notaire connecté et l’action passe par une action serveur sans adresse appelable simplement : non sollicitée. Le contrôle d’assignation est présent dans le code (lib/actions/notaires.ts, updateBailStatusByNot… | non testé |

### Téléphone

| Cas | Rôle | Appareil | Vérification | Constaté | Statut |
|---|---|---|---|---|---|
| NOT-160 | Notaire | telephone | Tableau de bord sur téléphone | pas de défilement horizontal ; bouton « Ouvrir le menu » visible ; menu latéral fixe masqué ; compteurs présents | OK |
| NOT-161 | Notaire | telephone | Menu sur téléphone | Entrées : Tableau de bord / Dossiers 5 ; largeur du menu : 300 px sur 412 ; après « Dossiers » : menu refermé, dossier affiché « 6 Place Bonnyaud 23000 Guéret » | OK |
| NOT-162 | Notaire | telephone | Liste des dossiers dans le menu (onglets, compteurs, recherche) | En cours 5 / Signés 0 / Classés 1 ; Signés : 0 ; recherche : 1, 1, 0 (« Aucun dossier ») ; les noms longs « propriétaire → locataire » sont coupés par des points de suspension | OK |
| NOT-163 | Notaire | telephone | Liste puis détail (vue mobile) | Menu refermé ; fiche « 5 Place Bonnyaud 23000 Guéret » ; barre du haut : « Dossier » ; pas de défilement horizontal | OK |
| NOT-164 | Notaire | telephone | Retour à la liste depuis une fiche | Dossier surligné : « Nathan ProprioNOT5 → Chloé LocataireNOT5 5 Place B » ; menu refermé ; il n'y a pas de bouton « retour » dédié : le retour à la liste passe par le bouton de menu | OK |
| NOT-165 | Notaire | telephone | Fiche du dossier commercial sur téléphone | pas de défilement horizontal ; boutons dans l'écran : statut oui, Tout télécharger oui, Discuter oui, Demander oui ; valeurs coupées : 0 ; titres de bloc tronqués : aucun | OK |
| NOT-166 | Notaire | telephone | « Mes demandes » et « Pièces archivées » sur téléphone | pas de défilement horizontal ; bloc « Mes demandes » présent ; bloc « Pièces archivées » présent | OK |
| NOT-167 | Notaire | telephone | Copie d'une ligne au toucher | Icône dans l'écran ; coche verte affichée (annonce : « Loyer mensuel hors charges copié ») ; presse-papiers : « 600 € » | OK |
| NOT-168 | Notaire | telephone | Aperçu d'une pièce sur téléphone | Fenêtre 412 × 755 px dans un écran de 412 × 839 ; document chargé ; bouton de fermeture dans l'écran ; fermeture : oui ; boutons : Ouvrir dans un onglet / Close | OK |
| NOT-169 | Notaire | telephone | Téléchargement d'une pièce et zip sur téléphone | Pièce : « Pièce d'identité - Nathan ProprioNOT5 - k7dkz2.pdf » (58 octets) ; zip : réponse 200, signature PK, 2467 octets, 5 entrées ; lien « Zip » dans l'écran | OK |
| NOT-170 | Notaire | telephone | Changement de statut sur téléphone | Menu 206 px, dans l'écran ; « À contacter » : enregistré, message « Statut mis à jour », bouton « À contacter » ; retour à « En traitement » : enregistré | OK |
| NOT-171 | Notaire | telephone | Fenêtre « Demander » sur téléphone : composition | Fenêtre 380 × 752 px dans 412 × 839 ; contenu défilant : oui ; débordement horizontal de la fenêtre : non ; motifs dans l'écran : 4/4 ; « Voir l'e-mail » visible, « Annuler » visible | OK |
| NOT-172 | Notaire | telephone | Fenêtre « Demander » sur téléphone : aperçu et envoi | Aperçu 380 × 772 px ; « Envoyer la demande » visible ; demande envoyée, e-mail « [TEST] Votre bail notarié : 2 pièces à nous envoyer » | OK |
| NOT-173 | Notaire | telephone | « Discuter » sur téléphone | Panneau 412 × 839 px dans 412 × 839 ; zone de saisie visible, « Envoyer » visible ; message enregistré et affiché ; « Fermer » visible, panneau fermé | OK |
| NOT-174 | Notaire | telephone | Déconnexion par le menu et page de connexion sur téléphone | Bouton « Déconnexion » dans l'écran ; renvoyé sur /notaire/login ; pas de défilement horizontal ; bouton « Recevoir le code » | OK |
| NOT-175 | Notaire | telephone | Connexion réelle par code sur téléphone (notaire n° 2) | Étape code : pas de défilement horizontal ; connecté, tableau de bord « Bienvenue, Maître Recette NOT 2 » | OK |
| NOT-177 | Notaire | telephone | Bulle « Support » et bouton principal de la fenêtre « Demander » | La bulle flottante « Support » et sa croix recouvrent la moitié droite du bouton « Voir l’e-mail · 2 pièces » (libellé en partie masqué) ; le bouton reste utilisable par sa moitié gauche | partiel |
| NOT-180 | Notaire | iphone | Tableau de bord sur téléphone | pas de défilement horizontal ; bouton « Ouvrir le menu » visible ; menu latéral fixe masqué ; compteurs présents | OK |
| NOT-181 | Notaire | iphone | Menu sur téléphone | Entrées : Tableau de bord / Dossiers 5 ; largeur du menu : 300 px sur 390 ; après « Dossiers » : menu refermé, dossier affiché « 6 Place Bonnyaud 23000 Guéret » | OK |
| NOT-182 | Notaire | iphone | Liste des dossiers dans le menu (onglets, compteurs, recherche) | En cours 5 / Signés 0 / Classés 1 ; Signés : 0 ; recherche : 1, 1, 0 (« Aucun dossier ») ; les noms longs « propriétaire → locataire » sont coupés par des points de suspension | OK |
| NOT-183 | Notaire | iphone | Liste puis détail (vue mobile) | Menu refermé ; fiche « 5 Place Bonnyaud 23000 Guéret » ; barre du haut : « Dossier » ; pas de défilement horizontal | OK |
| NOT-184 | Notaire | iphone | Retour à la liste depuis une fiche | Dossier surligné : « Nathan ProprioNOT5 → Chloé LocataireNOT5 5 Place B » ; menu refermé ; il n'y a pas de bouton « retour » dédié : le retour à la liste passe par le bouton de menu | OK |
| NOT-185 | Notaire | iphone | Fiche du dossier commercial sur téléphone | pas de défilement horizontal ; boutons dans l'écran : statut oui, Tout télécharger oui, Discuter oui, Demander oui ; valeurs coupées : 0 ; titres de bloc tronqués : aucun | OK |
| NOT-186 | Notaire | iphone | « Mes demandes » et « Pièces archivées » sur téléphone | pas de défilement horizontal ; bloc « Mes demandes » présent ; bloc « Pièces archivées » présent | OK |
| NOT-187 | Notaire | iphone | Copie d'une ligne au toucher | Icône dans l'écran ; coche verte affichée (annonce : « Loyer mensuel hors charges copié ») ; lecture du presse-papiers non automatisable sur le moteur Safari : la copie est attestée par la coche et l'absence du message « Copie impossible » | OK |
| NOT-188 | Notaire | iphone | Aperçu d'une pièce sur téléphone | Fenêtre 390 × 598 px dans un écran de 390 × 664 ; document chargé ; bouton de fermeture dans l'écran ; fermeture : oui ; boutons : Ouvrir dans un onglet / Close | OK |
| NOT-189 | Notaire | iphone | Téléchargement d'une pièce et zip sur téléphone | Pièce : « Pièce d'identité - Nathan ProprioNOT5 - k7dkz2.pdf » (58 octets) ; zip : réponse 200, signature PK, 2467 octets, 5 entrées ; lien « Zip » dans l'écran | OK |
| NOT-190 | Notaire | iphone | Changement de statut sur téléphone | Menu 207 px, dans l'écran ; « À contacter » : enregistré, message « Statut mis à jour », bouton « À contacter » ; retour à « En traitement » : enregistré | OK |
| NOT-191 | Notaire | iphone | Fenêtre « Demander » sur téléphone : composition | Fenêtre 358 × 611 px dans 390 × 664 ; contenu défilant : oui ; débordement horizontal de la fenêtre : non ; motifs dans l'écran : 4/4 ; « Voir l'e-mail » visible, « Annuler » visible | OK |
| NOT-192 | Notaire | iphone | Fenêtre « Demander » sur téléphone : aperçu et envoi | Aperçu 358 × 611 px ; « Envoyer la demande » visible ; demande non envoyée (annulée volontairement) | OK |
| NOT-193 | Notaire | iphone | « Discuter » sur téléphone | Panneau 390 × 664 px dans 390 × 664 ; zone de saisie visible, « Envoyer » visible ; message enregistré et affiché ; « Fermer » visible, panneau fermé | OK |
| NOT-194 | Notaire | iphone | Déconnexion par le menu et page de connexion sur téléphone | Bouton « Déconnexion » dans l'écran ; renvoyé sur /notaire/login ; pas de défilement horizontal ; bouton « Recevoir le code » | OK |
| NOT-195 | Notaire | iphone | Connexion réelle par code sur téléphone (notaire n° 2) | Étape code : pas de défilement horizontal ; connecté, tableau de bord « Bienvenue, Maître Recette NOT 2 » | OK |

## 4. Observations (qui ne sont pas des défauts)

- Limite de débit de l'authentification : le serveur refuse au-delà de trois demandes de code par minute pour une même adresse IP (réponse 429). Dans le montage, tous les agents partagent la même adresse : des tentatives de connexion du notaire ont été refusées pour cette raison puis ont réussi après attente. En production, des notaires d'une même étude (même adresse IP) pourraient rencontrer ce refus.
- Page de connexion : le vocabulaire mêle « code OTP » (« Recevoir le code OTP », « Code OTP envoyé par email ») et « code de connexion » ; le pied de page affiche « © 2025 ».
- Un notaire connecté qui ouvre /interface ou /client passe par la page de connexion de l'espace visé (écran « Chargement… » quelques secondes) avant d'être renvoyé sur /notaire : résultat correct, détour visible.
- Fiche : les boutons de l'en-tête (statut, « Discuter », « Demander ») ne répondent pas pendant la première seconde après l'affichage, le temps que la page devienne interactive ; un clic très rapide est perdu.
- Statuts : aucune règle de transition ni confirmation. Le notaire peut passer de « Signé », « Désisté » ou « Classé sans suite » à « À contacter » d'un clic, et « Demander » / « Discuter » restent proposés sur un dossier classé. Après un changement qui fait changer le dossier d'onglet, la liste reste sur l'ancien onglet (le dossier en disparaît, la fiche reste affichée).
- Vocabulaire des statuts : le notaire lit « À contacter / En traitement », l'équipe « Client contacté », le client « Chez le notaire » puis « Avec votre notaire — Vous préparez ensemble la signature », « Signé », « Désistement », « Classé sans suite ». Cohérent, mais trois vocabulaires pour le même état.
- Après un changement de statut, les compteurs et la liste du menu se mettent à jour seuls en 5 à 7 secondes (mesuré), parfois plus de 12 secondes quand le serveur est chargé ; pendant ce délai le dossier reste listé dans son ancien onglet.
- Connexion par code sur téléphone : un premier essai sur Android n'a pas abouti (resté sur la page de connexion, vraisemblablement à cause de la limite de débit partagée) ; le second passage a réussi, comme sur iPhone.
- Pendant la campagne, la base de test distante a été injoignable à deux reprises pendant quelques dizaines de secondes (pages en attente plus de 45 secondes) : limite du montage, les étapes touchées ont été rejouées.
- Le tableau de bord du notaire n'a pas de compteur pour les dossiers classés (désistés, sans suite), qui ne se retrouvent que dans l'onglet « Classés ».
- L'équipe voit les demandes du notaire sur sa fiche, en lecture seule (aucun bouton « Accepter ») une fois le dossier transmis.
- Après la suppression d'un message par le notaire, la bulle reste affichée jusqu'au rechargement : dans le montage, le retrait immédiat dépend du temps réel, désactivé.
- Sur téléphone, il n'y a pas de bouton « retour à la liste » : on y revient par le bouton de menu, qui rouvre la liste avec le dossier courant surligné. Les lignes de la liste coupent les noms longs « propriétaire → locataire » par des points de suspension.
- Sur la page du client, l'enregistrement d'une information met 5 à 15 secondes dans le montage ; le bouton tourne, sans autre indication.
- L'archive zip range les pièces par dossier (« 1 - Propriétaire - … », « 2 - Locataire - … », « 3 - Le bien », « 4 - Le bail ») et contient une « Fiche du dossier.txt » fidèle à l'écran ; deux pièces du même type sont distinguées par « (2) ».

## 5. Non testé, et pourquoi

- **NOT-142 — L’équipe accepte une pièce de la demande du notaire en archivant l’ancienne** : Une fois le dossier transmis au notaire, la fiche de l’équipe ne propose plus de bouton « Demander », et la demande du notaire y est en lecture seule (aucun bouton « Accepter », cas NOT-141) : il n’a pas été possible de créer à l’écran une demande de l’équipe ni une pièce archivée par l’équipe sur un dossier fictif déjà chez le notaire. L’étape n’a donc pas pu être jouée.
- **NOT-143 — Le notaire ne voit pas les pièces archivées par l’équipe** : Une fois le dossier transmis au notaire, la fiche de l’équipe ne propose plus de bouton « Demander », et la demande du notaire y est en lecture seule (aucun bouton « Accepter », cas NOT-141) : il n’a pas été possible de créer à l’écran une demande de l’équipe ni une pièce archivée par l’équipe sur un dossier fictif déjà chez le notaire. À la lecture du code, le bloc « Pièces archivées » du notaire ne charge que les pièces qu’il a lui-même archivées (lib/actions/complement-requests.ts, getNotaireArchivedDocuments) et l’accès direct à une pièce archivée par un autre est refusé (lib/document-access.ts) ; vérifié à l’écran seulement pour un autre notaire (NOT-059).
- **NOT-155 — Le notaire ne voit pas les demandes de l’équipe** : Une fois le dossier transmis au notaire, la fiche de l’équipe ne propose plus de bouton « Demander », et la demande du notaire y est en lecture seule (aucun bouton « Accepter », cas NOT-141) : il n’a pas été possible de créer à l’écran une demande de l’équipe ni une pièce archivée par l’équipe sur un dossier fictif déjà chez le notaire. À la lecture du code, « Mes demandes » ne charge que les demandes d’origine notaire (getNotaireComplementRequests). À l’inverse, l’équipe voit bien les demandes du notaire (NOT-141).
- **NOT-156 — Changement de statut par un notaire non assigné** : Le menu de statut n’existe que sur les dossiers du notaire connecté et l’action passe par une action serveur sans adresse appelable simplement : non sollicitée. Le contrôle d’assignation est présent dans le code (lib/actions/notaires.ts, updateBailStatusByNotaire).
- Temps réel de la messagerie (arrivée d'un message sans recharger) : désactivé dans le montage, comme annoncé par le règlement.
- Exécution réelle des e-mails différés (notification de nouveau message) : les tâches de fond sont capturées mais non exécutées ; seule leur création a été vérifiée (tâche « email/chat-message.send »).
- Lecture du presse-papiers sur le moteur Safari (iPhone) : non automatisable ; la copie y est attestée par la coche verte et l'absence du message « Copie impossible ».

## 6. Données créées (pour le nettoyage)

- Aucun compte ni dossier créé : uniquement les comptes et dossiers fictifs de `donnees-NOT.json`.
- Dossier n° 1 : deux demandes du notaire terminées (propriétaire : 8 éléments ; locataire : 2 éléments) ; pièces déposées par les clients (`recette-identite-proprio-not-1-v2.pdf`, `recette-diagnostics-not-1-v2.pdf`, `recette-titre-not-1-v2.pdf`, `recette-titre-not-1-v3.pdf`, `recette-assurance-not-1.pdf`, `recette-identite-locataire-not-1-v2.pdf`) ; ancienne pièce d'identité du propriétaire archivée par le notaire ; messages et fichiers de messagerie (`recette-message-notaire-….pdf`, `recette-reponse-proprio-….pdf`, `recette-message-notaire-locataire-….pdf`). Fiche du propriétaire modifiée : prénom « Camille Rose », profession « Architecte (réponse de recette) », nationalité belge.
- Dossier n° 5 : une demande du notaire au locataire annulée, une demande au propriétaire ouverte (envoyée depuis le téléphone : titre de propriété « expirée » et une autre pièce), messages de messagerie envoyés depuis le téléphone et l'iPhone. Statut inchangé au final (« En traitement »).
- Statuts finaux : dossier n° 3 « Signé », n° 2 « Désisté », n° 4 « Classé sans suite », n° 6 « Signé » ; n° 1, n° 5 et n° 7 inchangés.
- Dossier n° 7 (notaire n° 2) : rien de modifié (une tentative d'écriture par le notaire n° 1 a été refusée).
- Sessions de test en base pour les comptes fictifs (marquées « recette-agents »), codes de connexion consommés par les notaires n° 1 et n° 2, notifications internes associées.
- Fichiers hors base : `reports/recette-complete/NOT/telechargements/` (pièces et zip téléchargés pendant les tests).

## Annexes

- Cas détaillés : `resultats.json` (un cas par vérification, avec étapes, attendu, constaté).
- Captures : `captures/` ; fichiers téléchargés pendant les tests : `telechargements/`.
- Scripts relançables : `scripts/` (`_c.cjs` = outils communs ; `01` connexion, `02` liste, fiche et cloisonnement, `04a` à `04d` demandes, `05` messagerie, `06` statuts, `07` cloisonnement complémentaire, `08` téléphone, `90` ce rapport).
