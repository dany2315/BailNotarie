// A.4 — Questionnaire commercial complet sur téléphone (Pixel 7, Chromium), second compte neuf, bail dérogatoire de 24 mois,
//        société saisie à la main (numéro introuvable au registre), bureau dans un lotissement / ensemble immobilier, jusqu'au paiement.
// Relançable : reprend à l'étape où le dossier en est.
const o = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/COM/scripts/outils.cjs'); const { R } = o;
const APPAREIL = process.env.APPAREIL || 'telephone';
const EMAIL = process.env.COMPTE || 'recette-com-nouveau2@example.invalid';
const LOC = process.env.LOCATAIRE || 'recette-com-locnouveau2@example.invalid';
const N = Number(process.env.BASE_ID || 40);
const id = (k) => 'COM-' + String(N + k).padStart(3, '0');
const cap = (nom) => `com-${String(N).padStart(3, '0')}-${APPAREIL}-${nom}`;
(async () => {
  const existe = R.sql(`SELECT il.token FROM "IntakeLink" il JOIN "User" u ON u."clientId"=il."clientId" WHERE u.email='${EMAIL}' AND il.target='OWNER' ORDER BY il."createdAt" DESC LIMIT 1`)[0]?.token;
  const s = await R.ouvrir({ appareil: APPAREIL, compte: existe ? EMAIL : null });
  const P = require('C:/Users/David/Desktop/BailNotarie/.claude/worktrees/prep-pr-main/reports/recette-complete/COM/scripts/parcours.cjs')(s); const { p, f } = P; const r = R.rapport('ORCH');
  const cas = (c) => { r.cas({ role: 'Propriétaire', appareil: APPAREIL, domaine: 'Questionnaire commercial (téléphone)', ...c }); r.ecrire(); };
  const ko = (ok, gravite = 'mineur', origine = 'inconnue') => (ok ? {} : { gravite, origine });
  const ecran = async (nom) => { const d = await R.debordement(p); const c = await R.capture(p, 'ORCH', cap(nom)); const b = await p.getByRole('button', { name: /^(Continuer|Payer)/ }).last().boundingBox().catch(() => null); const vp = p.viewportSize(); return { deborde: d.deborde, coupables: d.coupables, capture: c, boutonVisible: !!b && b.y >= 0 && b.y + b.height <= vp.height + 1 && b.x >= 0 && b.x + b.width <= vp.width + 1 }; };
  const debords = []; const ecransVus = [];
  const note = (nom, e) => { ecransVus.push(nom); if (e.deborde || !e.boutonVisible) debords.push(`${nom} : débordement ${e.deborde} ${e.coupables.join(' ; ')} ; bouton principal visible ${e.boutonVisible}`); };
  let jeton = existe;
  try {
    if (!existe) {
      // ---- Accueil → badge « bail commercial »
      await p.goto(R.BASE + '/', { waitUntil: 'domcontentloaded' }); await R.attendre(3000);
      const lien = p.locator('a[href="/commencer?bail=commercial"]');
      const nbLiens = await lien.count(); let visible = false;
      for (let i = 0; i < nbLiens; i++) if (await lien.nth(i).isVisible()) { visible = true; await lien.nth(i).scrollIntoViewIfNeeded(); await R.capture(p, 'ORCH', cap('accueil-badge'), { entiere: false }); await lien.nth(i).click(); break; }
      if (!visible) await p.goto(R.BASE + '/commencer?bail=commercial', { waitUntil: 'domcontentloaded' });
      await p.locator('#email').waitFor(); await R.attendre(1200);
      const titre = ((await o.texteSansListes(p)).match(/[^\n]*bail notarié[^\n]*commence ici[^\n]*/i) || ['(titre non trouvé)'])[0];
      const e0 = await ecran('commencer');
      const ok0 = visible && /commercial/i.test(titre) && !e0.deborde;
      cas({ id: id(0), role: 'Visiteur', fonctionnalite: 'Accueil → « bail commercial » → page de démarrage', etapes: 'Sur l\'accueil, toucher le lien « bail commercial » ; lire la page de démarrage', attendu: 'Lien visible sur téléphone ; arrivée sur /commencer?bail=commercial avec un titre « bail notarié commercial » ; pas de défilement horizontal', constate: `Liens présents : ${nbLiens}, un lien visible : ${visible} ; titre : « ${titre} » ; débordement : ${e0.deborde}`, statut: ok0 ? 'OK' : 'PARTIEL', capture: e0.capture, ...ko(ok0) });
      // e-mail vide
      await p.getByRole('button', { name: 'Continuer' }).click(); await R.attendre(1500);
      const tVide = (await o.texteSansListes(p, 'main')).match(/[^\n]*(requis|invalide|obligatoire)[^\n]*/i);
      jeton = await P.inscrire(EMAIL, { depuisAccueil: false });
      const pre = await f.choisie(/^Commercial/); const e1 = await ecran('etape1-type-de-bail'); note('Type de bail', e1);
      const m = R.emails({ pour: EMAIL }).pop();
      cas({ id: id(1), fonctionnalite: 'Inscription par code et type « Commercial » présélectionné', etapes: 'E-mail vide puis e-mail neuf, code reçu par e-mail saisi ; première étape du questionnaire', attendu: 'E-mail vide refusé ; code reçu ; « Commercial » déjà sélectionné à l\'étape « Type de bail »', constate: `E-mail vide : ${tVide ? tVide[0] : 'aucun message'} ; e-mail du code : « ${(m?.subject || '').replace(/\d{6}/, '······')} » ; « Commercial » présélectionné : ${pre} ; étape : ${(await f.etape()).join(' ')}`, statut: pre && tVide ? 'OK' : 'PARTIEL', capture: e1.capture, ...ko(pre && !!tVide) });
    } else {
      await p.goto(R.BASE + '/commencer/proprietaire/' + jeton, { waitUntil: 'commit' });
      await o.attendreTexte(p, /Étape \d+\//, 40000); await R.attendre(2500);
    }
    const titreEtape = async () => (await f.etape())[0];
    console.log('départ :', await f.etape());

    for (let passe = 0; passe < 4 && !/success/.test(p.url()); passe++) {
    console.log('passe', passe, await f.etape());
    if (await titreEtape() === 'Type de bail') { const e = await ecran('etape1-type-de-bail'); note('Type de bail', e); await P.valider(); await f.versEtape(2, 20000); }
    if (await titreEtape() === 'Informations client' && !(await p.locator('[id="entreprise.registration"]').count())) { await P.retour(); await R.attendre(1200); }
    if (await titreEtape() === 'Type de client') {
      const defaut = await f.choisie(/^Particulier/); const e = await ecran('etape2-type-de-client');
      await f.carte(/^Entreprise/); const b = await P.valider();
      cas({ id: id(2), fonctionnalite: 'Type de client : « Entreprise »', etapes: 'Étape « Type de client » : observer le choix par défaut, choisir « Entreprise », « Continuer »', attendu: 'Passage aux informations de la société', constate: '« Particulier » présélectionné par défaut : ' + defaut + ' ; après « Entreprise » : étape ' + b.etape + ' (' + b.titre + ') ; débordement : ' + e.deborde, statut: b.etape === '3' && !e.deborde ? 'OK' : 'KO', capture: e.capture, ...ko(b.etape === '3' && !e.deborde, 'majeur') });
    }
    if (await titreEtape() === 'Informations client') {
      const siren = P.sirenFictif('99999998');
      const reg = p.locator('[id="entreprise.registration"]');
      await reg.fill('12345'); const a = await P.valider();
      const msg = await P.societeManuelle({ siren, nom: 'SCI Recette COM Nouveau Deux', adresse: '12 rue de l’Essai 23000 Guéret', representant: 'Alex Recette', fonction: 'Gérant', telephone: '+33612345671' });
      const e = await ecran('etape3-societe-manuelle'); note('Informations client', e);
      const b = await P.valider();
      cas({ id: id(3), fonctionnalite: 'Société : numéro incomplet, numéro introuvable au registre, saisie manuelle', etapes: 'SIREN « 12345 » puis « Continuer » ; SIREN valide mais inconnu ; « Compléter les informations moi-même » ; raison sociale, siège, représentant légal, fonction, téléphone', attendu: 'Numéro incomplet refusé ; message « pas retrouvé » avec saisie manuelle possible ; représentant légal demandé ; passage au récapitulatif', constate: `Numéro incomplet : étape ${a.etape}, ${a.erreurs.join(' / ') || 'aucun message'} ; registre : « ${msg} » ; après saisie manuelle : étape ${b.etape} (${b.titre}) ; débordement : ${e.deborde}`, statut: a.etape === '3' && a.erreurs.length && msg && b.etape === '4' && !e.deborde ? 'OK' : 'KO', capture: e.capture, ...ko(a.etape === '3' && a.erreurs.length > 0 && !!msg && b.etape === '4' && !e.deborde, 'majeur') });
    }
    if (await titreEtape() === 'Récapitulatif') {
      const t = await f.T(); const e = await ecran('etape4-recapitulatif'); note('Récapitulatif', e);
      const sansNom = /Personne sans nom/.test(t);
      cas({ id: id(4), fonctionnalite: 'Récapitulatif du propriétaire société', etapes: 'Lire l\'étape « Récapitulatif » après la saisie de la société', attendu: 'La société et son représentant ; aucune ligne vide ou « sans nom »', constate: `Texte : ${t.split('\n').slice(3, 9).join(' | ')}`, statut: sansNom ? 'PARTIEL' : 'OK', capture: e.capture, ...(sansNom ? { gravite: 'cosmetique', origine: 'staging' } : {}) });
      await P.valider();
    }
    if (await titreEtape() === 'Le local') {
      await P.local({ libelle: 'Bureau Recette COM N2', adresse: '7 Place Bonnyaud 23000 Gu', suggestion: '7 Place Bonnyaud 23000 Guéret', type: /^Bureau/, surface: '120.5' });
      const surf = await p.locator('input[name=propertySurfaceM2]').inputValue();
      // info-bulle de la surface
      const bulle = p.locator('div', { has: p.locator('label', { hasText: 'Surface' }) }).last().locator('button').first();
      await bulle.click().catch(() => {}); await R.attendre(900);
      const tBulle = ((await p.locator('[role=tooltip], [data-radix-popper-content-wrapper]').allInnerTexts()).join(' ') || '').replace(/\s+/g, ' ').trim();
      const e = await ecran('etape5-local'); note('Le local', e);
      await p.keyboard.press('Escape').catch(() => {}); await p.locator('#propertyLabel').click().catch(() => {});
      const hab = /logement|habitable|Boutin/i.test(tBulle);
      cas({ id: id(5), domaine: 'Cohérences', fonctionnalite: 'Le local : libellés propres au bail commercial (info-bulle de la surface)', etapes: 'Étape « Le local » : choisir « Bureau », saisir la surface, ouvrir l\'info-bulle de la surface', attendu: 'Aucune mention du logement ou de la surface habitable pour un local commercial', constate: `Surface saisie « 120.5 » → champ « ${surf} » ; info-bulle : « ${tBulle || 'non lue'} »`, statut: tBulle ? (hab ? 'KO' : 'OK') : 'NON_TESTE', capture: e.capture, ...(tBulle && hab ? { gravite: 'cosmetique', origine: 'staging' } : {}) });
      await P.valider();
    }
    if (await titreEtape() === 'Caractéristiques du local') {
      const a = await P.valider();
      await P.regime('Lotissement');
      const persiste = (await f.erreurs()).includes('Le statut légal est requis');
      const question = (await f.T()).includes('plus de 10 ans');
      await f.carte(/^Dans un autre ensemble immobilier/);
      const b = await P.valider();
      await f.carte(/^Non, il y a moins de 10 ans/);
      const e = await ecran('etape6-lotissement-ensemble'); note('Caractéristiques du local', e);
      const c = await P.valider();
      cas({ id: id(6), fonctionnalite: 'Caractéristiques du local : lotissement et « autre ensemble immobilier »', etapes: '« Continuer » à vide ; régime « Lotissement » ; « Dans un autre ensemble immobilier » ; « Continuer » sans l\'ancienneté du lotissement, puis « moins de 10 ans »', attendu: 'Régime et situation obligatoires ; ancienneté du lotissement demandée et obligatoire', constate: `À vide : ${a.erreurs.join(' / ')} ; question d'ancienneté affichée : ${question} ; sans ancienneté : étape ${b.etape}, ${b.erreurs.join(' / ') || 'aucun message'} ; ensuite : étape ${c.etape} ; le message « Le statut légal est requis » reste affiché après le choix du régime : ${persiste}`, statut: a.erreurs.length >= 2 && question && b.etape === '6' && c.etape === '7' ? (persiste ? 'PARTIEL' : 'OK') : 'KO', capture: e.capture, ...(a.erreurs.length >= 2 && question && b.etape === '6' && c.etape === '7' ? (persiste ? { gravite: 'cosmetique', origine: 'staging' } : {}) : { gravite: 'majeur', origine: 'inconnue' }) });
    }
    if (await titreEtape() === "L'activité") {
      await p.locator('[id="commercial.activity"]').fill('Cabinet de conseil en gestion (activité fictive de recette)');
      await f.ouiNon('Le local a-t-il déjà été loué', 'Non');
      const e = await ecran('etape7-activite'); note('L\'activité', e);
      await P.valider();
    }
    if (await titreEtape() === 'Durée du bail') {
      await f.carte(/^Bail dérogatoire/); await R.attendre(500);
      await f.nombre('commercial.derogatoryMonths').fill('37'); const a = await P.valider();
      await f.nombre('commercial.derogatoryMonths').fill('36'); await R.attendre(300);
      await f.nombre('commercial.derogatoryMonths').fill('24');
      await p.locator('#commercialKeys').fill('25/02/2027'); await p.locator('#commercialKeys').blur();
      const e = await ecran('etape8-derogatoire'); note('Durée du bail', e);
      const b = await P.valider();
      cas({ id: id(7), fonctionnalite: 'Bail dérogatoire sur téléphone : 37 mois refusé, 24 mois accepté, remise des clés', etapes: 'Choisir « Bail dérogatoire », 37 mois puis 24 mois, remise des clés le 25/02/2027', attendu: '37 mois refusé (36 au plus) ; 24 mois accepté', constate: `37 mois : étape ${a.etape}, ${a.erreurs.join(' / ') || 'aucun message'} ; 24 mois : étape ${b.etape} (${b.titre}) ; débordement : ${e.deborde}`, statut: a.etape === '8' && a.erreurs.length && b.etape === '9' ? 'OK' : 'KO', capture: e.capture, ...ko(a.etape === '8' && a.erreurs.length > 0 && b.etape === '9', 'majeur') });
    }
    if (await titreEtape() === 'Le loyer') {
      const ilat = await f.choisie(/activités tertiaires/);
      await f.nombre('bailRentAmount').fill('1800'); await f.carte(/^Mensuel$/); await f.ouiNon('soumis à la TVA', 'Non');
      await f.carte(/^Pas de révision$/); await f.ouiNon('franchise', 'Non');
      const e = await ecran('etape9-loyer'); note('Le loyer', e);
      const b = await P.valider();
      cas({ id: id(8), fonctionnalite: 'Le loyer sur téléphone : ILAT proposé pour un bureau, « Pas de révision », sans TVA ni franchise', etapes: 'Loyer 1 800 € mensuel, TVA non, « Pas de révision », franchise non', attendu: 'ILAT présélectionné pour un bureau ; étape acceptée', constate: `ILAT présélectionné : ${ilat} ; étape suivante : ${b.etape} (${b.titre}) ; débordement : ${e.deborde}`, statut: ilat && b.etape === '10' ? 'OK' : 'KO', capture: e.capture, ...ko(ilat && b.etape === '10', 'majeur') });
    }
    if (await titreEtape() === 'Dépôt et frais') {
      await f.nombre('bailMonthlyCharges').fill('0'); await f.nombre('bailSecurityDeposit').fill('5400');
      await f.ouiNon('pas-de-porte', 'Non'); await f.carte(/^À parts égales$/);
      const e = await ecran('etape10-depot'); note('Dépôt et frais', e);
      const b = await P.valider();
      cas({ id: id(9), fonctionnalite: 'Dépôt et frais sur téléphone : provision à 0, sans pas-de-porte, frais partagés', etapes: 'Provision 0 €, dépôt 5 400 €, pas-de-porte non, frais « À parts égales »', attendu: 'Provision à 0 acceptée ; étape acceptée', constate: `Étape suivante : ${b.etape} (${b.titre}) ; messages : ${b.erreurs.join(' / ') || 'aucun'} ; débordement : ${e.deborde}`, statut: b.etape === '11' ? 'OK' : 'KO', capture: e.capture, ...ko(b.etape === '11', 'majeur') });
    }
    if (await titreEtape() === 'Charges et travaux') {
      await f.ouiNon('travaux dans le local ces 3 dernières années', 'Non'); await f.ouiNon('travaux dans les 3 prochaines années', 'Non');
      const e = await ecran('etape11-charges'); note('Charges et travaux', e);
      await P.valider();
    }
    if (await titreEtape() === 'Garanties et clauses') {
      await f.ouiNon('garante du locataire', 'Non');
      const e = await ecran('etape12-clauses'); note('Garanties et clauses', e);
      await P.valider();
    }
    if (await titreEtape() === 'Locataire') {
      await p.locator('#tenantEmail').fill(LOC); await R.attendre(800);
      await f.nombre('bailPaymentDay').fill('10');
      const date = p.locator('#bailEffectiveDate'); await date.fill('31/02/2027'); await date.blur(); await R.attendre(600);
      const a = await P.valider();
      if (a.etape !== '13') await P.retour();
      await date.fill('01/03/2027'); await date.blur(); await R.attendre(1000);
      const fin = ((await f.T()).match(/Le bail se terminera le [^\n.]*/) || [''])[0];
      const e = await ecran('etape13-locataire'); note('Locataire', e);
      const b = await P.valider();
      const bail = R.sql(`SELECT b."bailType", b."effectiveDate", b."endDate", b."paymentDay" FROM "Bail" b JOIN "IntakeLink" il ON il."bailId"=b.id WHERE il.token='${jeton}'`)[0] || {};
      const finBase = String(bail.endDate || '').slice(0, 10);
      const ok = /1 mars 2029/.test(fin) && finBase === '2029-03-01' && b.etape === '14';
      cas({ id: id(10), fonctionnalite: 'Locataire sur téléphone : date impossible refusée, date de fin du bail dérogatoire (24 mois)', etapes: 'E-mail du locataire, jour 10, date « 31/02/2027 » puis « 01/03/2027 »', attendu: 'Date impossible refusée ; « Le bail se terminera le 1 mars 2029 » ; en base : fin au 01/03/2029', constate: `31/02/2027 : étape ${a.etape}, ${[...a.erreurs, ...a.toasts].join(' / ') || 'aucun message'} ; à l'écran : « ${fin} » ; en base : type ${bail.bailType}, effet ${String(bail.effectiveDate).slice(0, 10)}, fin ${finBase}, jour ${bail.paymentDay} ; étape suivante : ${b.etape}`, statut: ok && a.etape === '13' ? 'OK' : ok ? 'PARTIEL' : 'KO', capture: e.capture, ...ko(ok && a.etape === '13', ok ? 'mineur' : 'majeur') });
    }
    if (await titreEtape() === 'Documents') {
      await R.attendre(1500);
      const t = await f.T();
      const obligatoires = await p.locator('label').evaluateAll((ls) => ls.map((l) => l.innerText.trim()).filter((x) => / \*$/.test(x)));
      console.log('pièces obligatoires affichées :', obligatoires);
      // sans pièce : lecture immédiate des notifications
      await p.getByRole('button', { name: 'Continuer vers le paiement' }).click();
      const vus = new Set(); for (let i = 0; i < 20; i++) { for (const x of await P.toasts()) vus.add(x); if (vus.size && i > 6) break; await R.attendre(400); }
      const e = await ecran('etape14-pieces-manquantes'); note('Documents', e);
      const refus = [...vus].join(' / '); const et = await f.etape();
      cas({ id: id(11), fonctionnalite: 'Documents : envoi refusé sans les pièces obligatoires', etapes: 'Étape « Documents », « Continuer vers le paiement » sans aucun fichier', attendu: 'Refus avec la liste des pièces manquantes', constate: `Pièces marquées obligatoires : ${obligatoires.join(' ; ')} ; étape après clic : ${et[1]} ; message : ${refus || 'aucun'}`, statut: et[1] === '14' && /joindre|manquant/i.test(refus) ? 'OK' : et[1] === '14' ? 'PARTIEL' : 'KO', capture: e.capture, ...ko(et[1] === '14' && /joindre|manquant/i.test(refus), et[1] === '14' ? 'mineur' : 'bloquant') });
      const asl = obligatoires.find((x) => /association syndicale/.test(x)); const lot = obligatoires.find((x) => /lotissement/i.test(x));
      const depots = [];
      for (const [k, label] of obligatoires.entries()) depots.push(label + ' → ' + await P.deposer(label, 'tel-piece-' + (k + 1)));
      await P.deposer('Plans du local', 'tel-plans').catch(() => {});
      const e2 = await ecran('etape14-pieces-deposees');
      const sansHab = !/DPE|encadrement|logement/i.test(t);
      cas({ id: id(12), fonctionnalite: 'Documents : pièces propres au cas (société, lotissement récent, ensemble immobilier) et dépôt sur téléphone', etapes: 'Lire la liste des pièces ; déposer chaque pièce obligatoire et « Plans du local »', attendu: 'Kbis ou statuts de la société, diagnostics, titre de propriété, règlement du lotissement, cahier des charges de l\'association syndicale ; chaque dépôt apparaît', constate: `Pièce « association syndicale » demandée : ${!!asl} ; pièce du lotissement demandée : ${!!lot} ; dépôts : ${depots.join(' ; ')} ; aucune mention d'habitation : ${sansHab} ; débordement : ${e2.deborde}`, statut: asl && lot && depots.every((x) => /true$/.test(x)) && !e2.deborde ? 'OK' : 'PARTIEL', capture: e2.capture, ...ko(!!asl && !!lot && depots.every((x) => /true$/.test(x)) && !e2.deborde) });
      await p.getByRole('button', { name: 'Continuer vers le paiement' }).click(); await P.fini(); await f.versEtape(15, 40000);
    }
    if (await titreEtape() === 'Paiement') {
      await o.attendreSans(p, /Chargement\.\.\.|Initialisation du paiement/, 45000); await R.attendre(4000);
      const t = await f.T(); const e = await ecran('etape15-paiement'); note('Paiement', e);
      const okEcran = /59,90\s*€/.test(t) && /fixés librement/.test(t) && !e.deborde;
      cas({ id: id(13), domaine: 'Paiement', fonctionnalite: 'Écran de paiement sur téléphone (59,90 €, honoraires « fixés librement »)', etapes: 'Arriver sur « Paiement »', attendu: '59,90 € TTC, honoraires « fixés librement », cadre de carte utilisable, pas de défilement horizontal', constate: `59,90 € : ${/59,90\s*€/.test(t)} ; « fixés librement » : ${/fixés librement/.test(t)} ; débordement : ${e.deborde} ${e.coupables.join(' ; ')}`, statut: okEcran ? 'OK' : 'KO', capture: e.capture, ...ko(okEcran, 'majeur') });
      const t0 = new Date();
      await P.carte('4242 4242 4242 4242');
      await p.getByText(/J'accepte les Conditions/).first().click(); await R.attendre(800); if (await P.boutonPayer().isDisabled()) { await p.getByRole('checkbox').last().click(); await R.attendre(800); }
      await R.capture(p, 'ORCH', cap('etape15-carte-saisie'));
      await P.boutonPayer().click();
      await p.waitForURL(/success/, { timeout: 120000 }).catch(() => {});
      await R.attendre(6000);
      const url = p.url().replace(jeton, '<jeton>').replace(R.BASE, '');
      const tFin = await o.texteSansListes(p); const eS = await ecran('succes');
      const lien = R.sql(`SELECT status FROM "IntakeLink" WHERE token='${jeton}'`)[0];
      const bail = R.sql(`SELECT b.id, b.status, b."paidAt", b."endDate" FROM "Bail" b JOIN "IntakeLink" il ON il."bailId"=b.id WHERE il.token='${jeton}'`)[0] || {};
      const stripe = R.etatPaiement(jeton);
      const toastsFin = await P.toasts();
      console.log('APRES PAIEMENT', url, JSON.stringify(lien), JSON.stringify(bail), stripe.statut, toastsFin);
      console.log(tFin.slice(0, 900));
      const okPaye = /success/.test(url) && lien?.status === 'SUBMITTED' && !!bail.paidAt;
      cas({ id: id(14), domaine: 'Paiement', fonctionnalite: 'Paiement par carte de test sur téléphone, soumission du dossier, page de succès', etapes: 'Saisir 4242 4242 4242 4242 dans le cadre Stripe, cocher les conditions, payer', attendu: 'Paiement accepté, dossier soumis (formulaire « SUBMITTED », bail payé « en attente du locataire »), page de succès', constate: `Adresse : ${url.slice(0, 60)} ; Stripe : ${stripe.statut} (${stripe.recu / 100} € reçus) ; formulaire : ${lien?.status} ; bail : ${bail.status}, payé le ${bail.paidAt ? String(bail.paidAt).slice(0, 10) : 'non renseigné'} ; messages : ${toastsFin.join(' / ').slice(0, 120) || 'aucun'} ; texte : ${tFin.split('\n').slice(0, 4).join(' | ').slice(0, 200)}`, statut: okPaye ? 'OK' : 'KO', capture: eS.capture, ...ko(okPaye, 'bloquant') });
      await R.attendre(5000);
      const mails = R.emails({ depuis: t0 }).filter((m) => /recette-com/.test(JSON.stringify(m.to)));
      const ev = R.evenements({ depuis: t0 }).filter((x) => /recette-com-(loc)?nouveau2/.test(JSON.stringify(x)));
      console.log('EMAILS', mails.map((m) => JSON.stringify(m.to) + ' | ' + m.subject));
      console.log('EVENEMENTS', ev.map((x) => x.name + ' ' + JSON.stringify(x.data || {}).replace(/[a-f0-9]{40,}/g, '<jeton>').slice(0, 400)));
    }
    }
    cas({ id: id(15), fonctionnalite: 'Questionnaire commercial sur téléphone : mise en page de toutes les étapes', etapes: 'Parcourir les 15 étapes sur Pixel 7 (412 px) ; à chaque étape : défilement horizontal, bouton principal dans l\'écran', attendu: 'Aucun débordement, bouton « Continuer » toujours atteignable', constate: (debords.length ? debords.join(' | ') : 'Aucun débordement relevé et bouton principal visible') + ' — écrans contrôlés pendant cette exécution : ' + ([...new Set(ecransVus)].join(', ') || 'aucun'), statut: ecransVus.length < 8 ? 'NON_TESTE' : debords.length ? 'PARTIEL' : 'OK', ...(debords.length ? { gravite: 'mineur', origine: 'inconnue' } : {}) });
  } catch (err) { console.error('ERREUR', String(err.message).slice(0, 800)); await R.capture(p, 'ORCH', 'erreur-a8-' + APPAREIL); console.log((await f.T().catch(() => '')).slice(0, 1500)); }
  r.ecrire();
  const j = s.journal; console.log('JOURNAL', JSON.stringify({ erreursPage: j.erreursPage, r5xx: j.reponses5xx.length, ech: j.requetesEchouees, console: j.console.filter((c) => !/404|402/.test(c.texte)).slice(0, 4) }));
  await s.fermer();
})();
