// Rapport global de la recette multi-agents : lit reports/recette-complete/<AGENT>/resultats.json et produit
//   reports/recette-complete/SYNTHESE.json   (chiffres)
//   reports/recette-complete/index.html      (rapport lisible, captures liées en relatif)
// Le suivi des défauts par l'orchestrateur (corrigé, à décider, écarté…) vient de kit/suivi-defauts.json :
//   { "LOC-012": { "etat": "corrigé", "note": "…", "commit": "abc1234" }, … }
//   node scripts/prep/recette/consolider.cjs
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '../../../reports/recette-complete');
const AGENTS = [
  ['PRO-D', 'Propriétaire — ordinateur', 'Création d’un dossier depuis le site, espace client complet'],
  ['PRO-M', 'Propriétaire — téléphone', 'Mêmes parcours sur Android et iPhone, société, copropriété, meublé'],
  ['LOC', 'Locataire — ordinateur et téléphone', 'Formulaire, espace, reconfirmation, demandes'],
  ['ADM-1', 'Équipe — pilotage', '« À traiter », listes, filtres, créations, relances'],
  ['ADM-2', 'Équipe — fiche dossier', 'Conformité, vérification, modifications, compléments, envoi au notaire'],
  ['NOT', 'Notaire — ordinateur et téléphone', 'Dossiers, pièces, demandes, messagerie, statuts, cloisonnement'],
  ['COM', 'Bail commercial — quatre rôles', 'Questionnaire commercial de bout en bout'],
  ['PUB', 'Site public, connexions, droits', 'Pages publiques, connexions par code, matrice de droits d’accès'],
];
const lire = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const suivi = lire(path.join(DIR, 'kit/suivi-defauts.json'), {});
const contexte = lire(path.join(DIR, 'kit/contexte-rapport.json'), {});

const agents = AGENTS.map(([code, titre, perimetre]) => {
  const r = lire(path.join(DIR, code, 'resultats.json'), null);
  const cas = (r?.cas || []).map((c) => ({ ...c, agent: code }));
  return { code, titre, perimetre, cas, majLe: r?.majLe || null, rapport: fs.existsSync(path.join(DIR, code, 'RAPPORT.md')), captures: fs.existsSync(path.join(DIR, code, 'captures')) ? fs.readdirSync(path.join(DIR, code, 'captures')).filter((f) => f.endsWith('.png')).length : 0 };
});
const tous = agents.flatMap((a) => a.cas);
const compte = (l, s) => l.filter((c) => c.statut === s).length;
const totaux = (l) => ({ cas: l.length, OK: compte(l, 'OK'), KO: compte(l, 'KO'), PARTIEL: compte(l, 'PARTIEL'), NON_TESTE: compte(l, 'NON_TESTE') });
const ROLES = ['Visiteur', 'Propriétaire', 'Locataire', 'Équipe', 'Notaire'];
const APPAREILS = ['ordinateur', 'portable', 'tablette', 'telephone', 'iphone', 'petit'];
const NOM_APPAREIL = { ordinateur: 'Ordinateur', portable: 'Portable', tablette: 'Tablette', telephone: 'Android', iphone: 'iPhone', petit: 'Petit écran' };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const roleDe = (c) => ROLES.find((r) => norm(c.role).startsWith(norm(r).slice(0, 5))) || c.role || 'Autre';
const appareilDe = (c) => APPAREILS.find((a) => norm(c.appareil).includes(a)) || norm(c.appareil) || 'autre';
const GRAVITES = ['bloquant', 'majeur', 'mineur', 'cosmetique'];
const rangGravite = (c) => { const i = GRAVITES.indexOf(norm(c.gravite)); return i < 0 ? 4 : i; };
const defauts = tous.filter((c) => c.statut === 'KO' || c.statut === 'PARTIEL').sort((a, b) => rangGravite(a) - rangGravite(b) || a.id.localeCompare(b.id, 'fr', { numeric: true }));
const etatDe = (c) => suivi[c.id]?.etat || 'à examiner';

