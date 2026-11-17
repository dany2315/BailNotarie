// Vérification à l'écran de M12 (notaire avec une adresse déjà utilisée), M13 (lien de formulaire créé par l'équipe),
// M14 (« Nouveau client complet » avec les seuls champs obligatoires) et M15 (e-mail unique de reconfirmation).
// Serveur de recette reconstruit, base de test, comptes fictifs ; les e-mails et tâches de fond vont aux doublures locales.
const fs = require('fs');
const { R, texte, voir, toasts, passerBarriere } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const out = [];
const note = (id, ok, detail) => { out.push({ id, ok, detail }); console.log((ok ? 'OK   ' : 'ÉCHEC') + ' ' + id + ' — ' + detail); };
const ecrire = () => fs.writeFileSync(__dirname + '/../v5-resultats.json', JSON.stringify(out, null, 1));
const attendreToast = async (p, motif, ms = 40000) => { for (let i = 0; i < ms / 400; i++) { const t = (await toasts(p)).find((x) => motif.test(x)); if (t) return t; await R.attendre(400); } return null; };
const seul = (fn) => fn().catch((e) => note('ERREUR', false, String(e.message).split('\n')[0]));
const ADMIN = 'recette-adm1-admin@example.invalid';
const sfx = Date.now().toString(36).slice(-5);

