// Haut de page des sous-pages de l'espace client sur téléphone : capture de « Pièces demandées » et de l'accueil,
// et couleur relevée en haut (sous la barre du site) et juste sous le fil d'Ariane. Lecture seule.
const { R } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const OUT = 'C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/ORCH/captures/';
const SUFFIX = process.env.SUFFIX || 'avant';
(async () => {
  const s = await R.ouvrir({ appareil: 'telephone', compte: 'recette-com-proprio6@example.invalid' });
  const p = s.page;
  for (const [nom, url] of [['accueil', '/client/proprietaire'], ['demande', '/client/proprietaire/demande/cmwkdcg7y013jx100o1g2d30e']]) {
    await p.goto(R.BASE + url, { waitUntil: 'domcontentloaded' });
    await R.attendre(6000);
    await p.screenshot({ path: `${OUT}v14-${nom}-${SUFFIX}.png` });
  }
  await s.fermer();
  console.log('ok');
})().catch((e) => console.log('ÉCHEC', String(e.message).split('\n')[0]));