const synthese = { genereLe: new Date().toISOString(), totaux: totaux(tous), captures: agents.reduce((n, a) => n + a.captures, 0),
  parAgent: Object.fromEntries(agents.map((a) => [a.code, { ...totaux(a.cas), captures: a.captures, rapport: a.rapport }])),
  parRole: Object.fromEntries(ROLES.map((r) => [r, totaux(tous.filter((c) => roleDe(c) === r))])),
  parAppareil: Object.fromEntries(APPAREILS.map((a) => [a, totaux(tous.filter((c) => appareilDe(c) === a))])),
  defauts: defauts.map((c) => ({ id: c.id, agent: c.agent, statut: c.statut, gravite: c.gravite || null, origine: c.origine || null, fonctionnalite: c.fonctionnalite, etat: etatDe(c) })) };
fs.writeFileSync(path.join(DIR, 'SYNTHESE.json'), JSON.stringify(synthese, null, 1));

// ---------- HTML
const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);
const barre = (t) => t.cas ? `<div class="barre" title="${t.OK} conformes, ${t.PARTIEL} partiels, ${t.KO} en défaut, ${t.NON_TESTE} non testés">${['OK', 'PARTIEL', 'KO', 'NON_TESTE'].map((s) => t[s] ? `<span class="s-${s}" style="flex:${t[s]}"></span>` : '').join('')}</div>` : '<div class="barre vide"></div>';
const pastille = (s) => `<span class="pastille s-${s}">${{ OK: 'Conforme', KO: 'Défaut', PARTIEL: 'Partiel', NON_TESTE: 'Non testé' }[s] || esc(s)}</span>`;
const lienCapture = (c) => c.capture && fs.existsSync(path.join(DIR, c.agent, c.capture)) ? `${c.agent}/${c.capture}` : null;
const T = totaux(tous);

const matrice = `<table class="matrice"><thead><tr><th></th>${APPAREILS.map((a) => `<th>${NOM_APPAREIL[a]}</th>`).join('')}<th>Total</th></tr></thead><tbody>${ROLES.map((r) => {
  const ligne = tous.filter((c) => roleDe(c) === r);
  return `<tr><th>${r}</th>${APPAREILS.map((a) => { const l = ligne.filter((c) => appareilDe(c) === a), t = totaux(l); const pb = t.KO + t.PARTIEL; return `<td class="${!t.cas ? 'rien' : pb ? 'avec-defaut' : 'net'}">${t.cas ? `<b>${t.OK}</b><small>/${t.cas}</small>${pb ? `<em>${pb} à voir</em>` : ''}` : '—'}</td>`; }).join('')}<td class="total"><b>${totaux(ligne).OK}</b><small>/${ligne.length}</small></td></tr>`; }).join('')}</tbody></table>`;

const cartesAgents = agents.map((a) => { const t = totaux(a.cas); return `<article class="carte"><header><span class="code">${a.code}</span><h3>${esc(a.titre)}</h3></header><p class="perimetre">${esc(a.perimetre)}</p>${barre(t)}<dl><div><dt>Cas</dt><dd>${t.cas}</dd></div><div><dt>Conformes</dt><dd>${t.OK}</dd></div><div><dt>Défauts</dt><dd>${t.KO}</dd></div><div><dt>Partiels</dt><dd>${t.PARTIEL}</dd></div><div><dt>Non testés</dt><dd>${t.NON_TESTE}</dd></div><div><dt>Captures</dt><dd>${a.captures}</dd></div></dl>${a.rapport ? `<a class="lien" href="${a.code}/RAPPORT.md">Rapport de l’agent</a>` : '<span class="attente">Rapport en attente</span>'}</article>`; }).join('');

