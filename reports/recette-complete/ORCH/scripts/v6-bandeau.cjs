// Captures du nouveau bandeau de consentement (ordinateur et téléphone) : premier passage, détail déplié,
// bandeau rouvert par « Gérer les cookies ». Les requêtes vers Google sont bloquées.
const { R } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const bandeau = (p) => p.getByRole('dialog', { name: 'Vous choisissez ce que nous mesurons' });

(async () => {
  for (const appareil of ['ordinateur', 'telephone']) {
    const s = await R.ouvrir({ appareil });
    const p = s.page; let google = 0;
    await s.context.route(/googletagmanager\.com|google-analytics\.com/, (r) => { google++; r.abort(); });
    await p.goto(R.BASE + '/', { waitUntil: 'domcontentloaded' });
    await bandeau(p).waitFor({ timeout: 25000 }); await R.attendre(1500);
    const boite = await bandeau(p).boundingBox(); const ecran = p.viewportSize();
    const [refuser, accepter] = await Promise.all(['Refuser', 'Accepter'].map((n) => p.getByRole('button', { name: n, exact: true }).boundingBox()));
    await p.screenshot({ path: `${__dirname}/../captures/v6-bandeau-${appareil}.png` });
    await p.getByRole('button', { name: /Ce qui est mesuré/ }).click(); await R.attendre(700);
    await p.screenshot({ path: `${__dirname}/../captures/v6-bandeau-${appareil}-detail.png` });
    await p.getByRole('button', { name: 'Refuser', exact: true }).click(); await R.attendre(900);
    const fermeApresRefus = !(await bandeau(p).isVisible().catch(() => false));
    const lien = p.getByRole('button', { name: 'Gérer les cookies' }); await lien.scrollIntoViewIfNeeded(); await lien.click(); await R.attendre(1200);
    await p.screenshot({ path: `${__dirname}/../captures/v6-bandeau-${appareil}-rouvert.png` });
    const rappel = await bandeau(p).innerText();
    await p.getByRole('button', { name: 'Fermer sans changer mon choix' }).click(); await R.attendre(800);
    const debord = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(JSON.stringify({
      appareil,
      bandeau: { x: Math.round(boite.x), y: Math.round(boite.y), largeur: Math.round(boite.width), hauteur: Math.round(boite.height) },
      ecran,
      boutonsMemeTaille: Math.abs(refuser.width - accepter.width) < 2 && Math.abs(refuser.height - accepter.height) < 2,
      hauteurBoutons: Math.round(accepter.height),
      fermeApresRefus,
      rappelChoix: /Choix actuel : mesure refusée/.test(rappel.replace(/\s+/g, ' ')),
      fermeSansChanger: !(await bandeau(p).isVisible().catch(() => false)),
      debordementHorizontal: debord,
      requetesGoogle: google,
    }));
    await s.fermer();
  }
})().catch((e) => console.log('ÉCHEC', String(e.message).split('\n')[0]));
