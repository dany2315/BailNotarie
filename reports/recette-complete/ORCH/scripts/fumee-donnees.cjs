const R = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/scripts/prep/recette/lib.cjs');
const voir = async (nom, appareil, compte, url, attendu) => {
  const s = await R.ouvrir({ appareil, compte });
  try {
    await s.page.goto(R.BASE + url, { waitUntil: 'domcontentloaded' });
    await s.page.getByText(attendu).first().waitFor({ timeout: 30000 });
    const t = (await R.texte(s.page)).replace(/\n+/g, ' / ');
    await R.capture(s.page, 'ORCH', 'fumee-' + nom);
    console.log('OK   ', nom, '|', new URL(s.page.url()).pathname.slice(0, 50), '|', t.slice(0, 260), '| erreurs', s.journal.erreursPage.length, s.journal.reponses5xx.length);
  } catch (e) { console.log('ÉCHEC', nom, '|', s.page.url().slice(21, 80), '|', e.message.split('\n')[0], '|', (await R.texte(s.page)).slice(0, 300).replace(/\n+/g, ' / ')); await R.capture(s.page, 'ORCH', 'fumee-echec-' + nom); }
  await s.fermer();
};
(async () => {
  const A = R.donnees('ADM-2'), N = R.donnees('NOT'), L = R.donnees('LOC'), P = R.donnees('PRO-D'), C = R.donnees('COM');
  await voir('fiche-equipe', 'ordinateur', A.comptes.admin, '/interface/baux/' + A.dossiers[0].bailId, 'Conformité légale');
  await voir('fiche-equipe-paris', 'ordinateur', A.comptes.admin, '/interface/baux/' + A.dossiers[2].bailId, 'Plafond de loyer');
  await voir('fiche-equipe-commercial', 'ordinateur', C.comptes.admin, '/interface/baux/' + C.dossiers[0].bailId, 'Conditions commerciales');
  await voir('notaire', 'ordinateur', N.comptes.notaires[0], '/notaire/dossiers', 'Conditions du bail');
  await voir('notaire-telephone', 'telephone', N.comptes.notaires[0], '/notaire/dossiers', 'Dossiers');
  await voir('formulaire-locataire', 'telephone', null, L.dossiers[0].locataire.formulaire, 'Recevoir mon code');
  await voir('espace-locataire', 'iphone', L.dossiers[4].locataire.email, '/client', 'ESPACE LOCATAIRE');
  await voir('espace-proprietaire', 'ordinateur', P.dossiers[0].proprietaire.email, '/client', 'ESPACE PROPRIÉTAIRE');
})().catch((e) => { console.error('ÉCHEC', e.message.split('\n')[0]); process.exit(1); });
