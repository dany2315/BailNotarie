// Vérification à l'écran des corrections M1, M2, M3, M5 et M10 (serveur reconstruit, copie de test, comptes fictifs).
const fs = require('fs');
const { R, texte, voir, toasts } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const out = [];
const note = (id, ok, detail) => { out.push({ id, ok, detail }); console.log((ok ? 'OK   ' : 'ÉCHEC') + ' ' + id + ' — ' + detail); };
const ecrire = () => fs.writeFileSync(__dirname + '/../v2c-resultats.json', JSON.stringify(out, null, 1));
const attendreToast = async (p, motif, ms = 30000) => { for (let i = 0; i < ms / 400; i++) { const t = (await toasts(p)).find((x) => motif.test(x)); if (t) return t; await R.attendre(400); } return null; };
const seul = (fn) => fn().catch((e) => note('ERREUR', false, String(e.message).split('\n')[0]));

(async () => {
  // ---------- M10 : réassignation d'un notaire ----------
  await seul(async () => {
    const bail = 'cmwjne2uk003tx12kjwdbairb';
    const avant = R.sql(`SELECT a.id, u.email FROM "DossierNotaireAssignment" a JOIN "User" u ON u.id=a."notaireId" WHERE a."bailId"='${bail}'`);
    const s = await R.ouvrir({ appareil: 'ordinateur', compte: 'recette-adm1-admin@example.invalid' });
    const p = s.page;
    await p.goto(R.BASE + '/interface/baux/' + bail, { waitUntil: 'domcontentloaded' });
    await voir(p, 'Suivi', 45000);
    await p.getByRole('button', { name: 'Plus' }).click();
    await p.getByRole('menuitem', { name: 'Assigner un notaire' }).click();
    const dlg = p.locator('[role=dialog]').last(); await dlg.waitFor();
    await dlg.getByText('Sélectionner un notaire').waitFor({ timeout: 40000 }); await R.attendre(600);
    await dlg.getByRole('combobox').nth(1).click();
    await p.getByRole('option', { name: 'Maître Recette ADM-1 2', exact: true }).click(); await R.attendre(400);
    await dlg.getByRole('button', { name: 'Assigner', exact: true }).click();
    const msg = await attendreToast(p, /assign|Erreur/i);
    await R.attendre(2000);
    const apres = R.sql(`SELECT a.id, u.email FROM "DossierNotaireAssignment" a JOIN "User" u ON u.id=a."notaireId" WHERE a."bailId"='${bail}'`);
    await R.capture(p, 'ORCH', 'v-m10-reassignation', { entiere: false });
    await s.fermer();
    const n1 = await R.ouvrir({ appareil: 'ordinateur', compte: 'recette-adm1-notaire1@example.invalid' });
    await n1.page.goto(R.BASE + '/notaire/dossiers?dossierId=' + avant[0].id, { waitUntil: 'domcontentloaded' }); await R.attendre(6000);
    const adresse = R.sql(`SELECT pr."fullAddress" FROM "Bail" b JOIN "Property" pr ON pr.id=b."propertyId" WHERE b.id='${bail}'`)[0].fullAddress;
    const voitEncore = (await texte(n1.page)).includes(adresse);
    const zip = await n1.page.request.get(R.BASE + `/api/notaire/dossiers/${avant[0].id}/zip`, { failOnStatusCode: false });
    await n1.fermer();
    note('M10', apres.length === avant.length && apres.every((a) => /notaire2/.test(a.email)) && !voitEncore && zip.status() === 403,
      `avant : ${JSON.stringify(avant.map((a) => a.email))} ; message « ${msg} » ; après : ${JSON.stringify(apres.map((a) => a.email))} (même ligne : ${apres[0]?.id === avant[0].id}) ; l'ancien notaire voit encore le dossier : ${voitEncore} ; archive zip pour lui : ${zip.status()}`);
  });
  ecrire();
})();
