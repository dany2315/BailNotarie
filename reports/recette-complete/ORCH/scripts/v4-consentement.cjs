// Vérification du bandeau de consentement : Google Analytics seulement après accord, jamais dans les pages privées.
// Les requêtes vers Google sont interceptées et bloquées : on vérifie qu'elles sont tentées, rien ne part.
const fs = require('fs');
const { R, voir } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const out = [];
const note = (id, ok, detail) => { out.push({ id, ok, detail }); console.log((ok ? 'OK   ' : 'ÉCHEC') + ' ' + id + ' — ' + detail); };

async function session(appareil) {
  const s = await R.ouvrir({ appareil });
  s.google = [];
  await s.context.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/, (route) => { s.google.push(route.request().url().slice(0, 60)); route.abort(); });
  return s;
}
const bandeau = (p) => p.getByRole('dialog', { name: 'Ce site utilise des cookies' });

(async () => {
  for (const appareil of ['ordinateur', 'telephone']) {
    // 1. Premier passage : bandeau, rien de chargé
    const s = await session(appareil);
    const p = s.page;
    await p.goto(R.BASE + '/', { waitUntil: 'domcontentloaded' });
    const visible = await bandeau(p).waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    await R.attendre(3000);
    const boite = visible ? await bandeau(p).boundingBox() : null;
    const ecran = p.viewportSize();
    await R.capture(p, 'ORCH', 'v-consentement-bandeau-' + appareil, { entiere: false });
    note('GA-bandeau-' + appareil, visible && s.google.length === 0 && boite && boite.width <= ecran.width + 1,
      `bandeau affiché ${visible} ; requêtes Google avant choix : ${s.google.length} ; largeur bandeau ${boite && Math.round(boite.width)} / écran ${ecran.width}`);

    // 2. Refuser : plus de bandeau, rien de chargé, même après rechargement
    await p.getByRole('button', { name: 'Tout refuser' }).click(); await R.attendre(1000);
    await p.reload({ waitUntil: 'domcontentloaded' }); await R.attendre(4000);
    note('GA-refus-' + appareil, !(await bandeau(p).isVisible().catch(() => false)) && s.google.length === 0, `après refus et rechargement : bandeau ${await bandeau(p).isVisible().catch(() => false)}, requêtes Google ${s.google.length}`);

    // 3. « Gérer les cookies » rouvre le bandeau ; accepter charge la mesure
    const lien = p.getByRole('button', { name: 'Gérer les cookies' });
    await lien.scrollIntoViewIfNeeded(); await lien.click();
    const panneau = p.getByRole('dialog', { name: 'Paramètres des cookies' });
    const rouvert = await panneau.waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
    await panneau.getByRole('switch').click(); await panneau.getByRole('button', { name: 'Enregistrer' }).click(); await R.attendre(4000);
    note('GA-accord-' + appareil, rouvert && s.google.length > 0, `« Gérer les cookies » rouvre le bandeau : ${rouvert} ; après accord, requêtes Google tentées : ${s.google.length}`);

    // 4. Accord donné, pages privées : rien n'est chargé, mesure désactivée
    const avant = s.google.length;
    const resultats = [];
    for (const chemin of ['/client/login', '/intakes/00000000-0000-0000-0000-000000000000', '/commencer/proprietaire/jeton-de-test', '/interface', '/notaire/login']) {
      const s2 = await session(appareil);
      await s2.context.addInitScript(() => { try { localStorage.setItem('bn-consentement-mesure', JSON.stringify({ choix: 'accepte', le: Date.now() })); } catch {} });
      await s2.page.goto(R.BASE + chemin, { waitUntil: 'domcontentloaded' }).catch(() => {}); await R.attendre(4000);
      const desactive = await s2.page.evaluate(() => window['ga-disable-G-TZ7DF5J0XW']).catch(() => null);
      resultats.push({ chemin, adresse: new URL(s2.page.url()).pathname, google: s2.google.length, bandeau: await bandeau(s2.page).isVisible().catch(() => false), desactive });
      await s2.fermer();
    }
    note('GA-pages-privees-' + appareil, resultats.every((r) => r.google === 0 && !r.bandeau), JSON.stringify(resultats));

    // 5. Navigation sans rechargement d'une page publique vers une page privée : mesure coupée
    await p.goto(R.BASE + '/', { waitUntil: 'domcontentloaded' }); await R.attendre(3000);
    // Lien de navigation réel du site (Next.js, sans rechargement) vers l'espace client
    await p.evaluate(() => { window.__sansRechargement = 1; });
    await p.locator('a[href^="/client"]:visible').first().click().catch(() => {});
    await p.waitForURL(/\/client/, { timeout: 20000 }).catch(() => {}); await R.attendre(3000);
    const coupe = await p.evaluate(() => window['ga-disable-G-TZ7DF5J0XW']); const sansRechargement = await p.evaluate(() => window.__sansRechargement === 1);
    note('GA-navigation-' + appareil, new URL(p.url()).pathname.startsWith('/client') && coupe === true, `arrivée sur ${new URL(p.url()).pathname} (sans rechargement : ${sansRechargement}) ; mesure désactivée : ${coupe} (requêtes Google sur la page publique : ${avant})`);
    await s.fermer();
  }
  fs.writeFileSync(__dirname + '/../v4-resultats.json', JSON.stringify(out, null, 1));
})().catch((e) => { console.log('ÉCHEC script — ' + String(e.message).split('\n')[0]); fs.writeFileSync(__dirname + '/../v4-resultats.json', JSON.stringify(out, null, 1)); });
