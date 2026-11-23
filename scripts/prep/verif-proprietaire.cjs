// Données SYNTHÉTIQUES pour regarder l'espace propriétaire dans le navigateur, sur la copie de test :
// un propriétaire, son bien, un bail payé sans locataire ni dates, et une session.
//   node scripts/prep/verif-proprietaire.cjs create <fichier-cookie>   |   node scripts/prep/verif-proprietaire.cjs cleanup
// Tout est marqué « verif-proprietaire » et supprimé par « cleanup ».
const crypto = require('crypto'), fs = require('fs');
const { client } = require('./db.cjs');
const { env } = require('./isolated-env.cjs');
const EMAIL = 'verif-proprietaire@example.invalid';
const ADDRESS = 'VERIF-PROPRIETAIRE — bien synthétique';

(async () => {
  const prisma = client();
  try {
    const existing = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true, clientId: true } });
    if (process.argv[2] === 'cleanup') {
      if (!existing) { console.log('Rien à supprimer'); return; }
      const properties = await prisma.property.findMany({ where: { ownerId: existing.clientId }, select: { id: true } });
      const bails = await prisma.bail.findMany({ where: { propertyId: { in: properties.map((p) => p.id) } }, select: { id: true, parties: { select: { id: true, profilType: true } } } });
      const bailIds = bails.map((b) => b.id);
      const tenantIds = [...new Set(bails.flatMap((b) => b.parties.filter((p) => p.profilType === 'LOCATAIRE').map((p) => p.id)))];
      await prisma.dossierPayment.deleteMany({ where: { OR: [{ bailId: { in: bailIds } }, { userId: existing.id }] } });
      await prisma.intakeLink.deleteMany({ where: { OR: [{ bailId: { in: bailIds } }, { clientId: { in: [existing.clientId, ...tenantIds] } }] } });
      await prisma.bailAuditLog.deleteMany({ where: { bailId: { in: bailIds } } });
      await prisma.notification.deleteMany({ where: { targetId: { in: [...bailIds, ...tenantIds, existing.clientId] } } }).catch(() => undefined);
      await prisma.bail.deleteMany({ where: { id: { in: bailIds } } });
      await prisma.property.deleteMany({ where: { id: { in: properties.map((p) => p.id) } } });
      await prisma.session.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
      for (const id of [existing.clientId, ...tenantIds]) {
        await prisma.person.deleteMany({ where: { clientId: id } });
        await prisma.client.deleteMany({ where: { id } });
      }
      console.log(`Supprimé : 1 propriétaire, ${tenantIds.length} locataire(s), ${properties.length} bien(s), ${bailIds.length} bail(aux)`);
      return;
    }
    if (existing) throw Error('Données déjà présentes : lancez « cleanup » d’abord');
    const owner = await prisma.client.create({
      data: {
        type: 'PERSONNE_PHYSIQUE', profilType: 'PROPRIETAIRE', completionStatus: 'COMPLETED',
        persons: { create: { firstName: 'Verif', lastName: 'Proprietaire', email: EMAIL, isPrimary: true, phone: '+33600000000', fullAddress: 'Adresse synthétique', nationality: 'Française', familyStatus: 'CELIBATAIRE', birthPlace: 'Paris', birthDate: new Date('1980-01-01'), profession: 'Test' } },
      },
    });
    const user = await prisma.user.create({ data: { email: EMAIL, name: 'Verif Proprietaire', role: 'UTILISATEUR', clientId: owner.id, emailVerified: true } });
    const property = await prisma.property.create({ data: { ownerId: owner.id, fullAddress: ADDRESS, label: 'Bien de vérification', surfaceM2: 40, type: 'APPARTEMENT', completionStatus: 'COMPLETED', dpeClass: 'C', mainRooms: 2 } });
    const second = await prisma.property.create({ data: { ownerId: owner.id, fullAddress: ADDRESS + ' 2', label: 'Second bien de vérification', surfaceM2: 30, type: 'APPARTEMENT', completionStatus: 'COMPLETED', dpeClass: 'C', mainRooms: 1 } });
    const bail = await prisma.bail.create({ data: { propertyId: property.id, rentAmount: 600, monthlyCharges: 50, securityDeposit: 600, effectiveDate: null, paymentDay: null, status: 'AWAITING_TENANT', paidAt: new Date(), parties: { connect: [{ id: owner.id }] } } });
    const token = crypto.randomBytes(24).toString('hex');
    await prisma.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 2 * 3600e3), userAgent: 'verif-proprietaire' } });
    const signature = crypto.createHmac('sha256', env.BETTER_AUTH_SECRET).update(token).digest('base64');
    fs.writeFileSync(process.argv[3], encodeURIComponent(`${token}.${signature}`));
    console.log(JSON.stringify({ bailSansLocataire: bail.id, bienLibre: second.id }));
  } finally { await prisma.$disconnect(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
