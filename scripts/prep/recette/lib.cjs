// Bibliothèque commune de la recette multi-agents (navigateurs pilotés par Playwright, déjà présent sur la machine).
//
// Tout passe par le serveur de recette LOCAL (http://localhost:3210) : copie de test, Stripe en mode test,
// e-mails / tâches de fond / fichiers capturés par les doublures locales. Rien ne sort de la machine.
//
//   const R = require('<worktree>/scripts/prep/recette/lib.cjs');
//   const s = await R.ouvrir({ appareil: 'telephone', compte: 'recette-loc-locataire1@example.invalid' });
//   await s.page.goto(R.BASE + '/client');  await R.capture(s.page, 'LOC', 'tableau-de-bord-mobile');
//   const r = R.rapport('LOC');  r.cas({ id: 'LOC-001', ... });  r.ecrire();  await s.fermer();
const path = require('path'), fs = require('fs'), crypto = require('crypto'), { execFileSync } = require('child_process');
process.env.PREP_ENV = 'recette';
const { client } = require('../db.cjs');
const { env } = require('../isolated-env.cjs');

const PW_CORE = process.env.PW_CORE || 'C:/Users/David/Desktop/show-events/node_modules/playwright-core';
const pw = require(PW_CORE);
const BASE = 'http://localhost:3210';
const WORKTREE = path.join(__dirname, '../../..');
const MOCK = process.env.RECETTE_DIR || 'C:/Users/David/AppData/Local/Temp/claude/46bb82cd32f23d6b/6b9c9afc-1530-404e-8dcb-db49f24796bf/scratchpad/recette2';
const dossierAgent = (agent) => { const d = path.join(WORKTREE, 'reports/recette-complete', agent); fs.mkdirSync(path.join(d, 'captures'), { recursive: true }); return d; };

/** Appareils disponibles. « telephone » = Android (Chromium), « iphone » = Safari (WebKit). */
const APPAREILS = {
  ordinateur: { moteur: 'chromium', options: { viewport: { width: 1440, height: 900 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' } },
  portable: { moteur: 'chromium', options: { viewport: { width: 1280, height: 720 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' } },
  tablette: { moteur: 'chromium', options: { ...pw.devices['iPad Mini'], defaultBrowserType: undefined, locale: 'fr-FR', timezoneId: 'Europe/Paris' } },
  telephone: { moteur: 'chromium', options: { ...pw.devices['Pixel 7'], locale: 'fr-FR', timezoneId: 'Europe/Paris' } },
  iphone: { moteur: 'webkit', options: { ...pw.devices['iPhone 13'], locale: 'fr-FR', timezoneId: 'Europe/Paris' } },
  petit: { moteur: 'chromium', options: { ...pw.devices['iPhone SE'], defaultBrowserType: undefined, locale: 'fr-FR', timezoneId: 'Europe/Paris' } },
};

const SYNTHETIQUE = /@example\.invalid$/;
const exigerSynthetique = (email) => { if (!SYNTHETIQUE.test(email || '')) throw Error('Compte fictif exigé (@example.invalid) : ' + email); };

/** Valeur du cookie de session pour un compte FICTIF existant sur la copie (sans passer par le code e-mail). */
async function session(email) {
  exigerSynthetique(email);
  const prisma = client();
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (!user) throw Error('Compte introuvable sur la copie : ' + email);
    const token = crypto.randomBytes(24).toString('hex');
    await prisma.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 6 * 3600e3), userAgent: 'recette-agents' } });
    const signature = crypto.createHmac('sha256', env.BETTER_AUTH_SECRET).update(token).digest('base64');
    return { role: user.role, cookie: encodeURIComponent(`${token}.${signature}`) };
  } finally { await prisma.$disconnect(); }
}

/** Connecte un contexte de navigateur à un compte fictif. */
async function connecter(context, email) {
  const s = await session(email);
  await context.addCookies([{ name: 'better-auth.session_token', value: s.cookie, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  return s.role;
}
const deconnecter = (context) => context.clearCookies();

/**
 * Ouvre un navigateur. Retourne { page, context, browser, journal, fermer }.
 * journal = { console: [], erreursPage: [], reponses5xx: [], requetesEchouees: [] }, alimenté tout au long de la session.
 */
async function ouvrir({ appareil = 'ordinateur', compte = null, visible = false } = {}) {
  const def = APPAREILS[appareil];
  if (!def) throw Error('Appareil inconnu : ' + appareil + ' (' + Object.keys(APPAREILS).join(', ') + ')');
  const options = { ...def.options }; delete options.defaultBrowserType;
  const browser = await pw[def.moteur].launch({ headless: !visible });
  const context = await browser.newContext(options);
  context.setDefaultTimeout(20000); context.setDefaultNavigationTimeout(45000);
  if (compte) await connecter(context, compte);
  const journal = { console: [], erreursPage: [], reponses5xx: [], requetesEchouees: [] };
  const brancher = (page) => {
    const bruit = /_vercel\/(insights|speed-insights)|favicon|pusher|sockjs|stripe\.com|js\.stripe|m\.stripe|google|gstatic|unsplash/i;
    page.on('console', (m) => { if (m.type() === 'error' && !bruit.test(m.text())) journal.console.push({ url: page.url(), texte: m.text().slice(0, 300) }); });
    page.on('pageerror', (e) => journal.erreursPage.push({ url: page.url(), texte: String(e.message).slice(0, 300) }));
    page.on('response', (r) => { if (r.status() >= 500 && !bruit.test(r.url())) journal.reponses5xx.push({ url: r.url().slice(0, 200), statut: r.status() }); });
    page.on('requestfailed', (r) => { if (!bruit.test(r.url()) && !/ERR_ABORTED/.test(r.failure()?.errorText || '')) journal.requetesEchouees.push({ url: r.url().slice(0, 200), erreur: r.failure()?.errorText }); });
  };
  context.on('page', brancher);
  const page = await context.newPage();
  return { page, context, browser, journal, appareil, fermer: () => browser.close() };
}

/** Capture d'écran (page entière par défaut). Retourne le chemin relatif au dossier de l'agent. */
async function capture(page, agent, nom, { entiere = true } = {}) {
  const fichier = path.join(dossierAgent(agent), 'captures', nom.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() + '.png');
  await page.screenshot({ path: fichier, fullPage: entiere, animations: 'disabled' }).catch(async () => { await page.screenshot({ path: fichier, fullPage: false }); });
  return 'captures/' + path.basename(fichier);
}

/** Débordement horizontal (défaut classique sur téléphone). Retourne { deborde, largeurPage, largeurEcran, coupables[] }. */
const debordement = (page) => page.evaluate(() => {
  const w = window.innerWidth, doc = document.documentElement.scrollWidth;
  const coupables = [];
  if (doc > w + 1) for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > w + 2 && getComputedStyle(el).position !== 'fixed') { coupables.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).slice(0, 3).join('.') : '') + ' → ' + Math.round(r.right) + 'px'); if (coupables.length >= 5) break; }
  }
  return { deborde: doc > w + 1, largeurPage: doc, largeurEcran: w, coupables };
});

