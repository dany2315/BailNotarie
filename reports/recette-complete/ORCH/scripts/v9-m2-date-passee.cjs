// m2 à l'écran : une date de prise d'effet dans le passé est refusée (fiche de l'équipe, « Nouveau client complet »).
// Dossier fictif de la recette ; rien n'est enregistré quand la date est refusée.
const { R, voir, toasts } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const attendreToast = async (p, motif, ms = 30000) => { for (let i = 0; i < ms / 400; i++) { const t = (await toasts(p)).find((x) => motif.test(x)); if (t) return t; await R.attendre(400); } return null; };
const BAIL = 'cmwjndvy90028x12k2wa2w6zs';

(async () => {
  const s = await R.ouvrir({ appareil: 'ordinateur', compte: 'recette-adm1-admin@example.invalid' });
  const p = s.page;
  // 1. Fiche de l'équipe
  const avant = R.sql(`SELECT to_char("effectiveDate",'YYYY-MM-DD') d FROM "Bail" WHERE id='${BAIL}'`)[0].d;
  await p.goto(R.BASE + '/interface/baux/' + BAIL, { waitUntil: 'domcontentloaded' });
  await voir(p, 'Type et durée', 45000);
  const bouton = p.locator('#bloc-bail').getByRole('button', { name: 'Modifier : Type et durée' }).first();
  await bouton.scrollIntoViewIfNeeded(); await bouton.click();
  const dlg = p.locator('[role=dialog]').last(); await dlg.waitFor(); await R.attendre(600);
  const champ = dlg.getByLabel(/prise d'effet/i).first();
  await champ.fill(''); await champ.pressSequentially('15/03/2024', { delay: 30 }); await champ.blur(); await R.attendre(500);
  const messageSousChamp = (await dlg.innerText()).match(/Choisissez aujourd'hui ou une date à venir\./)?.[0] || null;
  await dlg.getByRole('button', { name: 'Ouvrir le calendrier' }).first().click().catch(() => {}); await R.attendre(700);
  const joursGrises = await p.locator('[role=grid] button[disabled], [role=grid] [aria-disabled=true]').count().catch(() => 0);
  await p.screenshot({ path: `${__dirname}/../captures/v9-m2-fiche-equipe-calendrier.png` });
  await p.keyboard.press('Escape'); await R.attendre(300);
  await dlg.getByRole('button', { name: 'Enregistrer' }).click();
  const refus = await attendreToast(p, /passé|Erreur|enregistr/i);
  await R.attendre(1500);
  await p.screenshot({ path: `${__dirname}/../captures/v9-m2-fiche-equipe-refus.png` });
  const apres = R.sql(`SELECT to_char("effectiveDate",'YYYY-MM-DD') d FROM "Bail" WHERE id='${BAIL}'`)[0].d;
  console.log(JSON.stringify({ ecran: 'fiche équipe', messageSousChamp, joursGrisesAuCalendrier: joursGrises, message: refus, dateAvant: avant, dateApres: apres, inchangee: avant === apres }));

  // 2. « Nouveau client complet »
  await p.goto(R.BASE + '/interface/clients/new', { waitUntil: 'domcontentloaded' }); await p.locator('#firstName').waitFor({ timeout: 45000 }); await R.attendre(800);
  const email = `recette-m2-${Date.now().toString(36)}@example.invalid`;
  await p.locator('#firstName').fill('Aline'); await p.locator('#lastName').fill('DatePassee'); await p.locator('#email').fill(email);
  await p.locator('#propertyFullAddress').fill('15 Place Bonnyaud 23000 Guéret');
  await p.locator('input[name="bailRentAmount"]').fill('650');
  await p.locator('#bailEffectiveDate').fill('01/02/2024'); await p.locator('#bailEffectiveDate').blur(); await R.attendre(400);
  const sousChamp2 = (await p.locator('form').innerText()).match(/Choisissez aujourd'hui ou une date à venir\./)?.[0] || null;
  await p.getByRole('button', { name: 'Créer le client complet' }).click();
  const refus2 = await attendreToast(p, /passé|Erreur|créé/i); await R.attendre(2000);
  await p.screenshot({ path: `${__dirname}/../captures/v9-m2-client-complet-refus.png` });
  const cree = R.sql(`SELECT count(*)::int n FROM "Person" WHERE email='${email}'`)[0].n;
  console.log(JSON.stringify({ ecran: 'nouveau client complet', messageSousChamp: sousChamp2, message: refus2, clientCree: cree > 0 }));
  await s.fermer();
})().catch((e) => console.log('ÉCHEC', String(e.message).split('\n')[0]));
