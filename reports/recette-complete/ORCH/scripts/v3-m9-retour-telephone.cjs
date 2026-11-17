// Vérification de M9 : le geste « retour » du téléphone recule d'une étape dans les formulaires (Android et iPhone).
const fs = require('fs');
const { R, texte, voir, passerBarriere } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const F = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/formulaire.cjs');
const out = [];
const note = (id, ok, detail) => { out.push({ id, ok, detail }); console.log((ok ? 'OK   ' : 'ÉCHEC') + ' ' + id + ' — ' + detail); };
const etape = async (p) => ((await texte(p)).match(/Étape (\d)\/4/) || [])[1] || '?';
const chemin = (p) => new URL(p.url()).pathname;

async function locataire(appareil, jeton) {
  const lien = R.sql(`SELECT p.email FROM "IntakeLink" i JOIN "Person" p ON p."clientId"=i."clientId" AND p."isPrimary" WHERE i.token='${jeton}' AND i.status='PENDING'`)[0];
  if (!lien) return note('M9-' + appareil, false, 'formulaire de test introuvable');
  const s = await R.ouvrir({ appareil });
  const p = s.page;
  await p.goto(R.BASE + '/', { waitUntil: 'domcontentloaded' }); await R.attendre(1500);
  await p.goto(R.BASE + '/intakes/' + jeton, { waitUntil: 'domcontentloaded' });
  await passerBarriere(p, lien.email);
  await voir(p, /Voici le bien/, 45000); await R.attendre(1200);
  await p.evaluate(() => { window.__recetteMarque = 'pas de rechargement'; });
  await F.continuer(p); await voir(p, 'Qui êtes-vous'); await R.attendre(800);
  await F.continuer(p); await voir(p, /Étape 3\/4/, 30000); await R.attendre(1200);
  const e0 = await etape(p);
  const suite = [];
  for (let i = 0; i < 3; i++) {
    await p.goBack({ waitUntil: 'commit', timeout: 15000 }).catch(() => {});
    await R.attendre(2500);
    suite.push({ adresse: chemin(p), etape: chemin(p).startsWith('/intakes/') ? await etape(p) : '-', marque: await p.evaluate(() => window.__recetteMarque || null).catch(() => null) });
  }
  await R.capture(p, 'ORCH', 'v-m9-' + appareil, { entiere: false });
  const ok = e0 === '3' && suite[0].etape === '2' && suite[1].etape === '1' && suite[0].marque && suite[1].marque && suite[2].adresse === '/';
  note('M9-locataire-' + appareil, ok, `départ étape ${e0} ; retour 1 → ${JSON.stringify(suite[0])} ; retour 2 → ${JSON.stringify(suite[1])} ; retour 3 → ${JSON.stringify(suite[2])}`);

  // Flèche du formulaire puis geste : un seul geste suffit pour quitter depuis la première étape
  await p.goto(R.BASE + '/', { waitUntil: 'domcontentloaded' }); await R.attendre(1000);
  await p.goto(R.BASE + '/intakes/' + jeton, { waitUntil: 'domcontentloaded' });
  await voir(p, /Voici le bien/, 45000); await R.attendre(1200);
  await F.continuer(p); await voir(p, 'Qui êtes-vous'); await R.attendre(800);
  await F.retour(p); await voir(p, /Étape 1\/4/, 15000); await R.attendre(1500);
  await p.goBack({ waitUntil: 'commit', timeout: 15000 }).catch(() => {}); await R.attendre(2500);
  note('M9-fleche-puis-geste-' + appareil, chemin(p) === '/', `après la flèche vers l'étape 1, un geste retour mène à ${chemin(p)}`);
  console.log('journal', JSON.stringify({ erreursPage: s.journal.erreursPage.length, e5xx: s.journal.reponses5xx.length }));
  await s.fermer();
}

(async () => {
  try { await locataire('telephone', '00da7ab8-a0e5-4f69-a923-1acccd3ffdd3'); } catch (e) { note('M9-telephone', false, String(e.message).split('\n')[0]); }
  try { await locataire('iphone', '47c4db73-9574-41b0-9bde-f7d300167ab3'); } catch (e) { note('M9-iphone', false, String(e.message).split('\n')[0]); }
  fs.writeFileSync(__dirname + '/../v3-resultats.json', JSON.stringify(out, null, 1));
})();