const ligneDefaut = (c) => { const cap = lienCapture(c), s = suivi[c.id] || {}; return `<article class="defaut g-${norm(c.gravite) || 'inconnue'}"><header><span class="code">${esc(c.id)}</span>${pastille(c.statut)}<span class="gravite">${esc(c.gravite || 'gravité non précisée')}</span><span class="etat e-${norm(etatDe(c)).replace(/[^a-z]+/g, '-')}">${esc(etatDe(c))}</span></header><h4>${esc(c.fonctionnalite)}</h4><p class="meta">${esc(roleDe(c))} · ${esc(NOM_APPAREIL[appareilDe(c)] || c.appareil)}${c.origine ? ' · origine : ' + esc(c.origine) : ''}</p><dl class="detail">${c.etapes ? `<dt>Pour le reproduire</dt><dd>${esc(c.etapes)}</dd>` : ''}<dt>Attendu</dt><dd>${esc(c.attendu)}</dd><dt>Constaté</dt><dd>${esc(c.constate)}</dd>${s.note ? `<dt>Suite donnée</dt><dd>${esc(s.note)}${s.commit ? ` <code>${esc(s.commit)}</code>` : ''}</dd>` : ''}</dl>${cap ? `<a class="vignette" href="${cap}"><img loading="lazy" src="${cap}" alt="Capture du défaut ${esc(c.id)}"></a>` : ''}</article>`; };

const tableCas = (a) => `<details class="agent"><summary><span class="code">${a.code}</span> ${esc(a.titre)} <small>${a.cas.length} cas</small></summary><div class="defile"><table class="cas"><thead><tr><th>N°</th><th>Rôle</th><th>Appareil</th><th>Fonctionnalité vérifiée</th><th>Constaté</th><th>Résultat</th><th></th></tr></thead><tbody>${a.cas.map((c) => { const cap = lienCapture(c); return `<tr data-s="${c.statut}" data-t="${esc(norm([c.id, c.role, c.appareil, c.domaine, c.fonctionnalite, c.constate].join(' ')))}"><td class="id">${esc(c.id)}</td><td>${esc(roleDe(c))}</td><td>${esc(NOM_APPAREIL[appareilDe(c)] || c.appareil)}</td><td><b>${esc(c.fonctionnalite)}</b>${c.domaine ? `<small>${esc(c.domaine)}</small>` : ''}</td><td>${esc(c.constate)}</td><td>${pastille(c.statut)}</td><td>${cap ? `<a href="${cap}">capture</a>` : ''}</td></tr>`; }).join('')}</tbody></table></div></details>`;

