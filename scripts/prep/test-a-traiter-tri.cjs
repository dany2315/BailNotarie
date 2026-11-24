// Page « À traiter » (admin) : chaque dossier porte sa dernière activité, et les trois onglets
// se lisent du plus récent au plus ancien par défaut, ou l’inverse au choix.
const path = require('path');
const { test, suite, assert } = require('./harness.cjs');

const dash = (r) => r.load('lib/actions/admin-dashboard.ts');
const plain = (v) => JSON.parse(JSON.stringify(v));
const DAY = 86_400_000;

suite('Tri de « À traiter »', path.join(__dirname, '../../reports/prep/tests-a-traiter-tri.json'), async () => {
  await test('Chaque ligne porte sa dernière activité, cohérente avec « depuis N j »', async (tx, r, f) => {
    const { queue } = plain(await dash(r).getAdminDashboardData());
    assert(queue.length > 0, 'file vide');
    for (const item of queue) {
      assert.equal(typeof item.lastActivityAt, 'string', item.id);
      const days = Math.max(0, Math.floor((Date.now() - new Date(item.lastActivityAt).getTime()) / DAY));
      assert(Math.abs(days - item.days) <= 1, `${item.id} : ${days} j contre ${item.days} j`);
    }
    assert(queue.some((i) => i.id === f.bail.id), 'le dossier de test est dans la file');
  });

  await test('Les trois onglets : « Plus récents » par défaut, « Plus anciens » au choix', async (tx, r, f) => {
    const { queue } = plain(await dash(r).getAdminDashboardData());
    // Même règle que components/dashboard/work-queue.tsx.
    const order = (tab, sort) => queue
      .filter((i) => tab === 'nous' ? i.actor === 'nous' : tab === 'notaire' ? i.actor === 'notaire' : ['proprietaire', 'locataire', 'client'].includes(i.actor))
      .sort((a, b) => sort === 'recent' ? b.lastActivityAt.localeCompare(a.lastActivityAt) : a.lastActivityAt.localeCompare(b.lastActivityAt));
    for (const tab of ['nous', 'client', 'notaire']) {
      const recent = order(tab, 'recent');
      for (let i = 1; i < recent.length; i++) assert(recent[i - 1].days <= recent[i].days, `${tab} récents : jours croissants`);
      const ancien = order(tab, 'ancien');
      for (let i = 1; i < ancien.length; i++) assert(ancien[i - 1].days >= ancien[i].days, `${tab} anciens : jours décroissants`);
      assert.equal(recent.length, ancien.length);
    }
  });
});
