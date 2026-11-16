// Dispositif de test d'intégration (repris de l'audit du 16/11/2026, étendu).
//
// Les vraies actions serveur et règles du dépôt sont chargées dans un contexte isolé :
//  - base : uniquement la copie DATABASE_MIGRATE_TEST (voir db.cjs), chaque scénario dans UNE transaction
//    toujours annulée, y compris quand le scénario réussit ;
//  - Stripe, e-mails, S3, Pusher, Inngest, notifications, géocodage, IA : remplacés par des simulations ;
//  - réseau : fetch interdit ; aucun secret réel n'est chargé (process.env du contexte est vide).
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ts = require('typescript'), assert = require('node:assert/strict');
const { client, root } = require('./db.cjs');

const prisma = client();
const results = [];
const ROLLBACK = new Error('TEST_ROLLBACK');
const hash = (x) => crypto.createHash('sha256').update(JSON.stringify(x, (_, v) => (typeof v === 'bigint' ? v.toString() : v))).digest('hex');
const quote = (x) => '"' + x.replaceAll('"', '""') + '"';

async function snapshot() {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const out = {};
    const tables = await tx.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
    for (const { table_name: t } of tables) {
      const rows = await tx.$queryRawUnsafe('SELECT * FROM ' + quote(t));
      out[t] = { count: rows.length, hash: hash(rows.map(hash).sort()) };
    }
    return out;
  }, { timeout: 120000, isolationLevel: 'RepeatableRead' });
}

/** Stripe simulé : ordres de paiement en mémoire, pannes commandées par le scénario. */
function fakeStripe(state, mark) {
  const s = state.stripe;
  const missing = () => Object.assign(new Error('No such payment_intent'), { code: 'resource_missing', statusCode: 404 });
  return {
    paymentIntents: {
      retrieve: async (id) => {
        mark('stripe.retrieve');
        if (s.failRetrieve) throw Object.assign(new Error('Simulated network failure'), { type: 'StripeConnectionError' });
        if (!s.intents[id]) throw missing();
        return s.intents[id];
      },
      update: async (id, changes) => {
        mark('stripe.update');
        if (s.failUpdate) throw new Error('Simulated payment update failure');
        if (!s.intents[id]) throw missing();
        Object.assign(s.intents[id], changes);
        return s.intents[id];
      },
      create: async (params, options = {}) => {
        mark('stripe.create');
        const key = options.idempotencyKey;
        s.keys.push(key ?? null);
        if (key && s.byKey[key]) return s.intents[s.byKey[key]];
        s.created++;
        const id = 'pi_test_' + s.created + '_' + crypto.randomBytes(4).toString('hex');
        s.intents[id] = { id, status: 'requires_payment_method', client_secret: id + '_secret', amount_received: 0, latest_charge: null, ...params };
        if (key) s.byKey[key] = id;
        return s.intents[id];
      },
      cancel: async (id) => {
        mark('stripe.cancel');
        if (s.intents[id]) s.intents[id].status = 'canceled';
        return s.intents[id];
      },
    },
    webhooks: {
      constructEvent: (raw, signature, secret) => {
        mark('stripe.webhook.verify');
        if (signature !== 'valid:' + secret) throw new Error('Invalid signature');
        return JSON.parse(raw);
      },
    },
  };
}

