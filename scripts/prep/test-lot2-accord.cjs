// Lot 2 — confirmation du locataire : invalidation, historique, nouvelle confirmation.
const path = require('path');
const { test, suite, assert } = require('./harness.cjs');

const terms = (r) => r.load('lib/actions/admin-bail-edit.ts');
const agreement = (r) => r.load('lib/bail/tenant-agreement.ts');
const tenantAction = (r) => r.load('lib/actions/tenant-agreement.ts');
const bailOf = (tx, f) => tx.bail.findUnique({ where: { id: f.bail.id } });
const history = (tx, f) => tx.bailTenantAgreementHistory.findMany({ where: { bailId: f.bail.id }, orderBy: { invalidatedAt: 'asc' } });
/** Accord enregistré comme le fait l'envoi du formulaire locataire (avec les conditions vues). */
const confirm = (tx, r, f, at = new Date('2026-11-10T10:00:00Z')) => agreement(r).recordTenantAgreement(r.db, f.bail.id, f.tenant.id, at);
/** Accord « ancien » : date seule, sans conditions enregistrées (état des données avant ce lot). */
const legacyConfirm = (tx, f) => tx.bail.update({ where: { id: f.bail.id }, data: { tenantConfirmedTermsAt: new Date('2026-10-01T10:00:00Z') } });

