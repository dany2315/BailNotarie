// Vérification à l'écran des corrections B1, B2, B3 et M8 (serveur reconstruit, copie de test, comptes fictifs).
const { R, texte, voir, passerBarriere, toasts, resumeJournal } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const F = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/formulaire.cjs');
const out = [];
const note = (id, ok, detail) => { out.push({ id, ok, detail }); console.log((ok ? 'OK   ' : 'ÉCHEC') + ' ' + id + ' — ' + detail); };

(async () => {
  // ---------- B1 : inscription publique fermée ----------
  {
    const s = await R.ouvrir({ appareil: 'ordinateur' });
    const p = s.page;
    const res = await p.request.post(R.BASE + '/api/auth/sign-up/email', { data: { email: 'recette-orch-inscription@example.invalid', password: 'MotDePasse-Recette-123', name: 'Essai' }, failOnStatusCode: false });
    const created = R.sql("SELECT count(*)::int AS n FROM \"User\" WHERE email='recette-orch-inscription@example.invalid'")[0].n;
    note('B1-api', res.status() >= 400 && created === 0, `POST /api/auth/sign-up/email → ${res.status()} ; compte créé : ${created}`);
    await p.goto(R.BASE + '/register', { waitUntil: 'domcontentloaded' });
    note('B1-register', new URL(p.url()).pathname === '/client/login', `/register mène à ${new URL(p.url()).pathname}`);
    await R.capture(p, 'ORCH', 'v-b1-register-vers-client-login', { entiere: false });
    await p.goto(R.BASE + '/login', { waitUntil: 'domcontentloaded' });
    await voir(p, /Se connecter/, 20000);
    const t = await texte(p);
    const pwd = await p.locator('input[type=password]').count();
    const bad = await p.request.post(R.BASE + '/api/auth/sign-in/email', { data: { email: 'recette-orch-inconnu@example.invalid', password: 'faux-mot-de-passe' }, failOnStatusCode: false });
    note('B1-login', pwd > 0 && !/Créer un compte/.test(t) && bad.status() === 401, `/login : champ mot de passe ${pwd > 0}, lien « Créer un compte » absent ${!/Créer un compte/.test(t)}, connexion par mot de passe (compte inconnu) → ${bad.status()}`);
    await R.capture(p, 'ORCH', 'v-b1-login-equipe', { entiere: false });
    await s.fermer();
  }

  // ---------- B2 + B3 + M8 : locataire « Entreprise », de bout en bout jusqu'aux pièces ----------
  {
    const jeton = '4ca3ad3f-b335-4436-87b7-e3f24d980215';
    const lien = R.sql(`SELECT i."clientId", p.email FROM "IntakeLink" i JOIN "Person" p ON p."clientId"=i."clientId" AND p."isPrimary" WHERE i.token='${jeton}' AND i.status='PENDING'`)[0];
    if (!lien) throw Error('formulaire de test introuvable ou déjà soumis');
    const invitation = lien.email;
    const s = await R.ouvrir({ appareil: 'ordinateur' });
    const p = s.page;
    await p.goto(R.BASE + '/intakes/' + jeton, { waitUntil: 'domcontentloaded' });
    await passerBarriere(p, invitation);
    await voir(p, /Voici le bien/, 45000); await R.attendre(1200);
    await F.continuer(p); await voir(p, 'Qui êtes-vous');
    await p.getByRole('button', { name: /Entreprise/ }).click();
    await F.continuer(p); await voir(p, /Informations de l'entreprise/); await R.attendre(1500);

    const mail = p.locator('[id="entreprise.email"]');
    const avant = { valeur: await mail.inputValue(), lectureSeule: await mail.getAttribute('readonly') !== null };
    await mail.click({ force: true }); await mail.pressSequentially('x', { delay: 30 }).catch(() => {}); await R.attendre(300);
    const apres = await mail.inputValue();
    const mention = /L.email ne peut pas être modifié/.test(await texte(p));
    note('B3-societe', avant.valeur === invitation && avant.lectureSeule && apres === invitation && mention,
      `e-mail de la société prérempli « ${avant.valeur} » (invitation « ${invitation} »), en lecture seule ${avant.lectureSeule}, après une frappe « ${apres} », mention affichée ${mention}`);
    await R.capture(p, 'ORCH', 'v-b3-email-societe-prerempli');

    // Société introuvable → saisie manuelle (aucun nom commercial demandé)
    await p.locator('[id="entreprise.registration"]').fill('999999980');
    await p.getByText(/pas retrouvé cette société|momentanément indisponible/).first().waitFor({ timeout: 25000 }).catch(() => {});
    const manuel = p.getByRole('button', { name: 'Compléter les informations moi-même' });
    if (await manuel.isVisible().catch(() => false)) { await manuel.click(); await R.attendre(800); }
    await p.locator('[id="entreprise.legalName"]').fill('Recette Orchestration SAS');
    await p.locator('[id="entreprise.fullAddress"]').fill('5 rue des Vérifications 23000 Guéret');
    await p.locator('input[type=tel]').first().fill('+33 5 55 12 34 56');
    await F.continuer(p);
    const etape4 = await voir(p, /Étape 4\/4/, 40000); await R.attendre(1500);
    const ent = R.sql(`SELECT name, "legalName", email FROM "Entreprise" WHERE "clientId"='${lien.clientId}'`)[0];
    note('B2-continuer', etape4 && ent && ent.name === 'Recette Orchestration SAS' && ent.email === invitation,
      `passage à l'étape 4 : ${etape4} ; société en base : nom « ${ent?.name} », raison sociale « ${ent?.legalName} », e-mail « ${ent?.email} » ; messages : ${JSON.stringify(await toasts(p))}`);
    await R.capture(p, 'ORCH', 'v-b2-etape-4-atteinte');

    // M8 : un .txt est refusé avec un message clair, un .pdf passe
    const avantDocs = R.sql(`SELECT count(*)::int AS n FROM "Document" d JOIN "Entreprise" e ON e.id=d."entrepriseId" WHERE e."clientId"='${lien.clientId}'`)[0].n;
    await p.locator('input[type=file][id]').first().setInputFiles({ name: 'recette-statuts.txt', mimeType: 'text/plain', buffer: Buffer.from('fichier texte de recette') });
    let refus = null;
    for (let i = 0; i < 30 && !refus; i++) { refus = (await toasts(p)).find((t) => /Format non accepté/.test(t)) || null; await R.attendre(400); }
    const apresTxt = R.sql(`SELECT count(*)::int AS n FROM "Document" d JOIN "Entreprise" e ON e.id=d."entrepriseId" WHERE e."clientId"='${lien.clientId}'`)[0].n;
    await R.capture(p, 'ORCH', 'v-m8-txt-refuse', { entiere: false });
    await R.attendre(4000);
    await R.deposer(p, p.locator('input[type=file][id]').first(), 'kbis-orch');
    const pdfOk = await voir(p, /recette-kbis-orch\.pdf/, 40000);
    note('M8-pieces', !!refus && apresTxt === avantDocs && pdfOk, `.txt : « ${refus} », pièces en base ${avantDocs} → ${apresTxt} ; .pdf accepté : ${pdfOk}`);
    console.log('journal', JSON.stringify(resumeJournal(s.journal)));
    await s.fermer();
  }
  require('fs').writeFileSync(__dirname + '/../v1-resultats.json', JSON.stringify(out, null, 1));
})().catch((e) => { console.error('ERREUR', e.message.split('\n').slice(0, 3).join(' | ')); require('fs').writeFileSync(__dirname + '/../v1-resultats.json', JSON.stringify(out, null, 1)); process.exit(1); });