(async () => {
  // ---------- M12 ----------
  await seul(async () => {
    const cible = 'recette-not-locataire1@example.invalid';
    const s = await R.ouvrir({ appareil: 'ordinateur', compte: ADMIN });
    const p = s.page; const dlg = p.locator('[role=dialog]');
    await p.goto(R.BASE + '/interface/notaires', { waitUntil: 'domcontentloaded' }); await voir(p, 'Gestion des comptes notaires', 45000);
    const essai = async (email) => {
      await p.getByRole('button', { name: /Créer un notaire|Nouveau notaire|Ajouter/ }).first().click(); await dlg.waitFor();
      await dlg.locator('#email').fill(email); await dlg.locator('#name').fill('Maître Vérification');
      await dlg.locator('button[type=submit]').click();
      const msg = await attendreToast(p, /./);
      return msg;
    };
    const msgClient = await essai(cible);
    await R.capture(p, 'ORCH', 'v-m12-adresse-client', { entiere: false });
    const role = R.sql(`SELECT role FROM "User" WHERE email='${cible}'`)[0].role;
    note('M12-compte-client', /compte client/.test(msgClient || '') && role === 'UTILISATEUR', `message « ${msgClient} » ; rôle du compte après : ${role}`);
    await p.keyboard.press('Escape'); await R.attendre(800);
    const neuf = `recette-v5-notaire-${sfx}@example.invalid`;
    const msgNeuf = await essai(neuf); await R.attendre(1500);
    const cree = R.sql(`SELECT role FROM "User" WHERE email='${neuf}'`)[0];
    note('M12-adresse-neuve', cree?.role === 'NOTAIRE', `message « ${msgNeuf} » ; compte créé : ${cree?.role || 'non'}`);
    await s.fermer();
  });
  ecrire();

  // ---------- M13 ----------
  await seul(async () => {
    const bail = 'cmwjnds0m001gx12k5aramujs';
    const locataire = 'recette-adm1-locataire3@example.invalid';
    const s = await R.ouvrir({ appareil: 'ordinateur', compte: ADMIN });
    const p = s.page; const t0 = new Date();
    await p.goto(R.BASE + '/interface/intakes/new', { waitUntil: 'domcontentloaded' }); await p.locator('label[for="target"]').waitFor({ timeout: 45000 });
    const combos = p.locator('form button[role=combobox]');
    await combos.nth(0).click(); await p.getByRole('option', { name: 'Locataire' }).click(); await R.attendre(300);
    await combos.nth(1).click(); await p.getByRole('option', { name: 'Logement recette ADM-1 3' }).first().click(); await R.attendre(300);
    await combos.nth(2).click(); await p.getByRole('option', { name: new RegExp('#' + bail.slice(-8)) }).first().click(); await R.attendre(300);
    await p.getByRole('button', { name: 'Créer le lien' }).click();
    const msg = await attendreToast(p, /Lien d'intake créé|Erreur|error|bail|locataire/i);
    await R.attendre(2500);
    const lien = R.sql(`SELECT token, target, "bailId", "clientId", "propertyId" FROM "IntakeLink" WHERE "bailId"='${bail}' AND target='TENANT' AND "createdAt" >= '${t0.toISOString()}' ORDER BY "createdAt" DESC`)[0];
    const locId = R.sql(`SELECT "clientId" FROM "Person" WHERE email='${locataire}' AND "isPrimary"`)[0]?.clientId;
    await s.fermer();
    let ouvre = 'non testé';
    if (lien) {
      const v = await R.ouvrir({ appareil: 'telephone' });
      await v.page.goto(R.BASE + '/intakes/' + lien.token, { waitUntil: 'domcontentloaded' });
      await passerBarriere(v.page, locataire).catch(() => {});
      await R.attendre(8000);
      const t = await texte(v.page);
      ouvre = /aucun dossier/i.test(t) ? 'NON : « rattaché à aucun dossier »' : /Voici le bien|Qui êtes-vous|Étape/.test(t) ? 'oui, le formulaire du locataire s’affiche' : 'incertain : ' + t.slice(0, 160).replace(/\s+/g, ' ');
      await R.capture(v.page, 'ORCH', 'v-m13-lien-ouvert', { entiere: false });
      await v.fermer();
    }
    note('M13', !!lien && lien.clientId === locId && /^oui/.test(ouvre), `message « ${msg} » ; lien : ${lien ? `bail ${lien.bailId === bail ? 'choisi' : lien.bailId}, locataire du bail ${lien.clientId === locId ? 'rattaché' : 'NON'}` : 'AUCUN'} ; ouverture par le locataire : ${ouvre}`);
  });
  ecrire();

  // ---------- M14 ----------
  await seul(async () => {
    const s = await R.ouvrir({ appareil: 'ordinateur', compte: ADMIN });
    const p = s.page;
    await p.goto(R.BASE + '/interface/clients/new', { waitUntil: 'domcontentloaded' }); await p.locator('#firstName').waitFor({ timeout: 45000 }); await R.attendre(800);
    const email = `recette-v5-minimal-${sfx}@example.invalid`;
    await p.locator('#firstName').fill('Aline'); await p.locator('#lastName').fill('MinimalV5'); await p.locator('#email').fill(email);
    await p.locator('#propertyFullAddress').fill('14 Place Bonnyaud 23000 Guéret');
    await p.locator('input[name="bailRentAmount"]').fill('650');
    await p.locator('#bailEffectiveDate').fill('01/02/2027'); await p.locator('#bailEffectiveDate').blur();
    s.journal.reponses5xx.length = 0;
    await p.getByRole('button', { name: 'Créer le client complet' }).click();
    const msg = await attendreToast(p, /./);
    await R.attendre(3000);
    const cree = R.sql(`SELECT c.id, pe."firstName", pe.profession, pe.phone FROM "Person" pe JOIN "Client" c ON c.id=pe."clientId" WHERE pe.email='${email}'`)[0];
    const bien = cree && R.sql(`SELECT id FROM "Property" WHERE "ownerId"='${cree.id}'`)[0];
    await R.capture(p, 'ORCH', 'v-m14-client-complet-minimal', { entiere: false });
    note('M14', !!cree && !!bien && s.journal.reponses5xx.length === 0, `message « ${msg} » ; client créé : ${cree ? 'oui (profession, téléphone vides, à compléter par le client)' : 'non'} ; bien créé : ${bien ? 'oui' : 'non'} ; réponses 5xx : ${s.journal.reponses5xx.length}`);
    await s.fermer();
  });
  ecrire();

  // ---------- M15 ----------
  await seul(async () => {
    const bail = 'cmwjndvy90028x12k2wa2w6zs';
    const avant = R.sql(`SELECT "rentAmount", "tenantConfirmedTermsAt" IS NOT NULL accord FROM "Bail" WHERE id='${bail}'`)[0];
    const s = await R.ouvrir({ appareil: 'ordinateur', compte: ADMIN });
    const p = s.page; const t0 = new Date();
    await p.goto(R.BASE + '/interface/baux/' + bail, { waitUntil: 'domcontentloaded' }); await voir(p, 'Type et durée', 45000);
    const boutons = await p.locator('#bloc-bail').getByRole('button', { name: /^Modifier : / }).evaluateAll((b) => b.map((x) => x.getAttribute('aria-label') || x.innerText));
    const bouton = p.locator('#bloc-bail').getByRole('button', { name: /^Modifier : .*(Loyer|loyer|Montant|Conditions financières)/ }).first();
    await bouton.scrollIntoViewIfNeeded(); await bouton.click();
    const dlg = p.locator('[role=dialog]').last(); await dlg.waitFor(); await R.attendre(600);
    const champ = dlg.getByLabel(/^Loyer/).first();
    const nouveau = String(Number(avant.rentAmount) + 15);
    await champ.fill(nouveau);
    await dlg.getByRole('button', { name: 'Enregistrer' }).click();
    const msg = await attendreToast(p, /enregistr|Erreur|impossible/i);
    await R.attendre(4000);
    const apres = R.sql(`SELECT "rentAmount", "tenantConfirmedTermsAt" IS NOT NULL accord, "tenantReconfirmationRequestedAt" FROM "Bail" WHERE id='${bail}'`)[0];
    await R.capture(p, 'ORCH', 'v-m15-loyer-modifie', { entiere: false });
    // Seconde modification pendant que la demande est en cours : aucun second e-mail
    await bouton.click(); const dlg2 = p.locator('[role=dialog]').last(); await dlg2.waitFor(); await R.attendre(600);
    await dlg2.getByLabel(/^Loyer/).first().fill(String(Number(nouveau) + 5));
    await dlg2.getByRole('button', { name: 'Enregistrer' }).click(); await attendreToast(p, /enregistr|Erreur|impossible/i); await R.attendre(4000);
    const ev = R.evenements({ depuis: t0 }).filter((e) => e.name === 'email/tenant-reconfirmation.send' && e.data?.bailId === bail);
    note('M15', avant.accord && !apres.accord && !!apres.tenantReconfirmationRequestedAt && ev.length === 1,
      `boutons : ${boutons.join(' | ')} ; loyer ${avant.rentAmount} → ${apres.rentAmount}, message « ${msg} » ; accord du locataire retiré : ${avant.accord && !apres.accord} ; événements « e-mail de reconfirmation » après deux modifications : ${ev.length} ${JSON.stringify(ev.map((e) => ({ id: e.id, data: e.data })))}`);
    await s.fermer();
  });
  ecrire();
})();