/** Texte visible de la page (ou d'un sélecteur), espaces compactés. */
const texte = async (page, selecteur = 'body') => (await page.locator(selecteur).first().innerText().catch(() => '')).replace(/\s+\n/g, '\n').trim();

/** Fichier de test à déposer. Le nom commence TOUJOURS par « recette- » (exigé par le nettoyage final). */
function fichier(nom = 'piece', type = 'pdf') {
  const base = 'recette-' + String(nom).replace(/^recette-/, '').replace(/[^a-z0-9_-]+/gi, '-');
  if (type === 'png') return { name: base + '.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') };
  return { name: base + '.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% fichier de recette ' + base + '\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF') };
}
/** Dépose un fichier de test dans un <input type=file> (locator ou sélecteur). */
async function deposer(page, cible, nom, type) { const loc = typeof cible === 'string' ? page.locator(cible) : cible; await loc.setInputFiles(fichier(nom, type)); }

// ---- Doublures locales : e-mails et événements capturés (rien n'est envoyé)
const lignes = (f) => { try { return fs.readFileSync(path.join(MOCK, f), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const destinataire = (m) => JSON.stringify(m.to || '');
/** E-mails capturés, du plus ancien au plus récent. filtre = { pour, sujet (RegExp), depuis (Date) }. */
const emails = ({ pour, sujet, depuis } = {}) => lignes('emails.jsonl').filter((m) => (!pour || destinataire(m).includes(pour)) && (!sujet || sujet.test(m.subject || '')) && (!depuis || new Date(m.at) >= depuis));
/** Événements de tâches de fond capturés (e-mails différés, notifications…). filtre = { nom (RegExp), depuis }. */
const evenements = ({ nom, depuis } = {}) => lignes('events.jsonl').filter((e) => (!nom || nom.test(e.name || '')) && (!depuis || new Date(e.at) >= depuis));
/** Dernier code de connexion à 6 chiffres reçu par une adresse (attend jusqu'à 15 s). */
async function dernierCode(email, depuis = new Date(Date.now() - 10 * 60e3)) {
  for (let i = 0; i < 30; i++) {
    const m = emails({ pour: email, depuis }).reverse().map((x) => /(\d{6})/.exec(x.subject || '') || /(\d{6})/.exec((x.html || '').replace(/<[^>]+>/g, ' '))).find(Boolean);
    if (m) return m[1];
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error('Aucun code reçu pour ' + email);
}
/** Texte lisible d'un e-mail capturé. */
const texteEmail = (m) => (m.html || m.text || '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/[\u200b-\u200f\u00ad]/g, '').replace(/\s+/g, ' ').trim();
const liensEmail = (m) => [...new Set(((m.html || '').match(/href="[^"]+"/g) || []).map((l) => l.slice(6, -1)))];

// ---- Stripe en mode TEST (jamais de clé réelle)
const node = (script, ...args) => execFileSync(process.execPath, [path.join(WORKTREE, 'scripts/prep', script), ...args], { cwd: WORKTREE, encoding: 'utf8', env: { ...process.env, PREP_ENV: 'recette' } }).trim();
/** Règle l'ordre de paiement d'un formulaire (jeton) avec un moyen de test, puis envoie le webhook signé au serveur local. */
function payer(jeton, moyen = 'pm_card_visa') {
  const paiement = JSON.parse(node('stripe-test.cjs', 'pay', jeton, moyen));
  let webhook = null;
  if (paiement.statut === 'succeeded') { const pi = sql(`SELECT "stripePaymentIntentId" AS pi FROM "IntakeLink" WHERE token='${jeton.replace(/[^a-zA-Z0-9-]/g, '')}'`)[0]?.pi; if (pi) webhook = JSON.parse(node('stripe-test.cjs', 'webhook', pi)); }
  return { paiement, webhook };
}
const etatPaiement = (jeton) => JSON.parse(node('stripe-test.cjs', 'status', jeton));

// ---- Base (copie de test) : LECTURE SEULE
/** Requête SQL en lecture seule sur la copie. Retourne un tableau d'objets. */
const sql = (requete) => JSON.parse(node('q.cjs', requete));

// ---- Rapport de l'agent
/**
 * Journal des cas de test d'un agent. Chaque cas :
 *   { id, role, appareil, domaine, fonctionnalite, etapes, attendu, constate, statut, gravite?, capture?, origine? }
 *   statut : 'OK' | 'KO' | 'PARTIEL' | 'NON_TESTE'    gravite (si KO/PARTIEL) : 'bloquant' | 'majeur' | 'mineur' | 'cosmetique'
 *   origine (si KO) : 'branche' (code de codex/prep-pr-main) | 'staging' (déjà sur staging) | 'montage' (dû à l'environnement de test) | 'inconnue'
 * ecrire() fusionne avec les cas déjà enregistrés (même id = remplacé) dans resultats.json.
 */
function rapport(agent) {
  const fichierJson = path.join(dossierAgent(agent), 'resultats.json');
  const nouveaux = [];
  return {
    cas(c) { for (const k of ['id', 'role', 'appareil', 'fonctionnalite', 'attendu', 'constate', 'statut']) if (!c[k]) throw Error('cas incomplet (' + k + ') : ' + JSON.stringify(c).slice(0, 120)); if (!['OK', 'KO', 'PARTIEL', 'NON_TESTE'].includes(c.statut)) throw Error('statut invalide : ' + c.statut); nouveaux.push({ ...c, le: new Date().toISOString() }); console.log(`[${c.statut}] ${c.id} ${c.fonctionnalite}`); },
    ecrire() {
      let existants = []; try { existants = JSON.parse(fs.readFileSync(fichierJson, 'utf8')).cas || []; } catch {}
      const parId = new Map(existants.map((c) => [c.id, c])); for (const c of nouveaux) parId.set(c.id, c);
      const cas = [...parId.values()].sort((a, b) => a.id.localeCompare(b.id, 'fr', { numeric: true }));
      const total = (s) => cas.filter((c) => c.statut === s).length;
      fs.writeFileSync(fichierJson, JSON.stringify({ agent, majLe: new Date().toISOString(), totaux: { cas: cas.length, OK: total('OK'), KO: total('KO'), PARTIEL: total('PARTIEL'), NON_TESTE: total('NON_TESTE') }, cas }, null, 1));
      return fichierJson;
    },
  };
}
/** Données fictives préparées pour l'agent (comptes, dossiers, jetons). */
const donnees = (code) => JSON.parse(fs.readFileSync(path.join(WORKTREE, 'reports/recette-complete/kit', `donnees-${code}.json`), 'utf8'));
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { BASE, WORKTREE, MOCK, APPAREILS, pw, ouvrir, connecter, deconnecter, session, capture, debordement, texte, fichier, deposer, emails, evenements, dernierCode, texteEmail, liensEmail, payer, etatPaiement, sql, rapport, donnees, dossierAgent, attendre };
