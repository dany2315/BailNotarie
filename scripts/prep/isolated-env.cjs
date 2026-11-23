// Environnement ISOLÉ commun au build et au serveur de vérification : aucune clé réelle (toutes factices),
// base = copie de test DATABASE_MIGRATE_TEST uniquement.
const { testUrl, root } = require('./db.cjs');
const url = testUrl();
const env = {
  PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP, APPDATA: process.env.APPDATA, LOCALAPPDATA: process.env.LOCALAPPDATA, USERPROFILE: process.env.USERPROFILE,
  NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
  DATABASE_URL: url, DIRECT_URL: url.replace('-pooler', ''),
  NEXT_PUBLIC_URL: 'http://localhost:3000', BETTER_AUTH_URL: 'http://localhost:3000', BETTER_AUTH_SECRET: 'build-isole-secret-factice-0123456789',
  STRIPE_SECRET_KEY: 'sk_test_factice_build_isole', NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_factice', STRIPE_WEBHOOK_SECRET: 'whsec_factice',
  RESEND_API_KEY: 're_factice_build_isole', INNGEST_EVENT_KEY: 'factice',
  PUSHER_APP_ID: '0', PUSHER_KEY: 'factice', PUSHER_SECRET: 'factice', PUSHER_CLUSTER: 'eu', NEXT_PUBLIC_PUSHER_KEY: 'factice', NEXT_PUBLIC_PUSHER_CLUSTER: 'eu',
  AWS_ACCESS_KEY_ID: 'FACTICE', AWS_SECRET_ACCESS_KEY: 'factice', AWS_REGION: 'eu-west-3', AWS_S3_BUCKET_NAME: 'bucket-factice',
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: 'factice', RECAPTCHA_SECRET_KEY: 'factice', BLOB_READ_WRITE_TOKEN: 'factice',
};

// ---- Mode « recette » (PREP_ENV=recette) : parcours complets au navigateur.
// Toujours la copie de test et aucun service réel, SAUF Stripe en mode TEST (clés sk_test_/pk_test_ du
// .env local, refusées si elles ne sont pas des clés de test). E-mails, tâches de fond et fichiers vont vers
// les doublures locales de mock-services.cjs : rien n'est envoyé, aucun fichier réel n'est lu ni supprimé.
if (process.env.PREP_ENV === 'recette') {
  const fs = require('fs'), path = require('path');
  const { mainCheckout } = require('./db.cjs');
  const local = require('dotenv').parse(fs.readFileSync(path.join(mainCheckout, '.env')));
  const sk = local.STRIPE_SECRET_KEY || '', pk = local.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  if (!sk.startsWith('sk_test_') || !pk.startsWith('pk_test_')) throw Error('Clés Stripe locales : des clés de TEST sont exigées');
  Object.assign(env, {
    NEXT_PUBLIC_URL: 'http://localhost:3210', BETTER_AUTH_URL: 'http://localhost:3210',
    STRIPE_SECRET_KEY: sk, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk, STRIPE_WEBHOOK_SECRET: 'whsec_recette_locale_0123456789abcdef',
    RESEND_BASE_URL: 'http://127.0.0.1:4601', RESEND_API_KEY: 're_recette_locale',
    INNGEST_DEV: '1', INNGEST_BASE_URL: 'http://127.0.0.1:4602', INNGEST_EVENT_API_BASE_URL: 'http://127.0.0.1:4602', INNGEST_DEVSERVER_URL: 'http://127.0.0.1:4602', INNGEST_EVENT_KEY: 'recette',
    AWS_ENDPOINT_URL_S3: 'http://127.0.0.1:4603', AWS_ENDPOINT_URL: 'http://127.0.0.1:4603', AWS_ACCESS_KEY_ID: 'RECETTE', AWS_SECRET_ACCESS_KEY: 'recette', AWS_REGION: 'eu-west-3', AWS_S3_BUCKET_NAME: 'recette',
  });
}

module.exports = { env, root };
