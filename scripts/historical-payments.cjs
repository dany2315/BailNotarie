#!/usr/bin/env node
/**
 * Paiements historiques — liste fermée des anciens dossiers dont le paiement doit être vérifié à la main.
 *
 * Ce script NE CONFIRME AUCUN PAIEMENT. Il établit, une seule fois à la bascule, la liste des dossiers que
 * l'équipe pourra ensuite vérifier un par un depuis la fiche du dossier (preuve obligatoire).
 *
 *   Aperçu (lecture seule, n'écrit rien) :
 *     node scripts/historical-payments.cjs preview --env <NOM_VARIABLE> --cutoff 2026-11-20 [--env-file <chemin>]
 *
 *   Application (ajoute les dossiers à la liste, rejouable sans doublon, journal écrit dans --journal) :
 *     node scripts/historical-payments.cjs apply --env <NOM_VARIABLE> --cutoff 2026-11-20 \
 *          --confirm-host <début du nom d'hôte affiché par l'aperçu> --expect <nombre affiché par l'aperçu> \
 *          --journal <fichier.json>
 *
 * Garde-fous :
 *  - la base est désignée explicitement par le NOM d'une variable (--env) ; aucune valeur par défaut ;
 *  - l'application exige de recopier le nom d'hôte et le nombre de dossiers vus dans l'aperçu ;
 *  - périmètre : dossiers créés AVANT la date de bascule (--cutoff), sans paiement enregistré, dans un
 *    statut qui suppose normalement un paiement. Les brouillons, désistements et dossiers classés sans
 *    suite sont exclus. Aucun dossier créé après la bascule ne peut entrer dans la liste.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };

/** Statuts où un dossier sans paiement est anormal (il a dépassé l'étape de paiement). */
const STATUSES = ['AWAITING_TENANT', 'AWAITING_TENANT_FORM', 'PENDING_VALIDATION', 'READY_FOR_NOTARY', 'CLIENT_CONTACTED', 'SIGNED', 'TERMINATED'];

function fail(message) { console.error('Refusé : ' + message); process.exit(2); }

async function main() {
  if (mode !== 'preview' && mode !== 'apply') fail('mode attendu : preview | apply');
  const envName = opt('env');
  if (!envName) fail('--env <NOM_VARIABLE> est obligatoire (aucune base par défaut)');
  const cutoffRaw = opt('cutoff');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoffRaw || '')) fail('--cutoff AAAA-MM-JJ est obligatoire (date de la bascule)');
  const cutoff = new Date(cutoffRaw + 'T00:00:00Z');

  let url = process.env[envName];
  const envFile = opt('env-file');
  if (!url && envFile) url = require('dotenv').parse(fs.readFileSync(envFile))[envName];
  if (!url) fail(`variable ${envName} introuvable`);
  const host = new URL(url).hostname;

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasourceUrl: url, log: [] });
  try {
    const where = { paidAt: null, status: { in: STATUSES }, createdAt: { lt: cutoff }, historicalPayment: { is: null } };
    const read = (tx) => Promise.all([
      tx.bail.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, status: true, bailFamily: true, createdAt: true, stripePaymentIntentId: true,
          // Pistes de rapprochement : références Stripe restées sur les formulaires du dossier.
          intakes: { where: { stripePaymentIntentId: { not: null } }, select: { target: true, stripePaymentIntentId: true } },
          payments: { select: { stripePaymentIntentId: true, status: true } },
        },
      }),
      tx.historicalPaymentReview.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const [candidates, existing] = mode === 'preview'
      ? await prisma.$transaction(async (tx) => { await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY'); return read(tx); })
      : await read(prisma);

    const rows = candidates.map((b) => ({
      bailId: b.id,
      statut: b.status,
      usage: b.bailFamily,
      creeLe: b.createdAt.toISOString().slice(0, 10),
      pistesStripe: [...new Set([b.stripePaymentIntentId, ...b.intakes.map((i) => i.stripePaymentIntentId), ...b.payments.map((p) => p.stripePaymentIntentId)].filter(Boolean))],
    }));
    const summary = {
      mode, hote: host, bascule: cutoffRaw,
      dossiersAajouter: rows.length,
      dejaDansLaListe: Object.fromEntries(existing.map((g) => [g.status, g._count._all])),
      dossiers: rows,
    };

    if (mode === 'preview') {
      console.log(JSON.stringify(summary, null, 1));
      console.log('\nAperçu seulement : rien n’a été écrit. Aucun paiement n’est confirmé par ce script.');
      return;
    }

    const confirmHost = opt('confirm-host');
    if (!confirmHost || !host.startsWith(confirmHost)) fail(`--confirm-host doit reprendre le début de l'hôte visé (${host})`);
    if (String(rows.length) !== opt('expect')) fail(`--expect doit valoir le nombre de dossiers de l'aperçu (ici ${rows.length})`);
    const journal = opt('journal');
    if (!journal) fail('--journal <fichier.json> est obligatoire');

    const created = await prisma.historicalPaymentReview.createMany({
      data: rows.map((r) => ({ bailId: r.bailId })),
      skipDuplicates: true,
    });
    const doc = { ...summary, appliqueLe: new Date().toISOString(), lignesAjoutees: created.count };
    fs.mkdirSync(path.dirname(path.resolve(journal)), { recursive: true });
    fs.writeFileSync(journal, JSON.stringify(doc, null, 1));
    console.log(JSON.stringify({ hote: host, lignesAjoutees: created.count, journal }, null, 1));
    console.log('\nListe établie. Chaque dossier reste « non payé » tant qu’un administrateur ne l’a pas vérifié.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
