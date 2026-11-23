# Recette complète BailNotarie — règlement commun des agents

Tu es un agent de test. Un orchestrateur répartit la recette entre plusieurs agents ; chacun a un **code**
(ex. `LOC`), une feuille de mission `MISSION-<CODE>.md` dans ce dossier, et ses propres données fictives
`donnees-<CODE>.json`. Lis ce règlement en entier, puis ta mission, avant de commencer.

But de la campagne : vérifier **à l'écran**, sur ordinateur et sur téléphone, tout ce que l'application fait
aujourd'hui sur la branche `codex/prep-pr-main` (= `staging` + corrections). `main` est très en retard : presque
toutes les fonctionnalités sont nouvelles par rapport à `main`. On teste donc tout, pas seulement les nouveautés
récentes. Inventaire : `commits-main-staging.txt` (371 commits) et `commits-branche.txt`, dans ce dossier.

Langue : tout ce que tu écris (rapport, cas, messages) est en **français correct, avec les accents**.

## 1. Règles de sécurité — non négociables

1. **Un seul serveur** : `http://localhost:3210` (build de production de la branche, déjà lancé). N'ouvre aucune
   autre adresse de l'application (ni staging, ni production, ni `localhost:3000`). Ne redémarre pas le serveur,
   ne lance ni `build`, ni `prisma`, ni migration.
2. **Base** : c'est une copie de test qui contient des données **réelles** de clients. Tu peux **lire** partout.
   Tu ne peux **modifier** (cliquer sur un bouton qui enregistre, relance, supprime, valide, envoie…) **que** les
   dossiers, clients, biens et comptes **fictifs** : ceux de `donnees-<CODE>.json` et ceux que tu crées toi-même.
   Un dossier réel se regarde, ne se touche pas. En cas de doute sur une ligne : ne clique pas.
3. **Comptes** : uniquement des adresses `recette-<code>-…@example.invalid`. Pour un nouveau compte, garde ce
   préfixe (ex. `recette-loc-nouveau3@example.invalid`). Jamais d'adresse réelle, jamais celle d'un vrai client.
4. **Fichiers déposés** : toujours via `R.deposer` / `R.fichier` (nom commençant par `recette-`). Ne supprime
   une pièce que si c'est une pièce `recette-…`.
5. **Paiement** : Stripe est en **mode test**. Carte de test publiée par Stripe : `4242 4242 4242 4242`, date
   future quelconque, CVC `123`. Carte refusée : `4000 0000 0000 0002`. Jamais de vraie carte.
6. **Rien ne sort de la machine** : e-mails, tâches de fond et fichiers sont capturés par des doublures locales.
   N'essaie pas de contacter un service externe par toi-même. Ne télécharge et n'installe rien (ni `npm install`).
7. **Tu ne modifies pas le code de l'application** et tu ne fais aucun `git commit`, `push`, `stash`, `checkout`.
   Tu écris seulement dans ton dossier `reports/recette-complete/<CODE>/`. Si tu trouves un défaut, tu le
   **décris** ; c'est l'orchestrateur qui corrige.
