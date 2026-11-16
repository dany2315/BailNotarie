# Préparation de la PR staging → main — bilan au 16/11/2026

Branche locale `codex/prep-pr-main` (6 commits au-dessus de `staging` 6c49ac1), dans un worktree isolé.
**Rien n'est poussé, aucune PR, aucune fusion dans `main` ni `staging`, aucun accès à la production.**
Seule base utilisée : la copie `DATABASE_MIGRATE_TEST`. Stripe, e-mails, S3, Pusher, Inngest : simulés.

## 1. État par lot

| Lot | État | Preuve |
| --- | --- | --- |
| 1 — Paiements | Implémenté, testé sur la copie avec Stripe simulé | 41 tests + 5 tours de concurrence réelle |
| 2 — Accord du locataire | Implémenté, testé sur la copie | 18 tests |
| 3 — Dates après le locataire | **Non commencé** | — |
| 4 — Compléments et archivage | Implémenté, testé sur la copie | 17 tests |
| 5 — Loyers et barèmes | **Partiel** : garde-fou de disponibilité, import vérifié, ancien contrôle retiré | 7 tests + panne d'import simulée puis reprise |
| 6 — Données historiques | Listes en lecture seule produites ; aucune donnée modifiée | `lot6-listes.json` |
| 7 — Tests | 83 tests, 0 échec, base restaurée à chaque suite ; TypeScript et build de production isolé OK | fichiers `tests-*.json` |
| 8 — Bascule | Déroulé rédigé ci-dessous ; **rien d'exécuté** | — |

Non testé : paiement réel en mode test Stripe, webhook réel, e-mails, S3, parcours complet au navigateur
(seule la fiche dossier admin et la liste ont été vues dans un navigateur), chaîne complète sur une copie
fraîche de la production, sauvegarde/restauration.

## 2. Ce qui change dans les données

5 migrations ajoutées, toutes additives (aucune ligne existante modifiée) :

| Migration | Ajout |
| --- | --- |
| `20261116100000_dossier_payments` | tables `DossierPayment`, `StripeWebhookEvent`, `HistoricalPaymentReview` |
| `20261116110000_tenant_agreement_history` | table `BailTenantAgreementHistory` ; 3 colonnes facultatives sur `Bail` |
| `20261116120000_complement_proposals_document_archive` | colonnes facultatives sur `ComplementRequestItem` et `Document` |
| `20261116130000_complement_proposed_answer_archive_origin` | colonnes facultatives sur `ComplementRequestItem` et `Document` |
| `20261116140000_rent_cap_import_journal` | table `RentCapImport` |

Avec les 17 de staging, `main` recevra 22 migrations. La seule qui écrit dans des lignes existantes reste
`20261008120000_add_intake_form_tracking` (rétro-remplissage de `IntakeLink`).

Vérifié sur la copie : les 31 tables métier d'origine sont identiques, ligne par ligne, avant et après
(empreintes SHA-256). Seuls changent le journal des migrations et les identifiants techniques des barèmes
réimportés.

Comportements qui réinterprètent des données existantes :
- « payé » = `paidAt` renseigné **ou** paiement historique confirmé par l'équipe ;
- un dossier non payé ne passe plus tout seul à « prêt pour notaire » ;
- une réponse à un complément n'est plus écrite dans le dossier avant acceptation ;
- accepter une nouvelle pièce ne supprime plus l'ancienne ;
- sans barèmes importés et vérifiés, l'envoi au notaire d'un bail d'habitation est refusé.

## 3. Écarts trouvés que le plan ne nommait pas

1. Trois automatismes passaient un dossier à « prêt pour notaire » sans vérifier le paiement. Corrigé.
2. Six anciens dossiers sans paiement enregistré, pas cinq : le bail **signé** `cmim4j9kj00013sh3082uyi2n` en fait partie.
3. L'écran de paiement invitait à « réessayer » quand le paiement était en cours. Corrigé.
4. Dans l'espace client, chaque ouverture de l'écran de paiement créait un nouvel ordre de paiement. Corrigé.
5. Changer l'e-mail du locataire dans le formulaire propriétaire revient à changer de locataire sans retirer son accord. Corrigé.
6. Les barèmes du dépôt s'arrêtent les 23 et 24/11/2026 (fin légale de l'expérimentation, suivie par la veille).
7. La lecture automatique des diagnostics démarre dès que `OPENAI_API_KEY` existe en production et peut modifier un bien partagé.
8. Retour arrière : l'ancien code ne lit pas une date d'effet vide (Lot 3) ni les nouvelles valeurs d'énumération de staging.
9. `vercel-build` lance `prisma migrate deploy` à chaque déploiement ; la configuration Vercel n'a pas pu être lue (accès refusé).
10. La chaîne complète (22 migrations + import) n'a pas été rejouée sur une copie fraîche : il en faut une.

## 4. Décisions à prendre

1. **Référentiel des loyers indisponible** : bloquer l'envoi au notaire (choix provisoire dans le code) ou seulement avertir.
2. **Complétude** : sur 104 fiches, staging ajoute la situation familiale (68) et le contrat de mariage (26), retire le livret de famille (24), l'assurance (23) et le RIB (21). 5 fiches deviennent incomplètes, 4 deviennent complètes. Les statuts enregistrés ne bougent pas tout seuls.
3. **Six brouillons commerciaux** avec un type d'habitation : valeurs à donner dossier par dossier.
4. **Document d'identité orphelin** `cmkiomzd70001jr04c04h5byu` (17/01/2026) : trois personnes sans pièce créées ce jour-là sont des pistes, rien n'est rattaché.
5. **Deux interprétations faites** : une pièce envoyée pour un complément rejoint le dossier tout de suite (marquée « à vérifier ») ; le notaire qui accepte sa propre demande applique la réponse, mais seule l'équipe archive des pièces.

## 5. Déroulé de bascule (à exécuter par vous, sur autorisation explicite)

1. Trancher les décisions ci-dessus ; terminer le Lot 3 ou le sortir explicitement du périmètre.
2. Rejouer sur une copie fraîche de la production : 22 migrations, import des barèmes, suites de tests.
3. Vérifier dans Vercel : branche de production, base de chaque environnement, commande de build.
4. Créer le point de terminaison Stripe `/api/stripe/webhook` (événements `payment_intent.succeeded`, `processing`, `payment_failed`, `canceled`) et la variable `STRIPE_WEBHOOK_SECRET`.
5. Vérifier une sauvegarde et une restauration sur une cible séparée.
6. Fusionner (conflits `contact-form.tsx` et `footer.tsx` : garder la version staging, même numéro de téléphone).
7. Après migration : `import-rent-caps.ts --env … --confirm-host …`, puis `--verify`.
8. `historical-payments.cjs preview`, puis `apply` ; vérifier les six dossiers un par un depuis leur fiche.
9. Contrôles après ouverture : un paiement test, la liste « non payés », un dossier signé, une demande de complément.

Retour arrière : le code précédent ignore les nouvelles tables et colonnes. Un paiement historique confirmé
redevient « non payé » à l'écran, une pièce archivée reste invisible, et les réponses de complément en
attente ne sont pas appliquées. Une restauration de base perdrait les écritures faites depuis la bascule.