suite('Lot 2 — accord du locataire', path.join(__dirname, '../../reports/prep/tests-lot2-accord.json'), async () => {
  await test('Modifier les charges invalide l’accord, l’archive et demande une nouvelle confirmation', async (tx, r, f) => {
    await confirm(tx, r, f);
    const res = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '70' } });
    assert(res.success, res.error);
    const bail = await bailOf(tx, f);
    assert.equal(bail.monthlyCharges, 70);
    assert.equal(bail.tenantConfirmedTermsAt, null);
    assert.equal(bail.tenantConfirmedTerms, null);
    assert(bail.tenantReconfirmationRequestedAt, 'nouvelle confirmation non demandée');
    const rows = await history(tx, f);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].reason, 'TERMS_CHANGED');
    assert.equal(rows[0].tenantId, f.tenant.id);
    assert.equal(rows[0].confirmedAt.toISOString(), '2026-11-10T10:00:00.000Z');
    assert.equal(rows[0].confirmedTerms.monthlyCharges, 50, 'conditions confirmées non conservées');
    assert.equal(rows[0].termsBeforeChange.monthlyCharges, 50);
    assert.deepEqual(rows[0].changes, [{ field: 'monthlyCharges', before: 50, after: 70 }]);
    assert.equal(rows[0].invalidatedById, f.admin.id);
  });

  await test('Sauvegarde identique : l’accord reste valable, aucun historique', async (tx, r, f) => {
    await confirm(tx, r, f);
    const res = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '50', rentAmount: '600', effectiveDate: '2026-12-01' } });
    assert(res.success, res.error);
    const bail = await bailOf(tx, f);
    assert(bail.tenantConfirmedTermsAt, 'accord retiré sans changement');
    assert.equal(bail.tenantReconfirmationRequestedAt, null);
    assert.equal((await history(tx, f)).length, 0);
  });

  await test('Champ hors accord (jour de paiement) : l’accord reste valable', async (tx, r, f) => {
    await confirm(tx, r, f);
    const res = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { paymentDay: '10' } });
    assert(res.success, res.error);
    assert((await bailOf(tx, f)).tenantConfirmedTermsAt);
    assert.equal((await history(tx, f)).length, 0);
  });

  for (const [label, values, field] of [
    ['loyer', { rentAmount: '620' }, 'rentAmount'],
    ['dépôt de garantie', { securityDeposit: '500' }, 'securityDeposit'],
    ['date de prise d’effet', { effectiveDate: '2026-12-15' }, 'effectiveDate'],
    ['date de fin', { endDate: '2029-12-01' }, 'endDate'],
    ['type de bail', { bailType: 'BAIL_MEUBLE_1_ANS' }, 'bailType'],
  ]) {
    await test(`Changement de ${label} : accord invalidé`, async (tx, r, f) => {
      await confirm(tx, r, f);
      const res = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values });
      assert(res.success, res.error);
      assert.equal((await bailOf(tx, f)).tenantConfirmedTermsAt, null);
      const rows = await history(tx, f);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].changes[0].field, field);
    });
  }

  await test('Accord ancien sans conditions enregistrées : archivé sans contenu inventé', async (tx, r, f) => {
    await legacyConfirm(tx, f);
    const res = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '70' } });
    assert(res.success, res.error);
    const rows = await history(tx, f);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].confirmedTerms, null, 'un contenu a été attribué à un accord ancien');
    assert.equal(rows[0].termsBeforeChange.monthlyCharges, 50);
    assert.equal(rows[0].confirmedAt.toISOString(), '2026-10-01T10:00:00.000Z');
  });

  await test('Remplacement du locataire : accord de l’ancien archivé, nouvelle confirmation demandée', async (tx, r, f) => {
    await confirm(tx, r, f);
    const next = await tx.client.create({ data: { type: 'PERSONNE_PHYSIQUE', profilType: 'LOCATAIRE', completionStatus: 'COMPLETED' } });
    const res = await terms(r).changeBailTenantAdmin({ bailId: f.bail.id, tenantId: next.id, sendForm: false });
    assert(res.success, res.error);
    const bail = await bailOf(tx, f);
    assert.equal(bail.tenantConfirmedTermsAt, null);
    assert(bail.tenantReconfirmationRequestedAt);
    const rows = await history(tx, f);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].reason, 'TENANT_REPLACED');
    assert.equal(rows[0].tenantId, f.tenant.id, 'l’historique doit nommer l’ancien locataire');
    assert.equal(rows[0].changes, null);
  });

  await test('Ancien locataire remplacé : plus d’accès au bail, ne peut pas confirmer', async (tx, r, f) => {
    await confirm(tx, r, f);
    const next = await tx.client.create({ data: { type: 'PERSONNE_PHYSIQUE', profilType: 'LOCATAIRE', completionStatus: 'COMPLETED' } });
    assert((await terms(r).changeBailTenantAdmin({ bailId: f.bail.id, tenantId: next.id, sendForm: false })).success);
    assert.equal(await r.load('lib/auth-helpers.ts').canAccessBail(f.tenantUser.id, f.bail.id), false);
    r.state.user = f.tenantUser;
    const current = (await agreement(r).readAgreementSnapshot(r.db, f.bail.id)).terms;
    const res = await tenantAction(r).confirmBailTermsAsTenant({ bailId: f.bail.id, terms: current });
    assert.equal(res.success, false);
    assert.equal((await bailOf(tx, f)).tenantConfirmedTermsAt, null);
  });

  await test('Nouvelle confirmation par le locataire : enregistrée avec les conditions vues', async (tx, r, f) => {
    await confirm(tx, r, f);
    assert((await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '70' } })).success);
    r.state.user = f.tenantUser;
    const current = (await agreement(r).readAgreementSnapshot(r.db, f.bail.id)).terms;
    const res = await tenantAction(r).confirmBailTermsAsTenant({ bailId: f.bail.id, terms: current });
    assert(res.success, res.error);
    const bail = await bailOf(tx, f);
    assert(bail.tenantConfirmedTermsAt);
    assert.equal(bail.tenantConfirmedTerms.monthlyCharges, 70);
    assert.equal(bail.tenantConfirmedById, f.tenant.id);
    assert.equal(bail.tenantReconfirmationRequestedAt, null);
    assert.equal((await history(tx, f)).length, 1, 'l’ancien accord doit rester consultable');
    assert.deepEqual(r.state.suppressed, {}, 'aucun e-mail ni notification ne doit partir');
  });

  await test('Confirmation sur des conditions périmées : refusée', async (tx, r, f) => {
    await confirm(tx, r, f);
    const seen = (await agreement(r).readAgreementSnapshot(r.db, f.bail.id)).terms;
    assert((await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '70' } })).success);
    r.state.user = f.tenantUser;
    const res = await tenantAction(r).confirmBailTermsAsTenant({ bailId: f.bail.id, terms: seen });
    assert.equal(res.success, false);
    assert.equal(res.changed, true);
    assert.equal((await bailOf(tx, f)).tenantConfirmedTermsAt, null);
  });

  await test('Sans demande de renouvellement : pas de confirmation spontanée, propriétaire refusé', async (tx, r, f) => {
    const current = (await agreement(r).readAgreementSnapshot(r.db, f.bail.id)).terms;
    r.state.user = f.tenantUser;
    assert.equal((await tenantAction(r).confirmBailTermsAsTenant({ bailId: f.bail.id, terms: current })).success, false);
    r.state.user = f.ownerUser;
    await assert.rejects(() => tenantAction(r).confirmBailTermsAsTenant({ bailId: f.bail.id, terms: current }), /Forbidden/);
  });

  await test('Bail signé : modification refusée, accord intact', async (tx, r, f) => {
    await confirm(tx, r, f);
    await tx.bail.update({ where: { id: f.bail.id }, data: { status: 'SIGNED' } });
    const res = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '70' } });
    assert.equal(res.success, false);
    const bail = await bailOf(tx, f);
    assert.equal(bail.monthlyCharges, 50);
    assert(bail.tenantConfirmedTermsAt);
    assert.equal((await history(tx, f)).length, 0);
  });

  await test('Formulaire admin complet (updateLease) : changement de loyer invalide aussi l’accord', async (tx, r, f) => {
    await confirm(tx, r, f);
    await r.load('lib/actions/leases.ts').updateLease({ id: f.bail.id, rentAmount: '590' });
    assert.equal((await bailOf(tx, f)).tenantConfirmedTermsAt, null);
    assert.equal((await history(tx, f))[0].changes[0].field, 'rentAmount');
  });

  await test('Deux modifications successives : un seul accord archivé, pas de doublon', async (tx, r, f) => {
    await confirm(tx, r, f);
    assert((await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '70' } })).success);
    assert((await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '80' } })).success);
    assert.equal((await history(tx, f)).length, 1);
  });

  await test('Bail sans accord : modification sans effet sur l’accord ni demande de confirmation', async (tx, r, f) => {
    assert((await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '70' } })).success);
    const bail = await bailOf(tx, f);
    assert.equal(bail.tenantReconfirmationRequestedAt, null, 'aucune confirmation ne doit être réclamée aux dossiers qui n’en avaient pas');
    assert.equal((await history(tx, f)).length, 0);
  });
});
