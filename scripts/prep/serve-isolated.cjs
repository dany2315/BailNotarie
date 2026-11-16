// Serveur de vérification ISOLÉ (après build-isolated) : `next start` sur le port 3210, clés factices,
// base = copie de test. Sert uniquement à regarder les écrans dans le navigateur intégré.
const { spawn } = require('child_process');
const path = require('path');
const { env, root } = require('./isolated-env.cjs');
const port = process.env.PORT || '3210';
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', port], {
  cwd: root,
  env: { ...env, NEXT_PUBLIC_URL: `http://localhost:${port}`, BETTER_AUTH_URL: `http://localhost:${port}` },
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
