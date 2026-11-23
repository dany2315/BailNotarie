// Lance une commande Prisma UNIQUEMENT contre la copie DATABASE_MIGRATE_TEST.
// Toutes les variables de connexion sont imposées ; rien ne vient des valeurs par défaut du .env.
// Usage : node reports/prep-pr-main/prisma-on-copy.cjs diff | deploy | status
const { spawnSync } = require('child_process');
const { testUrl, root } = require('./db.cjs');
const url = testUrl();
const direct = url.replace('-pooler', '');
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: direct, DATABASE_URL_PROD: '', POSTGRES_URL_STAGING: '', DATABASE_MIGRATE_TEST: '' };
const mode = process.argv[2];
const cli = require('path').join(root, 'node_modules/prisma/build/index.js');
const args = mode === 'diff' ? [cli, 'migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', '--script']
  : mode === 'deploy' ? [cli, 'migrate', 'deploy']
  : mode === 'status' ? [cli, 'migrate', 'status']
  : null;
if (!args) { console.error('mode attendu : diff | deploy | status'); process.exit(2); }
const r = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', shell: false });
const scrub = s => (s || '').replace(/postgres(ql)?:\/\/[^\s"']+/g, '[url masquée]');
process.stdout.write(scrub(r.stdout)); process.stderr.write(scrub(r.stderr)); process.exit(r.status ?? 1);
