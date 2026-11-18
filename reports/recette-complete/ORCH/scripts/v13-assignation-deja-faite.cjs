// Assigner un dossier au notaire qui l'a déjà : le refus doit s'afficher en français (et non le message anglais
// masqué par la version de production). Rien n'est modifié : l'action refuse avant toute écriture.
const { R, texte } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const BAIL = process.env.BAIL, NOTAIRE = process.env.NOTAIRE;

(async () => {
  const s = await R.ouvrir({ appareil: 'ordinateur', compte: 'recette-adm1-admin@example.invalid' });
  const p = s.page;
  await p.goto(R.BASE + '/interface/baux/' + BAIL, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: /^Plus/ }).first().click({ timeout: 60000 });
  await p.getByRole('menuitem', { name: 'Assigner un notaire' }).click();
  await p.getByText('Sélectionner un notaire').waitFor({ timeout: 30000 });
  await p.getByRole('combobox').filter({ hasText: 'Sélectionner un notaire' }).click();
  await p.getByRole('option', { name: NOTAIRE }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Assigner' }).click();
  const toast = p.locator('[data-sonner-toast]').first();
  await toast.waitFor({ timeout: 30000 });
  await R.attendre(800);
  await p.screenshot({ path: 'C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/ORCH/captures/v13-assignation-deja-faite.png' });
  console.log(JSON.stringify({ toast: (await toast.innerText()).replace(/\s+/g, ' '), r5xx: s.journal.reponses5xx.length }));
  await s.fermer();
})().catch((e) => console.log('ÉCHEC', String(e.message).split('\n')[0]));
