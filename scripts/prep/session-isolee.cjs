// Session de vérification sur la COPIE de test : crée un compte administrateur synthétique et sa session
// (clé de signature factice de isolated-env), ou les supprime.
//   node scripts/prep/session-isolee.cjs create <fichier-cookie>   |   node scripts/prep/session-isolee.cjs cleanup
const crypto = require('crypto'), fs = require('fs');
const { client } = require('./db.cjs');
const { env } = require('./isolated-env.cjs');
const EMAIL = 'verification-isolee@example.invalid';
(async () => {
  const prisma = client();
  try {
    if (process.argv[2] === 'cleanup') {
      const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
      if (user) { await prisma.session.deleteMany({ where: { userId: user.id } }); await prisma.user.delete({ where: { id: user.id } }); }
      console.log(user ? 'Compte et sessions de vérification supprimés' : 'Rien à supprimer');
      return;
    }
    const user = await prisma.user.upsert({ where: { email: EMAIL }, update: { role: 'ADMINISTRATEUR' }, create: { email: EMAIL, name: 'Vérification isolée', emailVerified: true, role: 'ADMINISTRATEUR' }, select: { id: true } });
    const token = crypto.randomBytes(24).toString('hex');
    await prisma.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 2 * 3600e3), userAgent: 'verification-isolee' } });
    const signature = crypto.createHmac('sha256', env.BETTER_AUTH_SECRET).update(token).digest('base64');
    fs.writeFileSync(process.argv[3], encodeURIComponent(`${token}.${signature}`));
    console.log('Session de vérification créée (2 h)');
  } finally { await prisma.$disconnect(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
