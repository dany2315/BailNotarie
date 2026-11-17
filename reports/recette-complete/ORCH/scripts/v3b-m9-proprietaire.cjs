const fs = require('fs');
const { R, texte, voir } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const d = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/kit/donnees-ADM-1.json').dossiers[0];
const etape = async (p) => ((await texte(p)).match(/Étape (\d+)\/(\d+)/) || [])[1] || '?';
const continuer = async (p) => { const b = p.getByRole('button', { name: /^Continuer$/ }).last(); await b.waitFor(); for (let i = 0; i < 60 && (await b.isDisabled()); i++) await R.attendre(500); await b.click(); };
(async () => {
  const s = await R.ouvrir({ appareil: 'telephone', compte: d.proprietaire.email });
  const p = s.page;
  await p.goto(R.BASE + '/client', { waitUntil: 'domcontentloaded' }); await R.attendre(2500);
  await p.goto(R.BASE + d.proprietaire.formulaire, { waitUntil: 'domcontentloaded' });
  await voir(p, /Étape \d+\/\d+/, 45000); await R.attendre(2000);
  const e0 = await etape(p);
  await p.evaluate(() => { window.__marque = 1; });
  // Le formulaire reprend à l'étape où le propriétaire s'était arrêté : on recule à partir de là
  const e1 = e0, e2 = e0;
  const res = [];
  for (let i = 0; i < 2; i++) { await p.goBack({ waitUntil: 'commit', timeout: 15000 }).catch(() => {}); await R.attendre(2500); res.push({ adresse: new URL(p.url()).pathname.slice(0, 30), etape: await etape(p).catch(() => '-'), marque: await p.evaluate(() => window.__marque || null).catch(() => null) }); }
  await R.capture(p, 'ORCH', 'v-m9-proprietaire-telephone', { entiere: false });
  const ok = Number(res[0].etape) < Number(e0) && Number(res[1].etape) < Number(res[0].etape) && res[0].marque === 1 && res[1].marque === 1 && res.every((r) => r.adresse.startsWith('/commencer/'));
  console.log((ok ? 'OK   ' : 'ÉCHEC') + ` M9-proprietaire-telephone — reprise à l'étape ${e0} ; retour 1 → ${JSON.stringify(res[0])} ; retour 2 → ${JSON.stringify(res[1])}`);
  fs.writeFileSync(__dirname + '/../v3b-resultats.json', JSON.stringify({ ok, e0, e1, e2, res }, null, 1));
  await s.fermer();
})().catch((e) => console.log('ÉCHEC M9-proprietaire — ' + String(e.message).split('\n')[0]));
