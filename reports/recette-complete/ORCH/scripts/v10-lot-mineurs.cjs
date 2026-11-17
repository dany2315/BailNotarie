// Lot du 17/11 au soir, à l'écran : m15 (/login), m13 + m1 + m3 + m4 (« Nouveau client complet »),
// m16 (récapitulatif du locataire d'un bail commercial), m13 + m14 (formulaire propriétaire).
// Uniquement des comptes et dossiers fictifs de la recette (@example.invalid) ; rien n'est créé quand un envoi est refusé.
const { R, voir, toasts, passerBarriere } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const CAP = `${__dirname}/../captures`;
const attendreToast = async (p, motif, ms = 20000) => { for (let i = 0; i < ms / 400; i++) { const t = (await toasts(p)).find((x) => motif.test(x)); if (t) return t; await R.attendre(400); } return (await toasts(p)).join(' | ') || null; };
const optionsDe = async (p, declencheur) => {
  await declencheur.click(); await R.attendre(500);
  const opts = await p.locator('[role=option]').allInnerTexts();
  await p.keyboard.press('Escape'); await R.attendre(300);
  return opts.map((o) => o.trim());
};
const sortie = (o) => console.log(JSON.stringify(o));

(async () => {
  // 1. /login vide (m15)
  {
    const s = await R.ouvrir({ appareil: 'ordinateur' });
    const p = s.page;
    await p.goto(R.BASE + '/login', { waitUntil: 'domcontentloaded' });
    await p.getByRole('button', { name: /connexion|connecter/i }).first().waitFor({ timeout: 45000 });
    await R.attendre(1500);
    await p.getByRole('button', { name: /connexion|connecter/i }).first().click();
    const vide = await attendreToast(p, /adresse e-mail|Indiquez/i);
    await p.locator('input[type=email], input[name=email], #email').first().fill('inconnu-recette@example.invalid');
    await p.locator('input[type=password]').first().fill('mauvais-mot-de-passe');
    await p.getByRole('button', { name: /connexion|connecter/i }).first().click();
    const refus = await attendreToast(p, /incorrect|Erreur/i);
    await p.screenshot({ path: `${CAP}/v10-m15-login.png` });
    sortie({ ecran: '/login', champsVides: vide, compteInconnu: refus, anglais: /Invalid|fill out/i.test(`${vide} ${refus}`) });
    await s.fermer();
  }

  // 2. Nouveau client complet (m13, m1, m3, m4)
  {
    const s = await R.ouvrir({ appareil: 'ordinateur', compte: 'recette-adm1-admin@example.invalid' });
    const p = s.page;
    await p.goto(R.BASE + '/interface/clients/new', { waitUntil: 'domcontentloaded' });
    await p.locator('#firstName').waitFor({ timeout: 45000 }); await R.attendre(800);
    const combos = p.locator('form [role=combobox]');
    const listes = [];
    for (let i = 0; i < await combos.count(); i++) {
      const c = combos.nth(i);
      if (!(await c.isVisible()) || (await c.isDisabled())) continue;
      const opts = await optionsDe(p, c).catch(() => []);
      if (opts.length) listes.push(opts.slice(0, 7).join(', '));
    }
    const email = `recette-lot-${Date.now().toString(36)}@example.invalid`;
    await p.locator('#firstName').fill('Aline'); await p.locator('#lastName').fill('Essai'); await p.locator('#email').fill(email);
    const tel = p.locator('input[type=tel]').first();
    if (await tel.count()) { await tel.fill(''); await tel.pressSequentially('612', { delay: 30 }); }
    const naissance = p.locator('#birthDate, [id$=birthDate]').first();
    if (await naissance.count()) { await naissance.fill(''); await naissance.pressSequentially('15/06/' + (new Date().getFullYear() - 12), { delay: 30 }); await naissance.blur(); }
    await p.locator('#propertyFullAddress').fill('15 Place Bonnyaud 23000 Guéret');
    await p.locator('input[name="bailRentAmount"]').fill('650');
    await p.locator('input[name="bailPaymentDay"]').fill('31');
    await p.getByRole('button', { name: 'Créer le client complet' }).click();
    await R.attendre(2500);
    const erreurs = await p.locator('form .text-destructive, form [id$=-form-item-message]').allInnerTexts();
    await p.screenshot({ path: `${CAP}/v10-m1-m3-m4-client-complet.png`, fullPage: true });
    const cree = R.sql(`SELECT count(*)::int n FROM "Person" WHERE email='${email}'`)[0].n;
    sortie({ ecran: 'nouveau client complet', listes, erreurs: [...new Set(erreurs.map((e) => e.trim()).filter(Boolean))], toasts: await toasts(p), clientCree: cree > 0 });
    await s.fermer();
  }

  // 3. Locataire d'un bail commercial : récapitulatif (m16, m13)
  {
    const lien = R.sql(`SELECT i.token, pe.email FROM "IntakeLink" i JOIN "Bail" b ON b.id=i."bailId" JOIN "Person" pe ON pe."clientId"=i."clientId" AND pe."isPrimary"
      WHERE b."bailFamily"='COMMERCIAL' AND i.target='TENANT' AND i.status='PENDING' AND pe.email LIKE '%@example.invalid' ORDER BY i."createdAt" DESC LIMIT 1`)[0];
    if (!lien) sortie({ ecran: 'locataire commercial', resultat: 'aucun lien fictif en attente' });
    else {
      const s = await R.ouvrir({ appareil: 'ordinateur' });
      const p = s.page;
      await p.goto(`${R.BASE}/intakes/${lien.token}`, { waitUntil: 'domcontentloaded' });
      if (await voir(p, 'Recevoir mon code', 30000)) await passerBarriere(p, lien.email);
      await voir(p, 'Voici le bien', 45000);
      for (const titre of ['Voici le bien', 'Les informations du bail']) {
        const t = p.getByText(titre).first();
        const ouvert = await t.locator('xpath=ancestor::button[1]').getAttribute('aria-expanded').catch(() => null);
        if (ouvert !== 'true') await t.click().catch(() => {});
        await R.attendre(500);
      }
      const texte = (await p.locator('main, body').first().innerText()).replace(/\s+/g, ' ');
      await p.screenshot({ path: `${CAP}/v10-m16-recap-locataire-commercial.png`, fullPage: true });
      sortie({
        ecran: 'locataire commercial',
        local: /caractéristiques du local/i.test(texte),
        loyerHT: /Loyer mensuel HT/i.test(texte),
        paiement: /Paiement du loyer/i.test(texte),
        activite: /Activité autorisée/i.test(texte),
        typeDeBail: (texte.match(/Type de bail ([^A-Z]{0,60}?[a-zé0-9-]+)/) || [])[1] || null,
        codesBruts: (texte.match(/\b(BOUTIQUE|PLEIN PROPRIETE|APPARTEMENT|COMMERCIAL 3 6 9)\b/g) || []),
      });
      await s.fermer();
    }
  }

  // 4. Formulaire propriétaire d'un particulier : types de contrat (m14), situation familiale (m13)
  {
    const lien = R.sql(`SELECT i.token, pe.email FROM "IntakeLink" i JOIN "Client" c ON c.id=i."clientId" JOIN "Person" pe ON pe."clientId"=c.id AND pe."isPrimary"
      LEFT JOIN "Bail" b ON b.id=i."bailId"
      WHERE i.target='OWNER' AND i.status='PENDING' AND c.type='PERSONNE_PHYSIQUE' AND (b.id IS NULL OR b."bailFamily"='HABITATION') AND pe.email LIKE '%@example.invalid'
      ORDER BY i."createdAt" DESC LIMIT 1`)[0];
    if (!lien) sortie({ ecran: 'formulaire propriétaire', resultat: 'aucun lien fictif en attente' });
    else {
      const s = await R.ouvrir({ appareil: 'ordinateur' });
      const p = s.page;
      await p.goto(`${R.BASE}/intakes/${lien.token}`, { waitUntil: 'domcontentloaded' });
      if (await voir(p, 'Recevoir mon code', 30000)) await passerBarriere(p, lien.email);
      await R.attendre(4000);
      const releve = { ecran: 'formulaire propriétaire' };
      // Parcourt les étapes déjà remplies jusqu'à trouver les listes recherchées (sans rien envoyer de nouveau).
      for (let etape = 0; etape < 8 && (!releve.typesDeContrat || !releve.situationFamiliale); etape++) {
        const combos = p.locator('[role=combobox]');
        for (let i = 0; i < await combos.count(); i++) {
          const c = combos.nth(i);
          if (!(await c.isVisible())) continue;
          const opts = await optionsDe(p, c).catch(() => []);
          if (opts.some((o) => /Bail (nu|meublé|étudiant)/i.test(o))) releve.typesDeContrat = opts;
          if (opts.some((o) => /libataire/i.test(o))) releve.situationFamiliale = opts;
        }
        if (releve.typesDeContrat && releve.situationFamiliale) break;
        const suite = p.getByRole('button', { name: /^Continuer|Suivant/ }).first();
        if (!(await suite.isVisible().catch(() => false))) break;
        await suite.click(); await R.attendre(2500);
      }
      await p.screenshot({ path: `${CAP}/v10-m13-m14-formulaire-proprietaire.png` });
      sortie(releve);
      await s.fermer();
    }
  }
})().catch((e) => console.log('ÉCHEC', String(e.message).split('\n')[0]));