8. **Vie privée** : aucune donnée réelle (nom, e-mail, téléphone, adresse d'un vrai client) dans ton rapport, tes
   cas ou tes captures. Sur les écrans de l'équipe qui listent des dossiers réels, filtre d'abord sur « recette »
   ou ouvre directement un dossier fictif avant de capturer ; sinon, pas de capture.
9. Ne recopie jamais de secret (clé, jeton de session, URL de base) dans un fichier ou un message.

## 2. Environnement

- Dossier de travail : `C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main` (appelé « le worktree »).
- Pilotage du navigateur : **Playwright** (déjà sur la machine), par des scripts Node que tu écris dans
  `reports/recette-complete/<CODE>/scripts/*.cjs` et que tu lances avec `node` depuis le worktree.
  Tu n'utilises pas le navigateur intégré de l'application Claude (outils `mcp__Claude_Browser__*`) : il est
  partagé et réservé à l'orchestrateur.
- Bibliothèque commune : `scripts/prep/recette/lib.cjs` — lis ses commentaires. Résumé :

```js
const R = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/scripts/prep/recette/lib.cjs');
const D = R.donnees('LOC');                                  // tes comptes et dossiers fictifs
const s = await R.ouvrir({ appareil: 'ordinateur', compte: D.comptes.admin });   // session déjà ouverte
// appareils : ordinateur (1440×900), portable (1280×720), tablette, telephone (Pixel 7, Chromium),
//             iphone (iPhone 13, moteur Safari/WebKit), petit (iPhone SE 375 px)
await s.page.goto(R.BASE + '/interface/baux/' + D.dossiers[0].bailId, { waitUntil: 'domcontentloaded' });
await R.capture(s.page, 'LOC', 'fiche-dossier-ordinateur');   // → captures/fiche-dossier-ordinateur.png
const o = await R.debordement(s.page);                        // défilement horizontal parasite (téléphone)
await R.connecter(s.context, 'recette-loc-proprio1@example.invalid');  // changer de compte dans le même navigateur
const code = await R.dernierCode('recette-loc-locataire1@example.invalid');  // code de connexion reçu par e-mail
R.emails({ pour: '…', sujet: /…/ });  R.texteEmail(m);  R.liensEmail(m);     // e-mails capturés (aucun envoyé)
R.evenements({ nom: /email\// });                             // tâches de fond capturées (non exécutées)
await R.deposer(s.page, 'input[type=file]', 'identite');      // dépose recette-identite.pdf
R.payer(jetonDuFormulaire);                                   // paiement Stripe TEST + webhook signé (secours)
R.sql('SELECT status FROM "Bail" WHERE id=\'…\'');            // lecture seule sur la copie
s.journal  // { console, erreursPage, reponses5xx, requetesEchouees } accumulés pendant la session
await s.fermer();
```

- Une action qui enregistre met **2 à 8 secondes** à se refléter à l'écran (serveur local, base distante).
  Attends un élément précis (`locator.waitFor`, `expect`-like par boucle) plutôt qu'un délai fixe. N'utilise pas
  `waitUntil: 'networkidle'` (la messagerie en direct garde des connexions ouvertes) : `domcontentloaded` puis
  attente d'un texte ou d'un bouton.
- Les formulaires utilisent React : remplis avec `locator.fill()` / `pressSequentially()` / `click()`, pas en
  modifiant le DOM. Listes déroulantes Radix : clic sur le déclencheur puis `getByRole('option', { name })`.
- Connexion par code : le code arrive dans un e-mail capturé → `R.dernierCode(email)`. Teste au moins une fois
  la vraie connexion par code de ton rôle ; pour le reste, `compte:` / `R.connecter` vont plus vite.
- Paiement à l'écran : le champ carte est dans un cadre Stripe. Essaie d'abord de le remplir pour de vrai
  (`page.frameLocator('iframe[name^="__privateStripeFrame"]')…`, carte de test). Si le cadre résiste après deux
  essais, utilise `R.payer(jeton)` puis recharge le formulaire, et note-le dans ton rapport.
- Tâches de fond : elles sont capturées, **pas exécutées**. Les e-mails envoyés directement (codes, dossier
  assigné, demandes) arrivent dans `R.emails` ; les autres n'existent que comme événements (`R.evenements`).
  Les statuts recalculés en tâche de fond (complétude) peuvent donc ne pas bouger : ce n'est pas un défaut.
- Limites connues du montage (à ne pas signaler comme défauts) : messagerie en direct sans temps réel (recharger
  la page), lecture automatique des diagnostics indisponible (pas de clé OpenAI), scripts `_vercel/insights` en 404.
- Tes dossiers fictifs « prêts à l'emploi » ont été créés directement en base : s'il manque un détail qu'un vrai
  parcours aurait rempli, vérifie sur un dossier créé par l'interface avant de conclure à un défaut.

## 3. Méthode

1. **Reconnaissance** : pour chaque écran, un petit script qui ouvre la page, imprime le texte utile et les
   éléments interactifs, prend une capture. Comprends l'écran avant d'écrire le test.
2. **Largeur d'abord** : passe sur toutes les fonctionnalités de ta mission une première fois, puis approfondis
   (cas d'erreur, champs obligatoires, valeurs limites, retour arrière, rechargement, double clic, droits d'accès).
3. **Chaque fonctionnalité sur chaque appareil demandé.** Sur téléphone, vérifie en plus : pas de défilement
   horizontal (`R.debordement`), boutons atteignables, menus et fenêtres qui tiennent dans l'écran, champs
   utilisables, bouton principal visible, textes non coupés. Teste `telephone` **et** `iphone` sur les écrans clés.
4. **Preuve** : une capture par écran important et par défaut. Vérifie en base (`R.sql`) ce que l'écran prétend
   avoir enregistré. Regarde `s.journal` à la fin de chaque parcours (erreurs JavaScript, réponses 5xx).
5. **Un défaut se confirme** : reproduis-le une seconde fois. Cherche d'où il vient : `git diff staging --stat --
   <fichier>` (lecture seule) te dit si le code a été touché par la branche (`origine: 'branche'`) ou s'il est
   identique à staging (`'staging'`). Si c'est dû au montage de test : `'montage'`.
6. Ce que tu n'as pas pu tester se déclare `NON_TESTE` avec la raison. Ne déclare jamais « OK » sans l'avoir vu.
7. Si un script plante trois fois sur le même point, contourne (autre sélecteur, autre chemin) ou déclare le
   cas `PARTIEL` / `NON_TESTE` et avance. Ne reste pas bloqué.

## 4. Livrables, dans `reports/recette-complete/<CODE>/`

- `resultats.json` — écrit par `R.rapport('<CODE>')` : un **cas** par vérification.
  ```js
  const r = R.rapport('LOC');
  r.cas({ id: 'LOC-012', role: 'Locataire', appareil: 'telephone', domaine: 'Formulaire',
          fonctionnalite: 'Envoi refusé sans pièce d\'identité',
          etapes: 'Étape 4, cocher la confirmation, « Soumettre » sans fichier',
          attendu: 'Refus avec la liste des pièces manquantes', constate: 'Message « Veuillez joindre… » affiché, rien d\'enregistré',
          statut: 'OK', capture: 'captures/loc-012-refus-sans-piece.png' });
  // si KO ou PARTIEL : gravite: 'bloquant' | 'majeur' | 'mineur' | 'cosmetique', origine: 'branche' | 'staging' | 'montage' | 'inconnue'
  r.ecrire();   // fusionne avec les cas déjà écrits
  ```
  Identifiants `<CODE>-001`, `<CODE>-002`… stables. `role` : Propriétaire, Locataire, Équipe, Notaire, Visiteur.
  `appareil` : ordinateur, tablette, telephone, iphone, petit. Vise **au moins 60 cas** réellement exécutés.
- `captures/*.png` — par `R.capture`.
- `scripts/*.cjs` — tes scripts, relançables.
- `RAPPORT.md` — ton rapport, pour un lecteur qui n'a rien vu :
  1. **Synthèse** (5 lignes : ce qui marche, ce qui ne marche pas, verdict) et tableau des totaux par rôle et appareil.
  2. **Défauts**, du plus grave au plus bénin : titre, gravité, origine, appareil(s), comment le reproduire,
     ce qu'on attendait, ce qu'on voit, capture, fichier de code soupçonné si tu l'as trouvé.
  3. **Parcours vérifiés**, par domaine, avec ce qui a été constaté (tableaux).
  4. **Observations** (ergonomie, textes, lenteurs, incohérences) qui ne sont pas des défauts.
  5. **Non testé** et pourquoi.
  6. **Données créées** : comptes et dossiers fictifs que tu as ajoutés (pour le nettoyage).
  Phrases complètes, pas de jargon interne, pas de données réelles.

## 5. Fin de mission

Ta réponse finale à l'orchestrateur tient en dix lignes : totaux (cas, OK, KO, partiels, non testés), les défauts
les plus graves en une ligne chacun, ce qui reste non testé, et le chemin de ton `RAPPORT.md`. Pas de recopie du
rapport. Avant de répondre, relis ton `RAPPORT.md` et vérifie que `resultats.json` est à jour et cohérent avec lui.
