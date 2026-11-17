// Données FICTIVES de départ pour un agent de recette (copie de test uniquement, comptes en @example.invalid,
// pièces « recette-… » rangées dans la doublure locale de stockage). Chaque agent a ses propres dossiers :
// personne ne dépend du travail d'un autre.
//
//   node scripts/prep/recette/seed.cjs <CODE>     → écrit reports/recette-complete/kit/donnees-<CODE>.json
process.env.PREP_ENV = 'recette';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { client } = require('../db.cjs');
const MOCK = process.env.RECETTE_DIR || 'C:/Users/David/AppData/Local/Temp/claude/46bb82cd32f23d6b/6b9c9afc-1530-404e-8dcb-db49f24796bf/scratchpad/recette2';
const KIT = path.join(__dirname, '../../../reports/recette-complete/kit');

const GUERET = { fullAddress: '1 Place Bonnyaud 23000 Guéret', housenumber: '1', street: 'Place Bonnyaud', city: 'Guéret', postalCode: '23000', inseeCode: '23096', department: '23', region: 'Nouvelle-Aquitaine', latitude: 46.1703, longitude: 1.8716 };
const PARIS = { fullAddress: '10 Rue de Rivoli 75004 Paris', housenumber: '10', street: 'Rue de Rivoli', city: 'Paris', postalCode: '75004', inseeCode: '75104', department: '75', region: 'Île-de-France', latitude: 48.8554, longitude: 2.3594 };
const PRENOMS = ['Camille', 'Louis', 'Inès', 'Hugo', 'Léa', 'Jules', 'Manon', 'Nathan', 'Chloé', 'Théo', 'Sarah', 'Adam'];

