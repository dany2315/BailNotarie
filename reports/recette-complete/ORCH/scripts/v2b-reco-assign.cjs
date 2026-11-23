const { R, voir } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
(async () => {
  const s = await R.ouvrir({ appareil: 'ordinateur', compte: 'recette-adm1-admin@example.invalid' });
  const p = s.page;
  await p.goto(R.BASE + '/interface/baux/cmwjne2uk003tx12kjwdbairb', { waitUntil: 'domcontentloaded' });
  await voir(p, 'Suivi', 45000);
  await p.getByRole('button', { name: 'Plus' }).click(); await R.attendre(600);
  console.log('MENU', JSON.stringify(await p.getByRole('menuitem').allInnerTexts()));
  await p.getByRole('menuitem', { name: 'Assigner un notaire' }).click();
  const dlg = p.locator('[role=dialog]').last(); await dlg.waitFor(); await R.attendre(8000);
  console.log('DIALOGUE', (await dlg.innerText()).replace(/\n+/g, ' / '));
  console.log('ÉLÉMENTS', JSON.stringify(await dlg.locator('button, [role=combobox], select, input').evaluateAll((els) => els.map((e) => `${e.tagName}${e.getAttribute('role') ? '{' + e.getAttribute('role') + '}' : ''} ${(e.innerText || e.value || e.getAttribute('aria-label') || '').trim().slice(0, 50)}${e.disabled ? ' DISABLED' : ''}`))));
  await s.fermer();
})();
