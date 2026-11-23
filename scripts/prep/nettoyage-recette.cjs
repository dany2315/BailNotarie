// Nettoyage de la copie de test après la recette au navigateur : retire UNIQUEMENT les lignes fictives créées
// pendant la campagne (comptes en @example.invalid, leurs dossiers, leurs pièces « recette-… »), dans une seule
// transaction. La transaction n'est validée que si chaque table retrouve le nombre de lignes de l'empreinte de
// départ ; sinon tout est annulé. Aucun fichier distant n'est touché (les pièces de recette sont locales).
//
//   node scripts/prep/nettoyage-recette.cjs <empreinte-de-depart.json> <début ISO de la campagne> [--apply]
const fs = require('fs');
const { client } = require('./db.cjs');

(async () => {
  const [refPath, since, flag] = process.argv.slice(2);
  if (!refPath || !since) throw Error('usage : nettoyage-recette.cjs <empreinte.json> <début ISO> [--apply]');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8')).tables;
  const T0 = new Date(since);
  if (Number.isNaN(T0.getTime())) throw Error('date de début invalide');
  const apply = flag === '--apply';
  const prisma = client();
  const report = { mode: apply ? 'application' : 'aperçu (rien n’est validé)', depuis: T0.toISOString(), supprime: {}, ecartsRestants: [] };
  class Rollback extends Error {}
  try {
    await prisma.$transaction(async (tx) => {
      const q = (sql, ...args) => tx.$queryRawUnsafe(sql, ...args);
      const ids = async (sql, ...args) => (await q(sql, ...args)).map((r) => r.id);
      const del = async (table, where, ...args) => { report.supprime[table] = (report.supprime[table] || 0) + Number(await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE ${where}`, ...args)); };

      // ---- Ce qui a été créé pendant la campagne
      const users = await q(`SELECT id, email FROM "User" WHERE "createdAt" >= $1`, T0);
      const clients = await ids(`SELECT id FROM "Client" WHERE "createdAt" >= $1`, T0);
      const persons = await q(`SELECT id, email, "clientId" FROM "Person" WHERE "clientId" = ANY($1::text[]) OR "createdAt" >= $2`, clients, T0);
      const properties = await q(`SELECT id, "ownerId" FROM "Property" WHERE "createdAt" >= $1`, T0);
      const bails = await q(`SELECT id, "propertyId" FROM "Bail" WHERE "createdAt" >= $1`, T0);
      const docs = await q(`SELECT id, label FROM "Document" WHERE "createdAt" >= $1`, T0);
      const propertyIds = properties.map((p) => p.id), bailIds = bails.map((b) => b.id), userIds = users.map((u) => u.id), personIds = persons.map((p) => p.id), docIds = docs.map((d) => d.id);

      // ---- Garde-fous : rien de réel ne doit être dans le lot
      const refuse = (why) => { throw Error('NETTOYAGE REFUSÉ : ' + why); };
      if (users.some((u) => !u.email.endsWith('@example.invalid'))) refuse('un compte créé depuis le début n’est pas fictif');
      if (persons.some((p) => !(p.email || '').endsWith('@example.invalid') || !clients.includes(p.clientId))) refuse('une personne du lot n’est pas fictive');
      if (properties.some((p) => !clients.includes(p.ownerId))) refuse('un bien du lot appartient à un client réel');
      if (bails.some((b) => !propertyIds.includes(b.propertyId))) refuse('un bail du lot porte sur un bien réel');
      if (docs.some((d) => !(d.label || '').startsWith('recette-'))) refuse('une pièce du lot n’est pas une pièce de recette');
      const foreign = await q(`SELECT count(*)::int AS n FROM "_BailClients" WHERE "A" = ANY($1::text[]) AND NOT ("B" = ANY($2::text[]))`, bailIds, clients);
      if (foreign[0].n) refuse('un client réel est partie à un bail du lot');

      // ---- Suppressions, des dépendances vers les racines
      await del('StripeWebhookEvent', `"receivedAt" >= $1`, T0);
      await del('DossierPayment', `"createdAt" >= $1`, T0);
      await tx.$executeRawUnsafe(`UPDATE "Document" SET "replacedById" = NULL, "complementItemId" = NULL WHERE id = ANY($1::text[])`, docIds);
      await del('Document', `id = ANY($1::text[])`, docIds);
      await del('ComplementRequestItem', `"requestId" IN (SELECT id FROM "ComplementRequest" WHERE "bailId" = ANY($1::text[]))`, bailIds);
      await del('ComplementRequest', `"bailId" = ANY($1::text[])`, bailIds);
      for (const table of ['BailVerificationCheck', 'BailTenantAgreementHistory', 'BailAuditLog', 'BailCommercialTerms', 'DossierNotaireAssignment']) await del(table, `"bailId" = ANY($1::text[])`, bailIds);
      await del('Notification', `"createdAt" >= $1`, T0);
      await del('IntakeLink', `"createdAt" >= $1`, T0);
      await del('_BailClients', `"A" = ANY($1::text[])`, bailIds);
      await del('Bail', `id = ANY($1::text[])`, bailIds);
      await del('Property', `id = ANY($1::text[])`, propertyIds);
      await del('Session', `"userId" = ANY($1::text[])`, userIds);
      await del('Account', `"userId" = ANY($1::text[])`, userIds);
      await del('Verification', `"createdAt" >= $1 AND identifier LIKE '%@example.invalid%'`, T0);
      await del('Person', `id = ANY($1::text[])`, personIds);
      await del('User', `id = ANY($1::text[])`, userIds);
      await del('Client', `id = ANY($1::text[])`, clients);

      // ---- Contrôle : chaque table doit retrouver son nombre de lignes de départ
      for (const [table, before] of Object.entries(ref)) {
        const [{ n }] = await q(`SELECT count(*)::int AS n FROM "${table.replaceAll('"', '""')}"`);
        if (n !== before.count) report.ecartsRestants.push(`${table} : ${before.count} au départ, ${n} après nettoyage`);
      }
      if (report.ecartsRestants.length) throw new Rollback('des écarts subsistent : transaction annulée');
      if (!apply) throw new Rollback('aperçu');
    }, { timeout: 120000 });
    report.resultat = 'validé';
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
    report.resultat = e.message === 'aperçu' ? 'aperçu correct, rien n’a été modifié' : e.message;
  } finally { await prisma.$disconnect(); }
  for (const k of Object.keys(report.supprime)) if (!report.supprime[k]) delete report.supprime[k];
  console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error(e.message); process.exit(1); });