// Plans par agent. statut du bail, famille, et options : sansLocataire, locataire ('email' = invité, pas rempli ; 'rempli'),
// locataireSociete, paris, memeProprio (réutilise le propriétaire n° 1), notaire (index du notaire), nonPaye, marie.
const H = 'HABITATION', C = 'COMMERCIAL';
const PLANS = {
  'PRO-D': { notaires: 1, dossiers: [
    { statut: 'SIGNED', famille: H, locataire: 'rempli', notaire: 0 },
    { statut: 'AWAITING_TENANT', famille: H, sansLocataire: true, memeProprio: true },
    { statut: 'PENDING_VALIDATION', famille: H, locataire: 'rempli', memeProprio: true },
    { statut: 'AWAITING_TENANT_FORM', famille: H, locataire: 'email', memeProprio: true },
  ] },
  'PRO-M': { notaires: 1, dossiers: [
    { statut: 'READY_FOR_NOTARY', famille: H, locataire: 'rempli', notaire: 0 },
    { statut: 'AWAITING_TENANT', famille: H, sansLocataire: true, memeProprio: true },
    { statut: 'PENDING_VALIDATION', famille: C, locataire: 'rempli', locataireSociete: true, memeProprio: true },
  ] },
  LOC: { notaires: 1, dossiers: [
    { statut: 'AWAITING_TENANT_FORM', famille: H, locataire: 'email' },
    { statut: 'AWAITING_TENANT_FORM', famille: H, locataire: 'email' },
    { statut: 'AWAITING_TENANT_FORM', famille: H, locataire: 'email' },
    { statut: 'AWAITING_TENANT_FORM', famille: H, locataire: 'email' },
    { statut: 'PENDING_VALIDATION', famille: H, locataire: 'rempli' },
    { statut: 'READY_FOR_NOTARY', famille: H, locataire: 'rempli', notaire: 0 },
    { statut: 'SIGNED', famille: H, locataire: 'rempli', notaire: 0 },
  ] },
  'ADM-1': { notaires: 2, dossiers: [
    { statut: 'DRAFT', famille: H, sansLocataire: true, nonPaye: true },
    { statut: 'AWAITING_TENANT', famille: H, sansLocataire: true },
    { statut: 'AWAITING_TENANT_FORM', famille: H, locataire: 'email' },
    { statut: 'PENDING_VALIDATION', famille: H, locataire: 'rempli' },
    { statut: 'PENDING_VALIDATION', famille: C, locataire: 'rempli', locataireSociete: true },
    { statut: 'READY_FOR_NOTARY', famille: H, locataire: 'rempli', notaire: 0 },
    { statut: 'CLIENT_CONTACTED', famille: H, locataire: 'rempli', notaire: 0 },
    { statut: 'SIGNED', famille: H, locataire: 'rempli', notaire: 1 },
    { statut: 'DRAFT', famille: C, sansLocataire: true, nonPaye: true },
  ] },
  'ADM-2': { notaires: 2, dossiers: [
    { statut: 'PENDING_VALIDATION', famille: H, locataire: 'rempli' },
    { statut: 'PENDING_VALIDATION', famille: H, locataire: 'rempli', marie: true },
    { statut: 'PENDING_VALIDATION', famille: H, locataire: 'rempli', paris: true },
    { statut: 'PENDING_VALIDATION', famille: H, locataire: 'rempli' },
    { statut: 'PENDING_VALIDATION', famille: H, locataire: 'rempli' },
    { statut: 'PENDING_VALIDATION', famille: H, locataire: 'rempli', nonPaye: true },
    { statut: 'AWAITING_TENANT_FORM', famille: H, locataire: 'email' },
    { statut: 'AWAITING_TENANT', famille: H, sansLocataire: true },
    { statut: 'READY_FOR_NOTARY', famille: H, locataire: 'rempli', notaire: 0 },
  ] },
  NOT: { notaires: 2, dossiers: [
    { statut: 'READY_FOR_NOTARY', famille: H, locataire: 'rempli', notaire: 0 },
    { statut: 'READY_FOR_NOTARY', famille: H, locataire: 'rempli', notaire: 0, marie: true },
    { statut: 'READY_FOR_NOTARY', famille: H, locataire: 'rempli', notaire: 0 },
    { statut: 'READY_FOR_NOTARY', famille: C, locataire: 'rempli', locataireSociete: true, notaire: 0 },
    { statut: 'CLIENT_CONTACTED', famille: H, locataire: 'rempli', notaire: 0 },
    { statut: 'SIGNED', famille: H, locataire: 'rempli', notaire: 0 },
    { statut: 'READY_FOR_NOTARY', famille: H, locataire: 'rempli', notaire: 1 },
  ] },
  COM: { notaires: 1, dossiers: [
    { statut: 'PENDING_VALIDATION', famille: C, locataire: 'rempli', locataireSociete: true },
    { statut: 'PENDING_VALIDATION', famille: C, locataire: 'rempli', locataireSociete: true },
    { statut: 'AWAITING_TENANT_FORM', famille: C, locataire: 'email' },
    { statut: 'AWAITING_TENANT_FORM', famille: C, locataire: 'email' },
    { statut: 'AWAITING_TENANT', famille: C, sansLocataire: true },
    { statut: 'READY_FOR_NOTARY', famille: C, locataire: 'rempli', locataireSociete: true, notaire: 0 },
  ] },
  PUB: { notaires: 1, dossiers: [
    { statut: 'PENDING_VALIDATION', famille: H, locataire: 'rempli' },
    { statut: 'READY_FOR_NOTARY', famille: H, locataire: 'rempli', notaire: 0 },
  ] },
};

