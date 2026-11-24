// Page « À traiter » (admin) : chaque dossier porte sa dernière activité, et les onglets de suivi
// (client, notaire) se lisent du plus récent au plus ancien.
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

  await test('Onglets client et notaire : le plus récent en tête ; « À faire » inchangé', async (tx, r, f) => {
    const { queue } = plain(await dash(r).getAdminDashboardData());
    // Même règle que components/dashboard/work-queue.tsx.
    const order = (tab) => queue
      .filter((i) => tab === 'nous' ? i.actor === 'nous' : tab === 'notaire' ? i.actor === 'notaire' : ['proprietaire', 'locataire', 'client'].includes(i.actor))
      .sort((a, b) => (tab === 'nous' ? 0 : b.lastActivityAt.localeCompare(a.lastActivityAt)));
    for (const tab of ['client', 'notaire']) {
      const list = order(tab);
      for (let i = 1; i < list.length; i++) assert(list[i - 1].lastActivityAt >= list[i].lastActivityAt, `${tab} : ordre`);
      for (let i = 1; i < list.length; i++) assert(list[i - 1].days <= list[i].days, `${tab} : jours croissants`);
    }
    const nous = order('nous');
    for (let i = 1; i < nous.length; i++) assert(nous[i - 1].days >= nous[i].days, 'À faire : les plus anciens d’abord');
  });
});
