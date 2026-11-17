// Ce que le notaire voit sur un dossier créé avec l'ancienne version (avant les nouveaux formulaires) :
// la vue est calculée par le code actuel dans une transaction annulée, rien n'est écrit.
// On ne relève que la structure (sections, nombre de lignes, pièces, diagnostics), jamais de données personnelles.
const path = require('path');
const { test, suite, assert } = require('./harness.cjs');

const ANCIENS = (process.env.ASSIGNMENTS || '').split(',').filter(Boolean);
const lignes = [];

suite('Vue notaire des anciens dossiers', path.join(__dirname, '../../reports/prep/vue-notaire-anciens-dossiers.json'), async () => {
  for (const id of ANCIENS) {
    await test('Vue notaire — dossier ' + id.slice(-6), async (tx, r) => {
      const a = await tx.dossierNotaireAssignment.findUnique({ where: { id }, select: { notaireId: true } });
      r.state.user = await tx.user.findUnique({ where: { id: a.notaireId } });
      const view = await r.load('lib/notaire/dossier-view.ts').loadNotaireDossier(id);
      assert(view, 'vue introuvable');
      const sections = [...view.bail, ...view.property, ...view.parties.flatMap((p) => p.sections)];
      const ligne = {
        dossier: id.slice(-6),
        statut: view.status,
        sections: sections.length,
        sectionsVides: sections.filter((s) => s.rows.length === 0).map((s) => s.title),
        lignesRenseignees: sections.reduce((n, s) => n + s.rows.length, 0),
        pieces: view.documentCount,
        groupesDePieces: view.documents.map((g) => g.title.replace(/ - .*/, '')),
        diagnostics: view.diagnostics ? { aCorriger: view.diagnostics.counts.toFix, aVerifier: view.diagnostics.counts.toCheck, enRouge: view.diagnostics.items.filter((i) => i.status === 'missing' || i.status === 'replace').length } : 'bloc absent (aucune lecture)',
        accordLocataire: (view.bail.find((s) => s.key === 'bail')?.rows || []).some((row) => row.label === 'Confirmé par le locataire'),
      };
      lignes.push(ligne);
      console.log(JSON.stringify(ligne));
    });
  }
});
