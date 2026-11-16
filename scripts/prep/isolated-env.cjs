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
module.exports = { env, root };
