// Connexion à la SEULE base autorisée pour les essais : DATABASE_MIGRATE_TEST.
// Le worktree n'a pas de fichier .env : l'adresse est lue dans le .env du dossier principal, et seule
// cette variable est utilisée. Toute cible identique à staging/production, ou différente de la copie
// enregistrée par l'audit du 16/11/2026, est refusée.
const fs = require('fs'), path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

const root = path.resolve(__dirname, '..', '..');
// .claude/worktrees/<nom>/scripts/prep → dossier principal du dépôt
const mainCheckout = process.env.PREP_MAIN_CHECKOUT || path.resolve(root, '..', '..', '..');
const env = dotenv.parse(fs.readFileSync(path.join(mainCheckout, '.env')));
const target = (s) => { const u = new URL(s); return u.hostname.replace('-pooler', '') + u.pathname; };

function testUrl() {
  const url = env.DATABASE_MIGRATE_TEST;
  if (!url) throw Error('DATABASE_MIGRATE_TEST absent');
  const baseline = JSON.parse(fs.readFileSync(path.join(mainCheckout, 'reports/migration-audit-20261116-1794828329442/before.json')));
  if (target(url) !== baseline.target) throw Error('Cible différente de la copie enregistrée par l’audit');
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'DATABASE_URL_PROD', 'POSTGRES_URL_STAGING']) {
    const other = env[key];
    if (!other) continue;
    let same = false;
    try { same = target(other) === target(url); } catch { /* valeur non-URL : ignorée */ }
    if (same) throw Error(`Cible identique à ${key} : refusée`);
  }
  return url;
}

const client = () => new PrismaClient({ datasourceUrl: testUrl(), log: [] });
module.exports = { testUrl, client, target, root, mainCheckout };
