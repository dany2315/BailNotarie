const R = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/scripts/prep/recette/lib.cjs');
(async () => {
  for (const appareil of ['ordinateur', 'telephone', 'iphone']) {
    const s = await R.ouvrir({ appareil });
    const t0 = Date.now();
    await s.page.goto(R.BASE + '/', { waitUntil: 'domcontentloaded' });
    await s.page.locator('h1').first().waitFor();
    const o = await R.debordement(s.page);
    const c = await R.capture(s.page, 'ORCH', 'accueil-' + appareil, { entiere: false });
    console.log(appareil, Date.now() - t0 + ' ms', 'h1=' + (await s.page.locator('h1').first().innerText()).slice(0, 50).replace(/\n/g, ' '), 'déborde=' + o.deborde, c, 'erreurs=' + s.journal.erreursPage.length + '/' + s.journal.reponses5xx.length);
    await s.fermer();
  }
})().catch((e) => { console.error('ÉCHEC', e.message.split('\n')[0]); process.exit(1); });
