// Connexion du notaire par code, comme une vraie personne : e-mail, code lu dans la doublure des e-mails,
// « Se connecter », puis ce qui s'affiche seconde après seconde (adresse, texte visible, erreurs).
const fs = require('fs');
const { R } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const MAILS = process.env.RECETTE_DIR + '/emails.jsonl';
const EMAIL = process.env.EMAIL || 'recette-adm1-notaire2@example.invalid';
const OUT = 'C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/ORCH/captures/';
const lignes = () => fs.readFileSync(MAILS, 'utf8').trim().split('\n');

(async () => {
  const s = await R.ouvrir({ appareil: process.env.APPAREIL || 'telephone' });
  const p = s.page;
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message).slice(0, 160)));
  p.on('console', (m) => { if (m.type() === 'error') erreurs.push('console: ' + m.text().slice(0, 160)); });
  await p.goto(R.BASE + '/notaire/login', { waitUntil: 'domcontentloaded' });
  const avant = lignes().length;
  await p.locator('input[type=email]').first().fill(EMAIL);
  await p.getByRole('button', { name: /code|continuer|recevoir/i }).first().click();
  let code = null;
  for (let i = 0; i < 40 && !code; i++) {
    await R.attendre(500);
    const neufs = lignes().slice(avant).map((l) => JSON.parse(l)).filter((m) => JSON.stringify(m.to).includes(EMAIL));
    const m = neufs.pop();
    if (m) code = (String(m.text || m.html).match(/\b(\d{6})\b/) || [])[1];
  }
  if (!code) throw Error('code non reçu');
  await p.locator('input[autocomplete=one-time-code], input[inputmode=numeric]').first().click();
  await p.keyboard.type(code, { delay: 40 });
  await p.getByRole('button', { name: /connecter/i }).first().click();
  for (let t = 1; t <= 12; t++) {
    await R.attendre(1000);
    const visible = (await p.evaluate(() => document.body.innerText).catch(() => '')).replace(/\s+/g, ' ').trim();
    console.log(JSON.stringify({ t, url: p.url().replace(R.BASE, ''), texte: visible.slice(0, 90) }));
    if (t === 3) await p.screenshot({ path: OUT + 'v15-connexion-notaire-3s.png' });
  }
  console.log(JSON.stringify({ erreurs: erreurs.slice(0, 8), r5xx: s.journal.reponses5xx }));
  await s.fermer();
})().catch((e) => console.log('ÉCHEC', String(e.message).split('\n')[0]));
