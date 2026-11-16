// Requête en lecture seule sur la copie : node reports/prep-pr-main/q.cjs "SELECT ..."
const { client } = require('./db.cjs');
(async () => { const p = client(); try {
  const rows = await p.$transaction(async tx => { await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY'); return tx.$queryRawUnsafe(process.argv[2]); });
  console.log(JSON.stringify(rows, (_, v) => typeof v === 'bigint' ? Number(v) : v, 1));
} finally { await p.$disconnect(); } })().catch(e => { console.error(e.message); process.exit(1); });
