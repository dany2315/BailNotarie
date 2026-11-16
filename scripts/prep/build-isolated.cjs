// Build de production ISOLÉ : `next build` seul (jamais `vercel-build`, qui lance les migrations).
// Aucun secret réel : toutes les clés de services sont factices, la base est la copie de test.
const { spawnSync } = require('child_process');
const path = require('path');
const { env, root } = require('./isolated-env.cjs');
const r = spawnSync(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build'], { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const scrub = (s) => (s || '').replace(/postgres(ql)?:\/\/[^\s"']+/g, '[url masquée]');
process.stdout.write(scrub(r.stdout)); process.stderr.write(scrub(r.stderr));
console.log('\nBUILD_EXIT=' + r.status);
process.exit(r.status ?? 1);