function runtime(tx) {
  const state = {
    user: null,
    suppressed: {},
    stripe: { intents: {}, byKey: {}, keys: [], created: 0, failUpdate: false, failRetrieve: false },
    logs: 0,
    networkAttempts: 0,
    savepoints: 0,
    env: { NEXT_PUBLIC_URL: 'http://localhost:3000', STRIPE_WEBHOOK_SECRET: 'whsec_test' },
  };
  const mark = (name) => { state.suppressed[name] = (state.suppressed[name] || 0) + 1; };
  const suppress = (name) => async () => { mark(name); return { data: { id: 'test-suppressed' }, error: null, ids: ['test-suppressed'] }; };
  // Transaction imbriquée = point de reprise : si le bloc échoue, ce qu'il a écrit est annulé (comme en vrai).
  const proxy = new Proxy(tx, {
    get(t, k) {
      if (k === '$transaction') {
        return async (input) => {
          if (typeof input !== 'function') return Promise.all(input);
          const sp = 'sp_' + ++state.savepoints;
          await t.$executeRawUnsafe('SAVEPOINT ' + sp);
          try {
            const value = await input(proxy);
            await t.$executeRawUnsafe('RELEASE SAVEPOINT ' + sp);
            return value;
          } catch (e) {
            await t.$executeRawUnsafe('ROLLBACK TO SAVEPOINT ' + sp);
            throw e;
          }
        };
      }
      return t[k];
    },
  });
  const stripe = fakeStripe(state, mark);
  const modules = new Map();
  const sandbox = vm.createContext({
    structuredClone, Date, URL, URLSearchParams, Buffer, Headers, Request, Response, FormData, Blob, TextEncoder, TextDecoder, Intl,
    process: { env: state.env },
    console: { log() {}, warn() {}, error() { state.logs++; } },
    fetch() { state.networkAttempts++; throw Error('EXTERNAL_NETWORK_DISABLED'); },
    setTimeout() { throw Error('BACKGROUND_TIMER_DISABLED'); }, clearTimeout() {},
  });
  function load(file) {
    file = file.replaceAll('\\', '/');
    if (modules.has(file)) return modules.get(file).exports;
    if (!/^(lib|app)\//.test(file)) throw Error('Source import not permitted: ' + file);
    const mod = { exports: {} }; modules.set(file, mod);
    const req = (name) => {
      const resolved = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), name)) : name;
      if (resolved === 'lib/prisma') return { prisma: proxy };
      if (resolved === 'lib/auth') return { auth: { api: { getSession: async () => (state.user ? { user: state.user } : null) } } };
      if (resolved === 'lib/stripe') return { stripe };
      if (resolved === 'lib/resend-rate-limited') return { resendSendEmail: suppress('email') };
      if (resolved === 'lib/pusher') return { pusherServer: { trigger: suppress('pusher') } };
      if (resolved === 'lib/inngest/helpers' || resolved === 'lib/utils/notifications') return new Proxy({}, { get: (_, k) => suppress(String(k)) });
      if (resolved === 'lib/diagnostics/run') return { queueDiagnosticReading: suppress('diagnostic') };
      if (resolved === 'lib/utils/s3-client') return {
        deleteFileFromS3: suppress('s3.delete'), uploadFileToS3: suppress('s3.upload'),
        extractS3KeyFromUrl: (x) => x, generateS3FileKey: () => 'documents/test-simulated',
        generateSignedDownloadUrl: async () => { mark('s3.signed-url'); return 'http://localhost:3000/test-file'; },
      };
      if (resolved === 'lib/geocode') return { ensurePropertyGeocoded: suppress('geocode'), geocodeAddress: async () => null };
      if (resolved === 'lib/services/company-registry') return { entrepriseRegistryFields: async () => ({}), lookupCompany: async () => null };
      if (resolved.startsWith('emails/')) return { __esModule: true, default: () => null };
      if (name === 'next/cache') return { revalidatePath() {} };
      if (name === 'next/headers') return { headers: async () => new Headers() };
      if (name === 'next/server') return { NextRequest: Request, NextResponse: Response, after() { mark('background.after'); } };
      if (name === 'next/navigation') return { redirect(target) { throw Error('REDIRECT ' + target); }, notFound() { throw Error('NOT_FOUND'); } };
      if (name === 'react') return { cache: (fn) => fn };
      if (['zod', 'date-fns', 'date-fns/locale', 'crypto', '@prisma/client', '@prisma/client/runtime/library', 'libphonenumber-js', 'fflate'].includes(name)) return require(name);
      if (!/^(lib|app)\//.test(resolved)) throw Error('Dependency not permitted: ' + name);
      const source = ['.ts', '.tsx', '/index.ts'].map((ext) => resolved + ext).find((f) => fs.existsSync(path.resolve(root, f)));
      if (!source) throw Error('Source missing: ' + resolved);
      return load(source);
    };
    const source = fs.readFileSync(path.resolve(root, file), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    new vm.Script('(function(require,module,exports){' + js + '\n})', { filename: file }).runInContext(sandbox)(req, mod, mod.exports);
    return mod.exports;
  }
  return { state, load, db: proxy, stripe };
}

