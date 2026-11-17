// Lot du 18/11 (m18 à m24, m32 à m43), à l'écran. Comptes et dossiers fictifs de la recette (@example.invalid) ;
// aucune pièce n'est supprimée (la confirmation est ouverte puis annulée).
const { R, voir, toasts } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const pw = require(process.env.PW_CORE || 'C:/Users/David/Desktop/show-events/node_modules/playwright-core');
const CAP = `${__dirname}/../captures`;
const sortie = (o) => console.log(JSON.stringify(o));
const attendreToast = async (p, motif, ms = 20000) => { for (let i = 0; i < ms / 400; i++) { const t = (await toasts(p)).find((x) => motif.test(x)); if (t) return t; await R.attendre(400); } return (await toasts(p)).join(' | ') || null; };

(async () => {
  // 1. Site public : simulateur (m38), blog (m36, m37), pied de page (m35), maquette (m34), noindex (m39), bulle (m23)
  {
    const s = await R.ouvrir({ appareil: 'telephone' });
    const p = s.page;
    await p.goto(R.BASE + '/simulateur-prix-bail-notarie', { waitUntil: 'domcontentloaded' });
    await p.locator('#rent-mobile').waitFor({ timeout: 45000 });
    await R.attendre(1000);
    const bulleReduite = await p.getByRole('button', { name: 'Réafficher le support' }).count();
    const bulleDepliee = await p.getByRole('button', { name: 'Contacter le support' }).count();
    await p.locator('#rent-mobile').fill('-500');
    await R.attendre(400);
    const messageLoyer = await p.getByText('Indiquez un loyer supérieur à 0 €.').count();
    const boutonEstimation = await p.getByRole('button', { name: /Voir mon estimation/ }).isDisabled();
    await p.locator('#procurations-mobile').fill('99');
    const procurations = await p.locator('#procurations-mobile').inputValue();
    const texte = await p.locator('main').innerText();
    const sansAccents = (texte.match(/\b(notarie|cout|estime|emoluments|reglemente|Parametres|Resultat|immediatement|frequentes)\b/g) || []);
    await p.screenshot({ path: `${CAP}/v11-m38-simulateur.png`, fullPage: false });
    const footer = await p.locator('footer a', { hasText: 'Processus' }).first().getAttribute('href');

    await p.goto(R.BASE + '/blog', { waitUntil: 'domcontentloaded' });
    await R.attendre(1500);
    const abonnement = await p.getByText("S'abonner").count();
    const maquette = await p.request.get(R.BASE + '/testFiches');
    const suivi = await p.request.get(R.BASE + '/commencer/suivi');
    const robotsSuivi = ((await suivi.text()).match(/<meta name="robots" content="([^"]+)"/) || [])[1];
    const intake = await p.request.get(R.BASE + '/intakes/jeton-invente');
    const robotsIntake = ((await intake.text()).match(/<meta name="robots" content="([^"]+)"/) || [])[1];

    await p.goto(R.BASE + '/blog/bail-notarie-vs-bail-classique-analyse-comparative', { waitUntil: 'load' });
    await p.locator('img[alt^="Balance de la justice"]').scrollIntoViewIfNeeded();
    await R.attendre(2500);
    const image = await p.locator('img[alt^="Balance de la justice"]').evaluate((img) => ({ chargee: img.complete && img.naturalWidth > 0 }));
    sortie({ ecran: 'site public', bulleReduite, bulleDepliee, messageLoyer, boutonEstimation, procurations, sansAccents, footer, abonnement, maquette: maquette.status(), robotsSuivi, robotsIntake, image });
    await s.fermer();
  }

  // 2. Routes d'API : refus (m40), annuaire (m41), anciennes routes (m42)
  {
    const s = await R.ouvrir({ appareil: 'ordinateur' });
    const q = s.page.request;
    const client = R.sql(`SELECT id FROM "Client" LIMIT 1`)[0].id;
    const fiche = await q.get(`${R.BASE}/api/clients/${client}`);
    const prep = async (email) => { const r = await q.post(`${R.BASE}/api/auth/client/prepare-login`, { data: { email } }); return `${r.status()} ${await r.text()}`; };
    const reponses = {
      notaire: await prep('recette-not-notaire1@example.invalid'),
      equipe: await prep('recette-adm1-admin@example.invalid'),
      client: await prep('recette-loc-locataire1@example.invalid'),
      inconnue: await prep(`inconnu-${Date.now()}@example.invalid`),
    };
    const ancienne = await q.post(`${R.BASE}/api/auth/client/request-otp`, { data: { email: 'recette-loc-locataire1@example.invalid' } });
    sortie({ ecran: 'API', ficheSansSession: fiche.status(), prepareLogin: reponses, identiques: new Set(Object.values(reponses)).size === 1, ancienneRoute: ancienne.status() });
    await s.fermer();
  }

  // 3. Heures dans le fuseau de la personne (m22) : locataire connecté depuis Israël
  {
    const browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', timezoneId: 'Asia/Jerusalem' });
    await R.connecter(context, 'recette-loc-locataire1@example.invalid');
    const p = await context.newPage();
    const erreurs = [];
    p.on('pageerror', (e) => erreurs.push(String(e.message).slice(0, 120)));
    p.on('console', (m) => { if (m.type() === 'error' && /418|hydrat/i.test(m.text())) erreurs.push(m.text().slice(0, 120)); });
    await p.goto(R.BASE + '/client/locataire/informations', { waitUntil: 'domcontentloaded' });
    await voir(p, 'Ajouté le', 45000);
    await R.attendre(2000);
    const ajoute = (await p.getByText(/Ajouté le/).allInnerTexts()).slice(0, 2);
    await p.screenshot({ path: `${CAP}/v11-m22-heure-israel.png` });
    sortie({ ecran: 'Mes informations, fuseau Asia/Jerusalem', ajoute, erreurs418: erreurs });
    await browser.close();
  }

  // 4. Espace notaire : notifications (m32), recherche et tri (m33), lien inconnu (m33)
  {
    const s = await R.ouvrir({ appareil: 'ordinateur', compte: 'recette-not-notaire1@example.invalid' });
    const p = s.page;
    await p.goto(R.BASE + '/notaire/dossiers', { waitUntil: 'domcontentloaded' });
    await p.getByLabel('Rechercher un dossier dans tous les statuts').waitFor({ timeout: 45000 });
    await R.attendre(1500);
    const cloche = await p.locator('aside').getByRole('button', { name: /^Notifications/ }).getAttribute('aria-label');
    const liste = () => p.locator('aside [aria-label="Dossiers"] li').allInnerTexts();
    const ordreRecents = (await liste()).map((t) => t.split('\n')[0]);
    await p.getByRole('button', { name: /Tri :/ }).first().click();
    await R.attendre(300);
    const ordreAnciens = (await liste()).map((t) => t.split('\n')[0]);
    await p.getByLabel('Rechercher un dossier dans tous les statuts').fill('ines');
    await R.attendre(400);
    const ines = (await liste()).map((t) => t.replace(/\s+/g, ' '));
    await p.getByLabel('Rechercher un dossier dans tous les statuts').fill('ProprioNOT6');
    await R.attendre(400);
    const not6 = (await liste()).map((t) => t.replace(/\s+/g, ' '));
    await p.screenshot({ path: `${CAP}/v11-m33-recherche-notaire.png` });
    await p.locator('aside').getByRole('button', { name: /^Notifications/ }).click();
    await R.attendre(1500);
    const notifications = (await p.locator('[role=menu]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
    await p.screenshot({ path: `${CAP}/v11-m32-cloche-notaire.png` });
    await p.keyboard.press('Escape');
    await p.goto(R.BASE + '/notaire/dossiers?dossierId=identifiant-invente', { waitUntil: 'domcontentloaded' });
    const introuvable = await voir(p, 'Dossier introuvable', 30000);
    sortie({ ecran: 'espace notaire', cloche, ordreRecents, ordreAnciens, ines, not6, notifications, introuvable: !!introuvable });
    await s.fermer();
  }

  // 5. Connexion client : message neutre pour une adresse inconnue (m41)
  {
    const s = await R.ouvrir({ appareil: 'ordinateur' });
    const p = s.page;
    await p.goto(R.BASE + '/client/login', { waitUntil: 'domcontentloaded' });
    await p.locator('input[type=email]').first().waitFor({ timeout: 45000 });
    await R.attendre(800);
    await p.locator('input[type=email]').first().fill(`inconnu-${Date.now()}@example.invalid`);
    await p.getByRole('button', { name: /Recevoir mon code|code/i }).first().click();
    const message = await attendreToast(p, /Si un compte|Aucun compte|Erreur/);
    sortie({ ecran: 'connexion client, adresse inconnue', message });
    await s.fermer();
  }
})().catch((e) => { console.error('ÉCHEC', e.message); process.exit(1); });
