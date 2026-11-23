// Bandeau de cookies au format standard (ordinateur et téléphone) : bandeau, panneau « Personnaliser »,
// refus, réouverture par « Gérer les cookies », accord via le panneau, choix gardé au retour un autre jour.
// Les requêtes vers Google sont bloquées et comptées.
const { R } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const bandeau = (p) => p.getByRole('dialog', { name: 'Ce site utilise des cookies' });
const panneau = (p) => p.getByRole('dialog', { name: 'Paramètres des cookies' });
const cap = (nom) => `${__dirname}/../captures/${nom}.png`;

(async () => {
  for (const appareil of ['ordinateur', 'telephone']) {
    const s = await R.ouvrir({ appareil });
    const p = s.page; let google = 0;
    await s.context.route(/googletagmanager\.com|google-analytics\.com/, (r) => { google++; r.abort(); });
    await p.goto(R.BASE + '/', { waitUntil: 'domcontentloaded' });
    await bandeau(p).waitFor({ timeout: 25000 }); await R.attendre(1500);
    const boite = await bandeau(p).boundingBox(); const ecran = p.viewportSize();
    const tailles = await Promise.all(['Tout refuser', 'Tout accepter'].map((n) => bandeau(p).getByRole('button', { name: n, exact: true }).boundingBox()));
    await p.screenshot({ path: cap(`v6-bandeau-${appareil}`) });
    const googleAvant = google;

    await bandeau(p).getByRole('button', { name: 'Personnaliser' }).click();
    await panneau(p).waitFor(); await R.attendre(700);
    const interrupteurInitial = await panneau(p).getByRole('switch').getAttribute('aria-checked');
    await p.screenshot({ path: cap(`v6-bandeau-${appareil}-personnaliser`) });
    await panneau(p).getByRole('button', { name: 'Tout refuser' }).click(); await R.attendre(900);
    const fermeApresRefus = !(await bandeau(p).isVisible().catch(() => false)) && !(await panneau(p).isVisible().catch(() => false));

    const lien = p.getByRole('button', { name: 'Gérer les cookies' }); await lien.scrollIntoViewIfNeeded(); await lien.click();
    await panneau(p).waitFor({ timeout: 5000 }); await R.attendre(600);
    await panneau(p).getByRole('switch').click(); await R.attendre(300);
    await panneau(p).getByRole('button', { name: 'Enregistrer' }).click(); await R.attendre(4000);
    const googleApresAccord = google;

    // Retour « un autre jour » : nouvel onglet, même navigateur
    const p2 = await s.context.newPage();
    await p2.goto(R.BASE + '/', { waitUntil: 'domcontentloaded' }); await R.attendre(4000);
    const redemande = await bandeau(p2).isVisible().catch(() => false);
    const debord = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(JSON.stringify({
      appareil, ecran,
      bandeau: { x: Math.round(boite.x), y: Math.round(boite.y), largeur: Math.round(boite.width), hauteur: Math.round(boite.height) },
      refuserAccepterMemeTaille: Math.abs(tailles[0].width - tailles[1].width) < 2 && Math.abs(tailles[0].height - tailles[1].height) < 2,
      hauteurBoutons: Math.round(tailles[1].height),
      googleAvantChoix: googleAvant, interrupteurInitial, fermeApresRefus,
      googleApresAccordViaPanneau: googleApresAccord, bandeauRedemandeAuRetour: redemande,
      debordementHorizontal: debord,
    }));
    await s.fermer();
  }
})().catch((e) => console.log('ÉCHEC', String(e.message).split('\n')[0]));