async function fixture(tx, r) {
  const admin = await tx.user.findFirst({ where: { role: 'ADMINISTRATEUR' } });
  assert(admin, 'Administrator fixture missing'); r.state.user = admin;
  const mail = () => crypto.randomUUID() + '@example.invalid';
  const owner = await tx.client.create({ data: { type: 'PERSONNE_PHYSIQUE', profilType: 'PROPRIETAIRE', completionStatus: 'COMPLETED', persons: { create: { firstName: 'Test', lastName: 'Proprietaire', email: mail(), isPrimary: true } } } });
  const tenant = await tx.client.create({ data: { type: 'PERSONNE_PHYSIQUE', profilType: 'LOCATAIRE', completionStatus: 'COMPLETED', persons: { create: { firstName: 'Test', lastName: 'Locataire', email: mail(), isPrimary: true } } } });
  const ownerUser = await tx.user.create({ data: { email: mail(), role: 'UTILISATEUR', clientId: owner.id, emailVerified: true } });
  const tenantUser = await tx.user.create({ data: { email: mail(), role: 'UTILISATEUR', clientId: tenant.id, emailVerified: true } });
  const property = await tx.property.create({ data: { ownerId: owner.id, fullAddress: 'TEST — bien synthétique', surfaceM2: 40, type: 'APPARTEMENT' } });
  const bail = await tx.bail.create({ data: { propertyId: property.id, rentAmount: 600, monthlyCharges: 50, securityDeposit: 600, effectiveDate: new Date('2026-12-01T00:00:00Z'), paymentDay: 5, status: 'PENDING_VALIDATION', parties: { connect: [{ id: owner.id }, { id: tenant.id }] } } });
  const intake = await tx.intakeLink.create({ data: { token: crypto.randomUUID(), target: 'OWNER', clientId: owner.id, propertyId: property.id, bailId: bail.id, status: 'PENDING' } });
  return { admin, owner, tenant, ownerUser, tenantUser, property, bail, intake };
}

async function test(name, fn) {
  if (process.env.TEST_FILTER && !new RegExp(process.env.TEST_FILTER).test(name)) return;
  let state, error = null, passed = false;
  try {
    await prisma.$transaction(async (tx) => {
      const r = runtime(tx); state = r.state;
      const f = await fixture(tx, r);
      try { await fn(tx, r, f); passed = true; } catch (e) { error = { type: e.code || e.name, message: String(e.message).slice(0, 400) }; }
      throw ROLLBACK;
    }, { timeout: 120000, maxWait: 15000 });
  } catch (e) { if (e !== ROLLBACK) error = { type: e.code || e.name, message: String(e.message).slice(0, 400) }; passed = passed && e === ROLLBACK; }
  const row = { name, passed, error, simulated: state?.suppressed || {}, networkAttempts: state?.networkAttempts || 0 };
  results.push(row);
  console.log((passed ? 'OK   ' : 'ÉCHEC') + ' ' + name + (error ? ' — ' + error.message : ''));
}

/** Lance une suite : empreinte de toutes les tables avant/après, rapport JSON. */
async function suite(label, outFile, body) {
  const before = await snapshot();
  await body();
  const after = await snapshot();
  const report = {
    suite: label, createdAt: new Date().toISOString(),
    passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed).length,
    networkAttempts: results.reduce((n, r) => n + r.networkAttempts, 0),
    databaseRestored: JSON.stringify(before) === JSON.stringify(after),
    tables: Object.keys(before).length, results,
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ suite: label, reussis: report.passed, echecs: report.failed, appelsReseau: report.networkAttempts, baseRestauree: report.databaseRestored, tables: report.tables }));
  await prisma.$disconnect();
  if (report.failed > 0 || !report.databaseRestored) process.exitCode = 1;
}

module.exports = { test, suite, assert, prisma, crypto };
