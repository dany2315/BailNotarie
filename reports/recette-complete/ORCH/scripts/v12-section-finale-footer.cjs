// Captures de la section finale de l'accueil et du pied de page, téléphone et ordinateur.
const pw = require(process.env.PW_CORE || 'C:/Users/David/Desktop/show-events/node_modules/playwright-core');
const CAP = `${__dirname}/../captures`;
(async () => {
  const browser = await pw.chromium.launch({ headless: true });
  for (const [nom, opts] of [['telephone', { ...pw.devices['iPhone 13'], defaultBrowserType: undefined }], ['ordinateur', { viewport: { width: 1440, height: 900 } }]]) {
    delete opts.defaultBrowserType;
    const ctx = await browser.newContext({ ...opts, locale: 'fr-FR' });
    await ctx.addCookies([{ name: 'bn-consent', value: 'denied', url: 'http://localhost:3210' }]);
    const p = await ctx.newPage();
    await p.goto('http://localhost:3210/', { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    const refus = p.getByRole('button', { name: 'Tout refuser' });
    if (await refus.count()) await refus.first().click();
    const section = p.locator('[aria-labelledby="lp-final-title"]');
    await section.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800);
    await section.screenshot({ path: `${CAP}/v12-section-finale-${nom}.png`, animations: 'disabled' });
    const footer = p.locator('footer');
    await footer.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
    await footer.screenshot({ path: `${CAP}/v12-pied-de-page-${nom}.png`, animations: 'disabled' });
    console.log(nom, 'ok', await p.evaluate(() => document.documentElement.scrollWidth));
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
