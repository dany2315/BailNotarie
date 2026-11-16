// Empreinte de la copie de test, table par table (lecture seule) : nombre de lignes + SHA-256 des valeurs.
// Aucune valeur personnelle n'est écrite dans le fichier, seulement des empreintes.
//
//   node scripts/prep/fingerprint.cjs <sortie.json>                 → empreinte de toutes les colonnes
//   node scripts/prep/fingerprint.cjs <sortie.json> <reference.json> → mêmes tables et colonnes que la
//       référence (pour comparer les ANCIENNES colonnes après une migration qui en ajoute), puis comparaison.
const fs = require('fs'), crypto = require('crypto');
const { client } = require('./db.cjs');

const hash = (x) => crypto.createHash('sha256').update(JSON.stringify(x, (_, v) => (typeof v === 'bigint' ? v.toString() : v))).digest('hex');
const quote = (x) => '"' + x.replaceAll('"', '""') + '"';

(async () => {
  const [out, refPath] = process.argv.slice(2);
  if (!out) throw Error('fichier de sortie attendu');
  const ref = refPath ? JSON.parse(fs.readFileSync(refPath, 'utf8')) : null;
  const prisma = client();
  try {
    const snapshot = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const result = {};
      const tables = await tx.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
      for (const { table_name: table } of tables) {
        if (ref && !ref.tables[table]) { result[table] = { added: true }; continue; }
        const cols = ref
          ? ref.tables[table].columns
          : (await tx.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${table.replaceAll("'", "''")}' ORDER BY column_name`)).map((c) => c.column_name);
        const rows = await tx.$queryRawUnsafe(`SELECT ${cols.map(quote).join(', ')} FROM ${quote(table)}`);
        result[table] = { columns: cols, count: rows.length, hash: hash(rows.map(hash).sort()) };
      }
      return result;
    }, { timeout: 120000, isolationLevel: 'RepeatableRead' });
    const doc = { createdAt: new Date().toISOString(), tables: snapshot };
    fs.writeFileSync(out, JSON.stringify(doc, null, 1));
    if (ref) {
      const diff = [];
      for (const [table, before] of Object.entries(ref.tables)) {
        const after = snapshot[table];
        if (!after) diff.push(`${table} : table disparue`);
        else if (after.count !== before.count || after.hash !== before.hash) diff.push(`${table} : ${before.count} → ${after.count} lignes, valeurs ${after.hash === before.hash ? 'identiques' : 'DIFFÉRENTES'}`);
      }
      const added = Object.entries(snapshot).filter(([, v]) => v.added).map(([k]) => k);
      console.log(JSON.stringify({ tablesComparees: Object.keys(ref.tables).length, identiques: diff.length === 0, ecarts: diff, nouvellesTables: added }, null, 1));
    } else {
      console.log(JSON.stringify({ tables: Object.keys(snapshot).length, lignes: Object.values(snapshot).reduce((n, t) => n + t.count, 0) }));
    }
  } finally { await prisma.$disconnect(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