(async () => {
  const code = process.argv[2];
  const plan = PLANS[code];
  if (!plan) throw Error('Code inconnu. Codes : ' + Object.keys(PLANS).join(', '));
  const slug = code.toLowerCase().replace(/[^a-z0-9]/g, '');
  const mail = (role, n = '') => `recette-${slug}-${role}${n}@example.invalid`;
  fs.mkdirSync(path.join(MOCK, 's3'), { recursive: true }); fs.mkdirSync(KIT, { recursive: true });
  const prisma = client();
  const out = { code, creeLe: new Date().toISOString(), comptes: {}, dossiers: [] };
  try {
    if (await prisma.user.findUnique({ where: { email: mail('admin') } })) throw Error('Données déjà créées pour ' + code);
    const admin = await prisma.user.create({ data: { email: mail('admin'), name: `Équipe Recette ${code}`, emailVerified: true, role: 'ADMINISTRATEUR' } });
    out.comptes.admin = admin.email;
    const notaires = [];
    for (let i = 0; i < plan.notaires; i++) notaires.push(await prisma.user.create({ data: { email: mail('notaire', i + 1), name: `Maître Recette ${code} ${i + 1}`, emailVerified: true, role: 'NOTAIRE' } }));
    out.comptes.notaires = notaires.map((n) => n.email);

    /** Pièce fictive : ligne en base + fichier dans la doublure locale (le zip et l'aperçu fonctionnent). */
    const piece = async (kind, nom, cible) => {
      const fileKey = `documents/${Date.now()}-${crypto.randomUUID()}-recette-${nom}.pdf`;
      fs.writeFileSync(path.join(MOCK, 's3', ('recette/' + fileKey).replace(/[\\/:*?"<>|]/g, '_')), '%PDF-1.4\n% fichier de recette ' + nom + '\n%%EOF');
      return prisma.document.create({ data: { kind, label: `recette-${nom}.pdf`, fileKey, mimeType: 'application/pdf', size: 64, uploadedById: admin.id, ...cible } });
    };

    let proprio1 = null, k = 0;
    for (const [index, d] of plan.dossiers.entries()) {
      const n = index + 1, commercial = d.famille === C;
      // ---- Propriétaire
      let owner = d.memeProprio ? proprio1 : null;
      if (!owner) {
        const c = await prisma.client.create({ data: { type: 'PERSONNE_PHYSIQUE', profilType: 'PROPRIETAIRE', completionStatus: d.statut === 'DRAFT' ? 'PARTIAL' : 'PENDING_CHECK', createdById: admin.id,
          persons: { create: { firstName: PRENOMS[k++ % PRENOMS.length], lastName: `Proprio${code.replace(/[^A-Z0-9]/g, '')}${n}`, email: mail('proprio', n), phone: '+33612345678', fullAddress: '10 rue de Rivoli 75004 Paris', profession: 'Testeuse', nationality: 'Française', familyStatus: 'CELIBATAIRE', birthPlace: 'Paris', birthDate: new Date('1980-01-01T00:00:00Z'), isPrimary: true } } }, include: { persons: true } });
        const u = await prisma.user.create({ data: { email: mail('proprio', n), name: `${c.persons[0].firstName} ${c.persons[0].lastName}`, emailVerified: true, role: 'UTILISATEUR', clientId: c.id } });
        await piece('ID_IDENTITY', `identite-proprio-${slug}-${n}`, { personId: c.persons[0].id });
        owner = { client: c, user: u };
        if (!proprio1) proprio1 = owner;
      }
      // ---- Bien
      const adresse = d.paris ? PARIS : GUERET;
      const property = await prisma.property.create({ data: { ...adresse, fullAddress: adresse.fullAddress.replace(/^1(0)? /, `${n}$1 `), housenumber: String(n), label: `${commercial ? 'Local' : 'Logement'} recette ${code} ${n}`, surfaceM2: commercial ? 80 : 42, type: commercial ? 'BOUTIQUE' : 'APPARTEMENT', legalStatus: 'PLEIN_PROPRIETE', mainRooms: commercial ? null : 2, constructionPeriod: commercial ? null : 'Avant 1946', dpeClass: 'C', gesClass: 'C', ownerId: owner.client.id, completionStatus: d.statut === 'DRAFT' ? 'PARTIAL' : 'PENDING_CHECK', createdById: admin.id } });
      if (d.statut !== 'DRAFT') { await piece('DIAGNOSTICS', `diagnostics-${slug}-${n}`, { propertyId: property.id }); await piece('TITLE_DEED', `titre-${slug}-${n}`, { propertyId: property.id }); }
      // ---- Locataire
      let tenant = null;
      if (!d.sansLocataire) {
        const rempli = d.locataire === 'rempli';
        if (rempli && d.locataireSociete) {
          const c = await prisma.client.create({ data: { type: 'PERSONNE_MORALE', profilType: 'LOCATAIRE', completionStatus: 'PENDING_CHECK', createdById: admin.id,
            entreprise: { create: { registration: '123 456 789 00012', legalName: `SAS Recette ${code} ${n}`, name: `SAS Recette ${code} ${n}`, email: mail('locataire', n), phone: '+33612345679', fullAddress: '3 rue de l’Essai 23000 Guéret', representativeName: 'Louis Recette', representativeRole: 'Président', isRegistered: true, siren: '123456789', siret: '12345678900012' } } }, include: { entreprise: true } });
          await piece('KBIS', `kbis-locataire-${slug}-${n}`, { entrepriseId: c.entreprise.id });
          tenant = { client: c };
        } else {
          const c = await prisma.client.create({ data: { type: 'PERSONNE_PHYSIQUE', profilType: 'LOCATAIRE', completionStatus: rempli ? 'PENDING_CHECK' : 'NOT_STARTED', createdById: admin.id,
            persons: { create: rempli
              ? { firstName: PRENOMS[k++ % PRENOMS.length], lastName: `Locataire${code.replace(/[^A-Z0-9]/g, '')}${n}`, email: mail('locataire', n), phone: '+33612345679', fullAddress: '3 rue de l’Essai 23000 Guéret', profession: 'Testeur', nationality: 'Française', familyStatus: d.marie ? 'MARIE' : 'CELIBATAIRE', matrimonialRegime: d.marie ? 'SEPARATION_DE_BIENS' : null, birthPlace: 'Guéret', birthDate: new Date('1990-03-15T00:00:00Z'), isPrimary: true }
              : { email: mail('locataire', n), isPrimary: true } } }, include: { persons: true } });
          if (rempli) { await piece('ID_IDENTITY', `identite-locataire-${slug}-${n}`, { personId: c.persons[0].id }); if (d.marie) await piece('CONTRAT_DE_MARIAGE', `contrat-mariage-${slug}-${n}`, { clientId: c.id }); }
          tenant = { client: c };
        }
        if (rempli) tenant.user = await prisma.user.create({ data: { email: mail('locataire', n), name: `Locataire Recette ${code} ${n}`, emailVerified: true, role: 'UTILISATEUR', clientId: tenant.client.id } });
      }
      // ---- Bail
      const avecDates = !d.sansLocataire;
      const effective = new Date('2027-02-01T00:00:00Z'), fin = new Date(commercial ? '2036-02-01T00:00:00Z' : '2030-02-01T00:00:00Z');
      const loyer = commercial ? 1500 : d.paris ? 900 : 600, charges = commercial ? 100 : 50, depot = commercial ? 4500 : loyer;
      const paye = !d.nonPaye, maintenant = new Date();
      const confirme = d.locataire === 'rempli';
      const bail = await prisma.bail.create({ data: {
        propertyId: property.id, bailFamily: d.famille, bailType: commercial ? 'COMMERCIAL_3_6_9' : 'BAIL_NU_3_ANS', status: d.statut,
        rentAmount: loyer, monthlyCharges: charges, securityDeposit: depot,
        effectiveDate: avecDates ? effective : null, endDate: avecDates ? fin : null, paymentDay: avecDates ? 5 : null,
        paidAt: paye ? maintenant : null, createdById: admin.id,
        parties: { connect: [{ id: owner.client.id }, ...(tenant ? [{ id: tenant.client.id }] : [])] },
        ...(confirme ? { tenantConfirmedTermsAt: maintenant, tenantConfirmedById: tenant.client.id, tenantConfirmedTerms: { bailFamily: d.famille, bailType: commercial ? 'COMMERCIAL_3_6_9' : 'BAIL_NU_3_ANS', rentAmount: loyer, monthlyCharges: charges, securityDeposit: depot, effectiveDate: '2027-02-01', endDate: commercial ? '2036-02-01' : '2030-02-01', rentPeriodicity: commercial ? 'MONTHLY' : null } } : {}),
        ...(commercial ? { commercialTerms: { create: { activity: 'Vente de vêtements (activité fictive de recette)', previouslyLet: false, rentPeriodicity: 'MONTHLY', vatApplicable: false, indexation: 'ILC', entryFee: 0, feesPaidBy: 'TENANT', hasPastWorks: false, hasPlannedWorks: false, hasGuarantor: false, rentFreeMonths: 0 } } } : {}),
      } });
      // ---- Formulaires, paiement, notaire
      const ownerIntake = await prisma.intakeLink.create({ data: { token: crypto.randomBytes(32).toString('hex'), target: 'OWNER', clientId: owner.client.id, propertyId: property.id, bailId: bail.id, status: d.statut === 'DRAFT' ? 'PENDING' : 'SUBMITTED', submittedAt: d.statut === 'DRAFT' ? null : maintenant, bailFamilyPreference: d.famille, createdById: admin.id } });
      let tenantIntake = null;
      if (tenant) tenantIntake = await prisma.intakeLink.create({ data: { token: crypto.randomUUID(), target: 'TENANT', clientId: tenant.client.id, propertyId: property.id, bailId: bail.id, status: d.locataire === 'rempli' ? 'SUBMITTED' : 'PENDING', submittedAt: d.locataire === 'rempli' ? maintenant : null, formEmailSentAt: maintenant, formEmailCount: 1, createdById: admin.id } });
      if (paye) await prisma.dossierPayment.create({ data: { stripePaymentIntentId: 'pi_recette_' + crypto.randomBytes(8).toString('hex'), status: 'SUCCEEDED', amountCents: commercial ? 5990 : 3990, currency: 'eur', intakeLinkId: ownerIntake.id, bailId: bail.id, stripePaidAt: maintenant, confirmedAt: maintenant, attachedAt: maintenant } });
      if (d.notaire !== undefined) await prisma.dossierNotaireAssignment.create({ data: { clientId: owner.client.id, propertyId: property.id, bailId: bail.id, notaireId: notaires[d.notaire].id, assignedById: admin.id } });
      out.dossiers.push({
        n, bailId: bail.id, statut: d.statut, famille: d.famille, adresse: property.fullAddress, bienId: property.id, paye,
        proprietaire: { email: owner.user.email, clientId: owner.client.id, formulaire: `/commencer/proprietaire/${ownerIntake.token}` },
        locataire: tenant ? { email: mail('locataire', n), clientId: tenant.client.id, rempli: d.locataire === 'rempli', societe: !!d.locataireSociete, aUnCompte: !!tenant.user, formulaire: `/intakes/${tenantIntake.token}` } : null,
        notaire: d.notaire !== undefined ? notaires[d.notaire].email : null,
        particularites: [d.paris && 'Paris (encadrement des loyers)', d.marie && 'locataire marié, séparation de biens', d.memeProprio && 'même propriétaire que le dossier 1', d.nonPaye && 'frais non payés'].filter(Boolean),
      });
    }
    fs.writeFileSync(path.join(KIT, `donnees-${code}.json`), JSON.stringify(out, null, 1));
    console.log(code + ' : ' + out.dossiers.length + ' dossiers fictifs, comptes ' + JSON.stringify(out.comptes));
  } finally { await prisma.$disconnect(); }
})().catch((e) => { console.error('ÉCHEC ' + e.message.split('\n').slice(-3).join(' | ')); process.exit(1); });