const nonTestes = tous.filter((c) => c.statut === 'NON_TESTE');
const galerie = agents.map((a) => { const dir = path.join(DIR, a.code, 'captures'); if (!fs.existsSync(dir)) return ''; const f = fs.readdirSync(dir).filter((x) => x.endsWith('.png')).sort(); if (!f.length) return ''; return `<details class="agent"><summary><span class="code">${a.code}</span> ${esc(a.titre)} <small>${f.length} captures</small></summary><div class="galerie">${f.map((x) => `<a href="${a.code}/captures/${x}" title="${esc(x)}"><img loading="lazy" src="${a.code}/captures/${x}" alt="${esc(x.replace(/\.png$/, '').replace(/-/g, ' '))}"><span>${esc(x.replace(/\.png$/, '').replace(/-/g, ' '))}</span></a>`).join('')}</div></details>`; }).join('');

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette complète BailNotarie</title><style>
:root{--fond:#f6f7fb;--carte:#fff;--texte:#141826;--doux:#5b6478;--trait:#e3e7f0;--bleu:#4373f5;--ok:#12a36d;--ko:#d93a3a;--partiel:#d98a0b;--nt:#98a1b3;--ombre:0 1px 2px rgba(20,24,38,.06),0 8px 24px rgba(20,24,38,.06)}
@media(prefers-color-scheme:dark){:root{--fond:#0f1219;--carte:#171b26;--texte:#eef1f7;--doux:#9aa3b8;--trait:#262c3b;--ombre:none}}
*{box-sizing:border-box}body{margin:0;background:var(--fond);color:var(--texte);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1180px;margin:0 auto;padding:32px 16px 80px}h1{font-size:34px;line-height:1.15;margin:0 0 8px;letter-spacing:-.02em}h2{font-size:22px;margin:56px 0 6px;letter-spacing:-.01em}h2+p.sous{margin:0 0 20px;color:var(--doux)}h3{font-size:15.5px;margin:0}h4{font-size:15.5px;margin:10px 0 2px}
.chapeau{color:var(--doux);max-width:70ch;margin:0 0 24px}.surtitre{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--bleu);font-weight:700;margin:0 0 10px}
.tuiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.tuile{background:var(--carte);border:1px solid var(--trait);border-radius:16px;padding:16px 18px;box-shadow:var(--ombre)}.tuile b{display:block;font-size:30px;line-height:1.1;letter-spacing:-.02em}.tuile span{color:var(--doux);font-size:13px}.tuile.ok b{color:var(--ok)}.tuile.ko b{color:var(--ko)}.tuile.partiel b{color:var(--partiel)}
.barre{display:flex;height:8px;border-radius:99px;overflow:hidden;background:var(--trait);margin:12px 0}.barre.grande{height:14px;margin:20px 0 6px}.s-OK{background:var(--ok)}.s-KO{background:var(--ko)}.s-PARTIEL{background:var(--partiel)}.s-NON_TESTE{background:var(--nt)}
.legende{display:flex;flex-wrap:wrap;gap:16px;color:var(--doux);font-size:13px}.legende i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.cartes{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}.carte{background:var(--carte);border:1px solid var(--trait);border-radius:16px;padding:18px;box-shadow:var(--ombre);display:flex;flex-direction:column}.carte header{display:flex;gap:10px;align-items:center}.perimetre{color:var(--doux);font-size:13.5px;margin:8px 0 0;flex:1}
.code{font:600 11.5px/1 ui-monospace,Consolas,monospace;background:color-mix(in srgb,var(--bleu) 12%,transparent);color:var(--bleu);padding:5px 7px;border-radius:7px;white-space:nowrap}
.carte dl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 6px;margin:4px 0 14px}.carte dt{font-size:11.5px;color:var(--doux)}.carte dd{margin:0;font-weight:650;font-size:17px}.lien{color:var(--bleu);font-weight:600;text-decoration:none;font-size:14px}.lien:hover{text-decoration:underline}.attente{color:var(--doux);font-size:13px}
.defile{overflow-x:auto}table{border-collapse:collapse;width:100%}.matrice{background:var(--carte);border:1px solid var(--trait);border-radius:16px;overflow:hidden;box-shadow:var(--ombre)}.matrice th,.matrice td{padding:12px 10px;text-align:center;border-bottom:1px solid var(--trait)}.matrice thead th{font-size:12.5px;color:var(--doux);font-weight:600}.matrice tbody th{text-align:left;padding-left:18px}.matrice tr:last-child td,.matrice tr:last-child th{border-bottom:0}.matrice td b{font-size:17px}.matrice small{color:var(--doux)}.matrice em{display:block;font-style:normal;font-size:11.5px;color:var(--partiel);font-weight:600}.matrice td.rien{color:var(--nt)}.matrice td.net b{color:var(--ok)}.matrice td.total{background:color-mix(in srgb,var(--bleu) 6%,transparent)}
.pastille{display:inline-block;font-size:12px;font-weight:650;padding:3px 9px;border-radius:99px;color:#fff;white-space:nowrap}.pastille.s-NON_TESTE{color:#fff}
.defauts{display:grid;gap:14px}.defaut{background:var(--carte);border:1px solid var(--trait);border-left:5px solid var(--nt);border-radius:14px;padding:16px 18px;box-shadow:var(--ombre);display:grid;grid-template-columns:1fr;gap:2px}.defaut.g-bloquant{border-left-color:#8f1d1d}.defaut.g-majeur{border-left-color:var(--ko)}.defaut.g-mineur{border-left-color:var(--partiel)}.defaut.g-cosmetique{border-left-color:var(--nt)}
.defaut header{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.gravite{font-size:12.5px;font-weight:650;text-transform:capitalize}.etat{margin-left:auto;font-size:12px;font-weight:650;padding:3px 10px;border-radius:99px;border:1px solid var(--trait);color:var(--doux)}.etat.e-corrige{background:color-mix(in srgb,var(--ok) 14%,transparent);color:var(--ok);border-color:transparent}.etat.e-a-decider{background:color-mix(in srgb,var(--partiel) 16%,transparent);color:var(--partiel);border-color:transparent}
.meta{color:var(--doux);font-size:13px;margin:0 0 8px}.detail{display:grid;grid-template-columns:150px 1fr;gap:4px 14px;margin:0}.detail dt{color:var(--doux);font-size:13px}.detail dd{margin:0}.vignette{display:block;margin-top:12px;max-width:420px}.vignette img{width:100%;max-height:260px;object-fit:cover;object-position:top;border-radius:10px;border:1px solid var(--trait)}
@media(max-width:640px){.detail{grid-template-columns:1fr}.detail dt{margin-top:6px}h1{font-size:26px}}
details.agent{background:var(--carte);border:1px solid var(--trait);border-radius:14px;margin:10px 0;box-shadow:var(--ombre)}details.agent>summary{cursor:pointer;padding:14px 18px;font-weight:650;list-style:none;display:flex;gap:10px;align-items:center}details.agent>summary::-webkit-details-marker{display:none}details.agent>summary small{margin-left:auto;color:var(--doux);font-weight:500}
table.cas{font-size:13.5px;min-width:820px}table.cas th{font-size:12px;color:var(--doux);text-align:left;padding:8px 12px;border-top:1px solid var(--trait)}table.cas td{padding:9px 12px;border-top:1px solid var(--trait);vertical-align:top}table.cas td small{display:block;color:var(--doux)}td.id{font:600 12px ui-monospace,Consolas,monospace;white-space:nowrap}table.cas a{color:var(--bleu)}
.filtres{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}.filtres input{flex:1;min-width:220px;padding:10px 12px;border-radius:10px;border:1px solid var(--trait);background:var(--carte);color:inherit;font:inherit}.filtres button{padding:9px 14px;border-radius:10px;border:1px solid var(--trait);background:var(--carte);color:inherit;font:inherit;cursor:pointer}.filtres button[aria-pressed=true]{background:var(--bleu);border-color:var(--bleu);color:#fff}
.galerie{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;padding:0 18px 18px}.galerie a{text-decoration:none;color:var(--doux);font-size:11.5px}.galerie img{width:100%;height:130px;object-fit:cover;object-position:top;border-radius:8px;border:1px solid var(--trait);display:block;margin-bottom:4px}.galerie span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.encadre{background:var(--carte);border:1px solid var(--trait);border-radius:14px;padding:16px 18px;box-shadow:var(--ombre)}.encadre ul{margin:6px 0 0;padding-left:20px}.encadre li{margin:4px 0}code{font:12.5px ui-monospace,Consolas,monospace;background:color-mix(in srgb,var(--bleu) 10%,transparent);padding:1px 5px;border-radius:5px}
</style></head><body><main>
<p class="surtitre">BailNotarie · recette avant la mise en production</p>
<h1>Recette complète à l’écran</h1>
<p class="chapeau">${esc(contexte.chapeau || 'Huit agents de test ont parcouru l’application sur ordinateur, Android et iPhone, pour les quatre rôles, sur tout ce qui sépare main de staging. Serveur local isolé, copie de test, Stripe en mode test, e-mails et fichiers capturés en local.')}</p>
<div class="tuiles"><div class="tuile"><b>${T.cas}</b><span>vérifications exécutées</span></div><div class="tuile ok"><b>${T.OK}</b><span>conformes (${pct(T.OK, T.cas)} %)</span></div><div class="tuile ko"><b>${T.KO}</b><span>défauts</span></div><div class="tuile partiel"><b>${T.PARTIEL}</b><span>partiels</span></div><div class="tuile"><b>${T.NON_TESTE}</b><span>non testés</span></div><div class="tuile"><b>${synthese.captures}</b><span>captures d’écran</span></div></div>
<div class="barre grande">${['OK', 'PARTIEL', 'KO', 'NON_TESTE'].map((s) => T[s] ? `<span class="s-${s}" style="flex:${T[s]}"></span>` : '').join('')}</div>
<div class="legende"><span><i class="s-OK"></i>Conforme</span><span><i class="s-PARTIEL"></i>Partiel</span><span><i class="s-KO"></i>Défaut</span><span><i class="s-NON_TESTE"></i>Non testé</span></div>
${contexte.verdict ? `<h2>Verdict</h2><div class="encadre">${contexte.verdict}</div>` : ''}
<h2>Par rôle et par appareil</h2><p class="sous">Vérifications conformes sur vérifications exécutées.</p><div class="defile">${matrice}</div>
<h2>Les huit agents</h2><p class="sous">Chacun a ses propres dossiers fictifs et rend son propre rapport.</p><div class="cartes">${cartesAgents}</div>
<h2>Défauts et points partiels</h2><p class="sous">${defauts.length} à examiner, du plus grave au plus bénin.</p><div class="defauts">${defauts.map(ligneDefaut).join('') || '<div class="encadre">Aucun défaut relevé.</div>'}</div>
<h2>Toutes les vérifications</h2><p class="sous">Recherche dans les ${T.cas} cas.</p>
<div class="filtres"><input id="q" type="search" placeholder="Rechercher : paiement, iPhone, notaire, LOC-012…" aria-label="Rechercher dans les vérifications"><button data-s="" aria-pressed="true">Tout</button><button data-s="KO">Défauts</button><button data-s="PARTIEL">Partiels</button><button data-s="NON_TESTE">Non testés</button><button data-s="OK">Conformes</button></div>
${agents.map(tableCas).join('')}
<h2>Non testé</h2><p class="sous">${nonTestes.length} points déclarés non vérifiés, avec leur raison.</p><div class="encadre"><ul>${nonTestes.map((c) => `<li><span class="code">${esc(c.id)}</span> <b>${esc(c.fonctionnalite)}</b> — ${esc(c.constate)}</li>`).join('') || '<li>Rien.</li>'}</ul></div>
${contexte.conditions ? `<h2>Conditions de la campagne</h2><div class="encadre">${contexte.conditions}</div>` : ''}
<h2>Captures d’écran</h2><p class="sous">Données fictives uniquement.</p>${galerie}
</main><script>
const q=document.getElementById('q'),bs=[...document.querySelectorAll('.filtres button')];let s='';
const n=t=>t.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();
function f(){const t=n(q.value.trim());document.querySelectorAll('details.agent').forEach(d=>{const rows=[...d.querySelectorAll('table.cas tbody tr')];if(!rows.length)return;let v=0;rows.forEach(r=>{const ok=(!s||r.dataset.s===s)&&(!t||r.dataset.t.includes(t));r.hidden=!ok;v+=ok});d.hidden=!v;if(t||s)d.open=v>0;});}
q.addEventListener('input',f);bs.forEach(b=>b.addEventListener('click',()=>{s=b.dataset.s;bs.forEach(x=>x.setAttribute('aria-pressed',x===b));f();}));
</script></body></html>`;
fs.writeFileSync(path.join(DIR, 'index.html'), html);
console.log(JSON.stringify({ totaux: T, captures: synthese.captures, parAgent: Object.fromEntries(agents.map((a) => [a.code, totaux(a.cas).cas + ' cas' + (a.rapport ? ', rapport rendu' : '')])), defauts: defauts.length }));
