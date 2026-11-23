// Recherche de la liste des dossiers : mots dans n'importe quel ordre, majuscules et accents ignorés.
const path = require('path');
const { test, suite, assert } = require('./harness.cjs');

const leases = (r) => r.load('lib/actions/leases.ts');
const UNIQUE = 'Zqx' + Date.now().toString(36);

/** Dossier synthétique : propriétaire « Géraldine <nom> », locataire société « SCI Étoile <nom> », bien libellé. */
async function names(tx, f) {
  const person = await tx.person.findFirst({ where: { clientId: f.owner.id } });
  await tx.person.update({ where: { id: person.id }, data: { firstName: 'Géraldine', lastName: 'Ammöuri' + UNIQUE } });
  await tx.entreprise.create({ data: { clientId: f.tenant.id, registration: '000000000', legalName: 'SCI Étoile ' + UNIQUE, name: 'SCI Étoile ' + UNIQUE, email: UNIQUE.toLowerCase() + '@example.invalid' } });
  await tx.property.update({ where: { id: f.property.id }, data: { label: 'Studio Bellecour ' + UNIQUE } });
}
// Copie hors du bac à sable (les tableaux du module chargé viennent d'un autre contexte JavaScript).
const ids = async (r, search, extra = {}) => JSON.parse(JSON.stringify((await leases(r).getLeases({ search, pageSize: 50, ...extra })).data.map((b) => b.id)));

suite('Recherche des dossiers', path.join(__dirname, '../../reports/prep/tests-recherche-dossiers.json'), async () => {
  await test('Prénom et nom ensemble, dans les deux ordres', async (tx, r, f) => {
    await names(tx, f);
    for (const q of [`Geraldine Ammouri${UNIQUE}`, `ammouri${UNIQUE} géraldine`, `GÉRALDINE AMMÖURI${UNIQUE}`]) {
      assert.deepEqual(await ids(r, q), [f.bail.id], `« ${q} » doit trouver le dossier`);
    }
  });

  await test('Accents ignorés des deux côtés', async (tx, r, f) => {
    await names(tx, f);
    assert.deepEqual(await ids(r, `Ammouri${UNIQUE}`), [f.bail.id], 'sans accent → nom accentué');
    assert.deepEqual(await ids(r, `sci etoile ${UNIQUE}`), [f.bail.id], 'société sans accent');
    assert.deepEqual(await ids(r, `Étoile ${UNIQUE}`), [f.bail.id], 'société avec accent');
  });

  await test('Libellé du bien, adresse et e-mail', async (tx, r, f) => {
    await names(tx, f);
    assert.deepEqual(await ids(r, `bellecour ${UNIQUE}`), [f.bail.id], 'libellé du bien');
    assert.deepEqual(await ids(r, `${UNIQUE.toLowerCase()}@example`), [f.bail.id], 'e-mail de la société');
    assert((await ids(r, 'bien synthetique')).includes(f.bail.id), 'adresse sans accent');
  });

  await test('Tous les mots doivent correspondre ; caractères spéciaux sans effet de joker', async (tx, r, f) => {
    await names(tx, f);
    assert.deepEqual(await ids(r, `Geraldine ${UNIQUE}inexistant`), [], 'un mot absent → aucun résultat');
    assert.deepEqual(await ids(r, `%${UNIQUE}`), [], '« % » ne doit pas servir de joker');
    assert.deepEqual(await ids(r, `_mmouri${UNIQUE}`), [], '« _ » ne doit pas servir de joker');
  });

  await test('Compteurs des onglets et du paiement : même recherche que la liste', async (tx, r, f) => {
    await names(tx, f);
    const status = await leases(r).getLeaseStatusCounts({ search: `ammouri${UNIQUE} geraldine` });
    assert.equal(status.PENDING_VALIDATION, 1);
    assert.equal(Object.values(status).reduce((a, b) => a + b, 0), 1);
    const pay = await leases(r).getLeasePaymentCounts({ search: `ammouri${UNIQUE} geraldine` });
    assert.equal(pay.total, 1);
    assert.equal(pay.unpaid, 1);
  });

  await test('Recherche combinée aux filtres (statut, paiement) et recherche vide', async (tx, r, f) => {
    await names(tx, f);
    assert.deepEqual(await ids(r, `Ammouri${UNIQUE}`, { status: 'PENDING_VALIDATION', payment: 'unpaid' }), [f.bail.id]);
    assert.deepEqual(await ids(r, `Ammouri${UNIQUE}`, { status: 'SIGNED' }), []);
    assert.deepEqual(await ids(r, `Ammouri${UNIQUE}`, { payment: 'paid' }), []);
    const all = (await leases(r).getLeases({ search: '   ', pageSize: 1 })).total;
    const none = (await leases(r).getLeases({ pageSize: 1 })).total;
    assert.equal(all, none, 'une recherche faite d’espaces ne filtre rien');
  });
});
