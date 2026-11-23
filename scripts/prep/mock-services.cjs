// Doublures LOCALES des services externes pour la recette au navigateur. Rien ne sort de la machine.
//
//   127.0.0.1:4601  e-mails (Resend)      → chaque e-mail est écrit dans <dossier>/emails.jsonl, aucun n'est envoyé
//   127.0.0.1:4602  tâches de fond (Inngest) → chaque événement est écrit dans <dossier>/events.jsonl, aucun n'est exécuté
//   127.0.0.1:4603  fichiers (S3)          → fichiers gardés dans <dossier>/s3/ ; le vrai stockage n'est jamais contacté
//
// Usage : node scripts/prep/mock-services.cjs <dossier>
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const dir = process.argv[2];
if (!dir) { console.error('dossier attendu'); process.exit(2); }
fs.mkdirSync(path.join(dir, 's3'), { recursive: true });
const append = (file, obj) => fs.appendFileSync(path.join(dir, file), JSON.stringify(obj) + '\n');
const body = (req) => new Promise((resolve) => { const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks))); });
const json = (res, status, obj, extra = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...extra }); res.end(JSON.stringify(obj)); };

// ---- E-mails
http.createServer(async (req, res) => {
  const raw = (await body(req)).toString('utf8');
  if (req.method === 'POST') {
    let data; try { data = JSON.parse(raw); } catch { data = { raw }; }
    const list = Array.isArray(data) ? data : [data];
    const ids = list.map((mail) => { const id = 'mail_' + crypto.randomBytes(6).toString('hex'); append('emails.jsonl', { id, at: new Date().toISOString(), path: req.url, to: mail.to, from: mail.from, subject: mail.subject, html: mail.html, text: mail.text }); return id; });
    return json(res, 200, Array.isArray(data) ? { data: ids.map((id) => ({ id })) } : { id: ids[0] });
  }
  json(res, 200, {});
}).listen(4601, '127.0.0.1');

// ---- Tâches de fond
http.createServer(async (req, res) => {
  const raw = (await body(req)).toString('utf8');
  if (req.method === 'POST' && req.url.startsWith('/e/')) {
    let data; try { data = JSON.parse(raw); } catch { data = []; }
    const list = Array.isArray(data) ? data : [data];
    const ids = list.map((event) => { const id = 'evt_' + crypto.randomBytes(6).toString('hex'); append('events.jsonl', { id, at: new Date().toISOString(), name: event.name, data: event.data }); return id; });
    return json(res, 200, { ids, status: 200 });
  }
  json(res, 200, {});
}).listen(4602, '127.0.0.1');

// ---- Fichiers (style « chemin » : /<bucket>/<clé>)
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,HEAD,OPTIONS', 'Access-Control-Allow-Headers': '*', 'Access-Control-Expose-Headers': 'ETag' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4603');
  const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  const file = path.join(dir, 's3', key.replace(/[\\/:*?"<>|]/g, '_'));
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (req.method === 'PUT') {
    const data = await body(req);
    fs.writeFileSync(file, data);
    append('s3.jsonl', { at: new Date().toISOString(), op: 'PUT', key, size: data.length });
    res.writeHead(200, { ...CORS, ETag: '"' + crypto.createHash('md5').update(data).digest('hex') + '"' }); return res.end();
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (!fs.existsSync(file)) { append('s3.jsonl', { at: new Date().toISOString(), op: req.method + ' 404', key }); res.writeHead(404, { ...CORS, 'Content-Type': 'application/xml' }); return res.end('<Error><Code>NoSuchKey</Code></Error>'); }
    const data = fs.readFileSync(file);
    append('s3.jsonl', { at: new Date().toISOString(), op: req.method, key });
    res.writeHead(200, { ...CORS, 'Content-Type': 'application/octet-stream', 'Content-Length': data.length }); return res.end(req.method === 'HEAD' ? undefined : data);
  }
  if (req.method === 'DELETE') {
    const existed = fs.existsSync(file);
    if (existed) fs.unlinkSync(file);
    append('s3.jsonl', { at: new Date().toISOString(), op: 'DELETE', key, existed });
    res.writeHead(204, CORS); return res.end();
  }
  await body(req); res.writeHead(200, CORS); res.end();
}).listen(4603, '127.0.0.1');

console.log('doublures prêtes : e-mails 4601, tâches de fond 4602, fichiers 4603 → ' + dir);
