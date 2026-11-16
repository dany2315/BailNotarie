// Lot 5 — disponibilité du référentiel des loyers : une table vide ou un import inachevé ne prouvent pas
// qu'une commune n'est pas encadrée.
const path = require('path');
const { test, suite, assert } = require('./harness.cjs');

const cap = (r) => r.load('lib/rent-cap.ts');
const rules = (r) => r.load('lib/rent-rules.ts');
const UNREGULATED = '01001'; // commune hors de tout arrêté d'encadrement
const input = (f, inseeCode) => ({
  property: { id: f.property.id, inseeCode, surfaceM2: 40, type: 'APPARTEMENT', latitude: null, longitude: null, mainRooms: 2, constructionPeriod: null, rentCapZone: null, dpeClass: 'C' },
  bail: { rentAmount: 600, bailType: 'BAIL_NU_3_ANS', bailFamily: 'HABITATION', effectiveDate: new Date('2026-10-01'), rentSupplementReason: null, rentCapExemption: null },
});
const importRow = (tx, completed) =>
  tx.rentCapImport.create({ data: { startedAt: new Date(Date.now() + 60000), completedAt: completed ? new Date(Date.now() + 120000) : null, manifest: [], territories: 0, zones: 0, areas: 0, references: 0 } });

suite('Lot 5 — référentiel des loyers', path.join(__dirname, '../../reports/prep/tests-lot5-referentiel.json'), async () => {
  await test('Import commencé et pas terminé : commune sans arrêté → « contrôle impossible », jamais « non encadrée »', async (tx, r, f) => {
    await importRow(tx, false);
    assert.equal(await cap(r).rentCapReferentialAvailable(), false);
    const result = await cap(r).assessRentCap(input(f, UNREGULATED));
    assert.equal(result.referentialUnavailable, true);
    assert.notEqual(result.notConcerned, 'not_regulated');
    assert.equal(result.status, 'no_data');
    assert.equal(cap(r).rentCapBlocking(result), true);
    const all = await rules(r).assessRentRules(input(f, UNREGULATED));
    assert.equal(all.teamBlocking, true, 'l’envoi au notaire doit être bloqué');
    assert.equal(all.ownerBlocking, false, 'le formulaire du propriétaire ne doit pas être bloqué');
  });

  await test('Import terminé et vérifié : la même commune est bien « non encadrée »', async (tx, r, f) => {
    await importRow(tx, true);
    assert.equal(await cap(r).rentCapReferentialAvailable(), true);
    const result = await cap(r).assessRentCap(input(f, UNREGULATED));
    assert.equal(result.notConcerned, 'not_regulated');
    assert.equal(result.referentialUnavailable ?? false, false);
    assert.equal(cap(r).rentCapBlocking(result), false);
  });

  await test('Référentiel chargé avant le journal (aucun import journalisé, territoires présents) : utilisable', async (tx, r, f) => {
    await tx.rentCapImport.deleteMany();
    assert((await tx.rentCapTerritory.count()) > 0);
    assert.equal(await cap(r).rentCapReferentialAvailable(), true);
    assert.equal((await cap(r).assessRentCap(input(f, UNREGULATED))).notConcerned, 'not_regulated');
  });

  await test('Tables de barèmes vides (import oublié à la bascule) : contrôle impossible, envoi au notaire refusé avec un message clair', async (tx, r, f) => {
    await tx.rentCapImport.deleteMany();
    await tx.rentCapTerritory.deleteMany();
    assert.equal(await cap(r).rentCapReferentialAvailable(), false);
    // Même une commune réellement encadrée (Paris) ne peut plus être déclarée « non encadrée ».
    const paris = await cap(r).assessRentCap(input(f, '75101'));
    assert.equal(paris.referentialUnavailable, true);
    assert.notEqual(paris.notConcerned, 'not_regulated');
    // Dossier prêt par ailleurs : seul le référentiel manque.
    await tx.property.update({ where: { id: f.property.id }, data: { inseeCode: '75101' } });
    await tx.bail.update({ where: { id: f.bail.id }, data: { paidAt: new Date() } });
    const res = await r.load('lib/actions/admin-bail.ts').validateAndSendToNotary({ bailId: f.bail.id });
    assert.equal(res.success, false);
    assert.match(res.error, /Référentiel des loyers indisponible/);
    assert.equal(await tx.dossierNotaireAssignment.count({ where: { bailId: f.bail.id } }), 0);
  });

  await test('Référentiel indisponible : les brouillons et les éditions restent enregistrables', async (tx, r, f) => {
    await importRow(tx, false);
    const res = await r.load('lib/actions/admin-bail-edit.ts').updateBailTermsAdmin({ bailId: f.bail.id, values: { rentAmount: '610' } });
    assert(res.success, res.error);
    assert.equal((await tx.bail.findUnique({ where: { id: f.bail.id } })).rentAmount, 610);
  });

  await test('Commune encadrée dont l’arrêté est en base : contrôlée normalement même pendant un import', async (tx, r, f) => {
    await importRow(tx, false);
    const result = await cap(r).assessRentCap(input(f, '75101'));
    assert(result.territory, 'le territoire de Paris devait être trouvé');
    assert.equal(result.referentialUnavailable ?? false, false);
  });

  await test('Ancien contrôle RentControl retiré : les éditions de loyer ne dépendent plus de cette table (vide)', async (tx, r, f) => {
    assert.equal(await tx.rentControl.count(), 0);
    await r.load('lib/actions/leases.ts').updateLease({ id: f.bail.id, rentAmount: '5000' });
    assert.equal((await tx.bail.findUnique({ where: { id: f.bail.id } })).rentAmount, 5000);
    // Le moteur commun, lui, voit le dossier : il reste évalué (ici hors encadrement car le bien n'est pas localisé).
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id }, include: { property: true } });
    const all = await rules(r).assessRentRules({ property: bail.property, bail });
    assert.equal(all.cap.notConcerned, 'no_address');
  });
});
