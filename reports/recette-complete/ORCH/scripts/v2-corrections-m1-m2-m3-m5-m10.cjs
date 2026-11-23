// Vérification à l'écran des corrections M1, M2, M3, M5 et M10 (serveur reconstruit, copie de test, comptes fictifs).
const fs = require('fs');
const { R, texte, voir, toasts } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const out = [];
const note = (id, ok, detail) => { out.push({ id, ok, detail }); console.log((ok ? 'OK   ' : 'ÉCHEC') + ' ' + id + ' — ' + detail); };
const ecrire = () => fs.writeFileSync(__dirname + '/../v2-resultats.json', JSON.stringify(out, null, 1));
const attendreToast = async (p, motif, ms = 30000) => { for (let i = 0; i < ms / 400; i++) { const t = (await toasts(p)).find((x) => motif.test(x)); if (t) return t; await R.attendre(400); } return null; };
const seul = (fn) => fn().catch((e) => note('ERREUR', false, String(e.message).split('\n')[0]));

(async () => {
  // ---------- M2 + M3 : confidentialité de la messagerie ----------
  await seul(async () => {
    const bail = 'cmwjnfdzv000ox19cl5myq9sk';
    const proprioFil = ['recette-message-notaire-714p.pdf', 'recette-reponse-proprio-714p.pdf'], locataireFil = ['recette-message-notaire-locataire-ihr9.pdf'];
    const cle = (label) => R.sql(`SELECT "fileKey" FROM "Document" WHERE label='${label}'`)[0].fileKey;
    for (const [qui, email, autres, siens, chemin] of [
      ['locataire', 'recette-not-locataire1@example.invalid', proprioFil, locataireFil, '/client/locataire/baux/' + bail],
      ['propriétaire', 'recette-not-proprio1@example.invalid', locataireFil, proprioFil, '/client/proprietaire/baux/' + bail],
    ]) {
      const s = await R.ouvrir({ appareil: 'ordinateur', compte: email });
      const p = s.page;
      const api = await p.request.get(R.BASE + `/api/bail/${bail}/messages`, { failOnStatusCode: false });
      const msgs = api.ok() ? await api.json() : [];
      const fuite = msgs.filter((m) => m.document && autres.includes(m.document.label)).length;
      note('M3-' + qui, api.ok() && fuite === 0, `API des messages : ${api.status()}, ${msgs.length} message(s), fichiers de l'autre fil : ${fuite}`);
      await p.goto(R.BASE + chemin, { waitUntil: 'domcontentloaded' }); await R.attendre(6000);
      const t = await texte(p);
      const vus = autres.filter((l) => t.includes(l.replace(/\.pdf$/, '')));
      const acces = [];
      for (const l of autres) { const r = await p.request.post(R.BASE + '/api/blob/get-signed-url', { data: { fileKey: cle(l) }, failOnStatusCode: false }); acces.push(r.status()); }
      const sien = await p.request.post(R.BASE + '/api/blob/get-signed-url', { data: { fileKey: cle(siens[0]) }, failOnStatusCode: false });
      note('M2-' + qui, vus.length === 0 && acces.every((x) => x === 403) && sien.ok(), `page du bail : fichiers de l'autre fil affichés ${JSON.stringify(vus)} ; accès direct à ces fichiers ${JSON.stringify(acces)} ; son propre fichier ${sien.status()}`);
      await R.capture(p, 'ORCH', 'v-m2-pieces-' + qui);
      await s.fermer();
    }
  });
  ecrire();

  // ---------- M1 : refus du serveur en français (ajout d'un locataire avec l'adresse du propriétaire) ----------
  await seul(async () => {
    const bail = 'cmwjndp22000ux12k78p6ddjg', proprio = 'recette-adm1-proprio2@example.invalid';
    const s = await R.ouvrir({ appareil: 'ordinateur', compte: proprio });
    const p = s.page;
    await p.goto(R.BASE + '/client/proprietaire/baux/' + bail, { waitUntil: 'domcontentloaded' });
    await p.getByRole('button', { name: 'Ajouter le locataire' }).first().click();
    const dlg = p.getByRole('dialog'); await dlg.waitFor(); await R.attendre(800);
    await dlg.locator('input[type=email]').fill(proprio); await R.attendre(800);
    await dlg.locator('#tenant-effective-date').fill('2027-04-01'); await dlg.locator('#tenant-payment-day').fill('6'); await R.attendre(400);
    await dlg.getByRole('button', { name: 'Ajouter le locataire' }).click();
    const t = await attendreToast(p, /./);
    await R.attendre(800);
    const tous = (await toasts(p)).join(' | ');
    note('M1-ajout-locataire', !!t && !/Server Components|An error occurred|digest/i.test(tous) && /locataire|propriétaire|email|adresse/i.test(tous), `message affiché : « ${tous} »`);
    await R.capture(p, 'ORCH', 'v-m1-message-francais', { entiere: false });
    await s.fermer();
  });
  ecrire();

  // ---------- M5 : date de fin recalculée depuis la fiche de l'équipe ----------
  await seul(async () => {
    const bail = 'cmwjnevox003ux1a4qss42ymb';
    const s = await R.ouvrir({ appareil: 'ordinateur', compte: 'recette-adm2-admin@example.invalid' });
    const p = s.page;
    await p.goto(R.BASE + '/interface/baux/' + bail, { waitUntil: 'domcontentloaded' });
    await voir(p, 'Type et durée', 45000);
    const bouton = p.locator('#bloc-bail').getByRole('button', { name: 'Modifier : Type et durée' }).first();
    await bouton.scrollIntoViewIfNeeded(); await bouton.click();
    const dlg = p.locator('[role=dialog]').last(); await dlg.waitFor(); await R.attendre(600);
    const champFin = /Date de fin/.test(await dlg.innerText());
    await dlg.getByLabel('Type de bail').click(); await p.getByRole('option', { name: 'Bail meublé 9 mois' }).first().click(); await R.attendre(400);
    await dlg.getByRole('button', { name: 'Enregistrer' }).click();
    const msg = await attendreToast(p, /enregistr|Erreur|impossible/i);
    let fin = null;
    for (let i = 0; i < 30; i++) { fin = R.sql(`SELECT "bailType", to_char("endDate",'YYYY-MM-DD') fin FROM "Bail" WHERE id='${bail}'`)[0]; if (fin.bailType === 'BAIL_MEUBLE_9_MOIS') break; await R.attendre(1000); }
    await p.reload({ waitUntil: 'domcontentloaded' }); await voir(p, 'Type et durée', 45000);
    const ligne = ((await texte(p)).match(/Type et durée\n[^\n]*\n[^\n]*/) || [''])[0].replace(/\n/g, ' · ');
    note('M5-fiche', !champFin && fin.bailType === 'BAIL_MEUBLE_9_MOIS' && fin.fin === '2027-11-01' && /01\/11\/2027/.test(ligne),
      `champ « Date de fin » dans la fenêtre : ${champFin} ; message « ${msg} » ; en base ${fin.bailType}, fin ${fin.fin} ; fiche : « ${ligne} »`);
    await R.capture(p, 'ORCH', 'v-m5-date-de-fin-recalculee', { entiere: false });
    await s.fermer();
  });
  ecrire();

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
    const dlg = p.locator('[role=dialog]').last(); await dlg.waitFor(); await R.attendre(800);
    await dlg.getByRole('combobox').first().click();
    await p.getByRole('option').filter({ hasText: /ADM-1 2/ }).first().click(); await R.attendre(400);
    await dlg.getByRole('button', { name: /Assigner|Valider|Enregistrer|Confirmer/ }).last().click();
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
