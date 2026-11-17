// Fiche admin des dossiers créés avec l'ancienne version : ce qui ressort en rouge (pièces « Manquante »,
// puces « N manquants »), et si l'envoi au notaire serait bloqué. Lecture seule : on ouvre la page, on ne clique rien.
// On ne relève que des libellés de pièces et des compteurs, aucune donnée personnelle ; captures non conservées.
const { R, texte } = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/LOC/scripts/outils.cjs');
const BAUX = (process.env.BAUX || '').split(',').filter(Boolean);

(async () => {
  const s = await R.ouvrir({ appareil: 'ordinateur', compte: 'recette-adm1-admin@example.invalid' });
  const p = s.page;
  for (const bail of BAUX) {
    s.journal.reponses5xx.length = 0;
    await p.goto(R.BASE + '/interface/baux/' + bail, { waitUntil: 'domcontentloaded' });
    await p.getByText('Suivi').first().waitFor({ timeout: 60000 }).catch(() => {});
    await R.attendre(4000);
    const t = await texte(p);
    // Libellé de chaque pièce signalée « Manquante » : la ligne qui précède le mot.
    const manquantes = await p.evaluate(() => {
      const ligne = (el) => { let n = el; for (let i = 0; i < 6 && n; i++) { n = n.parentElement; const lignes = (n?.innerText || '').split('\n').map((x) => x.trim()).filter((x) => x && x !== '!' && x !== 'Manquante'); if (lignes.length) return lignes[0].slice(0, 70); } return '?'; };
      return [...document.querySelectorAll('span')].filter((e) => e.textContent.trim() === 'Manquante').map(ligne);
    });
    const sectionsAvecManque = await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^\d+ manquants?$/.test(e.textContent.trim())).map((e) => {
      let n = e; for (let i = 0; i < 8 && n; i++) { n = n.parentElement; const h = n?.querySelector('h2,h3,p.font-semibold'); if (h && h.textContent.trim()) return e.textContent.trim() + ' — ' + h.textContent.trim().slice(0, 50); } return e.textContent.trim();
    }));
    const puces = [...new Set((t.match(/\d+ manquants?/g) || []))];
    const envoi = (t.match(/[^\n]*(ne peut pas partir|bloqu|Référentiel des loyers indisponible)[^\n]*/gi) || []).slice(0, 3);
    console.log(JSON.stringify({ bail: bail.slice(-6), r5xx: s.journal.reponses5xx.length, piecesManquantes: manquantes.length, libelles: [...new Set(manquantes)], puces, sectionsAvecManque, envoi }));
  }
  await s.fermer();
})().catch((e) => console.log('ÉCHEC', String(e.message).split('\n')[0]));
