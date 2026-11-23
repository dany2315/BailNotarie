// Recette au navigateur : ouvre une session pour un compte SYNTHÉTIQUE de la copie (adresse en @example.invalid
// uniquement), sans passer par le code reçu par e-mail. Sert à changer de rôle rapidement pendant la recette.
//   node scripts/prep/session-recette.cjs <adresse@example.invalid>     → affiche la valeur du cookie
process.env.PREP_ENV = 'recette';
const crypto = require('crypto');
const { client } = require('./db.cjs');
const { env } = require('./isolated-env.cjs');
(async () => {
  const email = process.argv[2] || '';
  if (!email.endsWith('@example.invalid')) throw Error('compte synthétique exigé (@example.invalid)');
  const prisma = client();
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (!user) throw Error('compte introuvable sur la copie');
    const token = crypto.randomBytes(24).toString('hex');
    await prisma.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 2 * 3600e3), userAgent: 'recette' } });
    const signature = crypto.createHmac('sha256', env.BETTER_AUTH_SECRET).update(token).digest('base64');
    console.log(JSON.stringify({ role: user.role, cookie: encodeURIComponent(`${token}.${signature}`) }));
  } finally { await prisma.$disconnect(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
