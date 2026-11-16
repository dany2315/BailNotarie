// Lot 6 — listes en LECTURE SEULE des données historiques à faire valider (rien n'est modifié).
// Sortie : reports/prep/lot6-listes.json (identifiants et valeurs techniques seulement : ni noms, ni
// adresses, ni e-mails).
const fs = require('fs'), path = require('path');
const { client, mainCheckout } = require('./db.cjs');

const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

(async () => {
  const prisma = client();
  try {
    const out = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const result = {};

      // 1. Biens : localisation et surface.
      const properties = await tx.property.findMany({
        select: { id: true, inseeCode: true, latitude: true, longitude: true, surfaceM2: true, fullAddress: true, bails: { select: { id: true, status: true, bailFamily: true } } },
      });
      const live = (p) => p.bails.filter((b) => !['DESISTE', 'CLASSE_SANS_SUITE', 'TERMINATED'].includes(b.status));
      result.biens = {
        total: properties.length,
        sansInsee: properties.filter((p) => !p.inseeCode).map((p) => ({ id: p.id, adresseSaisie: !!p.fullAddress, bauxEnCours: live(p).map((b) => `${b.id}:${b.status}`) })),
        sansCoordonnees: properties.filter((p) => p.latitude == null || p.longitude == null).length,
        sansSurface: properties.filter((p) => !p.surfaceM2 || Number(p.surfaceM2) <= 0).map((p) => ({ id: p.id, bauxEnCours: live(p).map((b) => `${b.id}:${b.status}`) })),
      };

      // 2. Baux d'habitation dont l'encadrement ne peut pas être vérifié par l'adresse.
      const bails = await tx.bail.findMany({
        select: { id: true, status: true, bailFamily: true, bailType: true, createdAt: true, effectiveDate: true, paymentDay: true, paidAt: true, property: { select: { id: true, inseeCode: true } }, parties: { select: { profilType: true } } },
      });
      result.bauxHabitationSansAdresseLocalisee = bails
        .filter((b) => b.bailFamily === 'HABITATION' && !b.property?.inseeCode)
        .map((b) => ({ id: b.id, statut: b.status, bien: b.property?.id }));

      // 3. Brouillons « commercial » avec un type d'habitation.
      result.commerciauxAQualifier = bails
        .filter((b) => b.bailFamily === 'COMMERCIAL' && !['COMMERCIAL_3_6_9', 'COMMERCIAL_DEROGATOIRE'].includes(b.bailType))
        .map((b) => ({ id: b.id, statut: b.status, typeActuel: b.bailType, paye: !!b.paidAt }));

      // 4. Document sans aucun rattachement : indices pour retrouver son propriétaire légitime.
      const orphans = await tx.document.findMany({
        where: { personId: null, entrepriseId: null, clientId: null, propertyId: null, bailId: null, notaireRequestId: null, archivedAt: null },
        select: { id: true, kind: true, createdAt: true, uploadedById: true, fileKey: true, complementItemId: true, bailMessages: { select: { bailId: true } } },
      });
      result.documentsSansRattachement = [];
      for (const doc of orphans) {
        const uploader = doc.uploadedById ? await tx.user.findUnique({ where: { id: doc.uploadedById }, select: { role: true, clientId: true } }) : null;
        // Le chemin du fichier contient parfois l'identifiant d'un lien de formulaire, d'un client ou d'un bien.
        const ids = (doc.fileKey.match(/c[a-z0-9]{24}/g) || []);
        const hints = [];
        for (const id of [...new Set(ids)]) {
          for (const [model, label] of [['client', 'client'], ['property', 'bien'], ['bail', 'bail'], ['person', 'personne'], ['intakeLink', 'lien de formulaire']]) {
            const found = await tx[model].findUnique({ where: { id }, select: { id: true } }).catch(() => null);
            if (found) hints.push(`${label} ${id}`);
          }
        }
        const tokens = doc.fileKey.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{64}/g) || [];
        for (const token of [...new Set(tokens)]) {
          const link = await tx.intakeLink.findUnique({ where: { token }, select: { id: true, clientId: true, target: true } });
          if (link) hints.push(`lien de formulaire ${link.id} (${link.target}, client ${link.clientId})`);
        }
        // Personnes créées ou modifiées le même jour sans pièce d'identité : simples pistes, pas une attribution.
        const sameDay = await tx.person.findMany({
          where: { createdAt: { gte: new Date(doc.createdAt.getTime() - 86400000), lte: new Date(doc.createdAt.getTime() + 86400000) }, documents: { none: { kind: 'ID_IDENTITY' } } },
          select: { id: true, clientId: true },
          take: 10,
        });
        result.documentsSansRattachement.push({
          id: doc.id, type: doc.kind, creeLe: day(doc.createdAt),
          envoyePar: uploader ? `${uploader.role}${uploader.clientId ? ` (client ${uploader.clientId})` : ''}` : 'inconnu',
          dossierDuFichier: doc.fileKey.split('/').slice(0, -1).join('/') || '(racine)',
          indicesDansLeChemin: hints,
          messagesDuChat: doc.bailMessages.map((m) => m.bailId),
          personnesSansPieceCreeesLeMemeJour: sameDay.map((p) => `personne ${p.id} (client ${p.clientId})`),
        });
      }

      // 5. Dates d'effet probablement provisoires (Lot 3) : brouillons dont la date d'effet est le jour de
      //    création du dossier, ou sans jour de paiement. Aucune n'est modifiée.
      result.datesProbablementProvisoires = bails
        .filter((b) => b.status === 'DRAFT' && (day(b.effectiveDate) === day(b.createdAt) || b.paymentDay == null))
        .map((b) => ({ id: b.id, creeLe: day(b.createdAt), dateEffet: day(b.effectiveDate), jourPaiement: b.paymentDay, locataire: b.parties.some((p) => p.profilType === 'LOCATAIRE') }));
      result.bauxSansLocataireAvecDate = bails.filter((b) => !b.parties.some((p) => p.profilType === 'LOCATAIRE') && b.status !== 'DRAFT').map((b) => ({ id: b.id, statut: b.status, dateEffet: day(b.effectiveDate), jourPaiement: b.paymentDay }));

      // 6. Dossiers signés ou clos : état enregistré de complétude des parties (à ne jamais recalculer en masse).
      const signed = await tx.bail.findMany({
        where: { status: { in: ['SIGNED', 'TERMINATED'] } },
        select: { id: true, status: true, parties: { select: { id: true, profilType: true, completionStatus: true } }, property: { select: { id: true, completionStatus: true } } },
      });
      result.dossiersSignes = signed.map((b) => ({ id: b.id, statut: b.status, parties: b.parties.map((p) => `${p.profilType}:${p.completionStatus}`), bien: b.property?.completionStatus }));

      // 7. Statuts atteints sans paiement enregistré (hors liste des paiements historiques, pour mémoire).
      result.pretsPourNotaireSansPaiement = bails.filter((b) => ['READY_FOR_NOTARY', 'CLIENT_CONTACTED'].includes(b.status) && !b.paidAt).map((b) => ({ id: b.id, statut: b.status }));
      return result;
    }, { timeout: 120000 });

    // Complétude : reprise du calcul main/staging de l'audit (functional-impact.json), résumé par exigence.
    const impactPath = path.join(mainCheckout, 'reports/migration-audit-20261116-1794828329442/functional-impact.json');
    const impact = JSON.parse(fs.readFileSync(impactPath, 'utf8'));
    const count = (key) => {
      const tally = {};
      for (const c of impact.clientChanges) for (const item of c[key]) {
        const label = item.replace(/^person:[^:]+:/, 'personne:').replace(/^general:/, 'client:').replace(/^entreprise:[^:]+:/, 'société:');
        tally[label] = (tally[label] || 0) + 1;
      }
      return Object.fromEntries(Object.entries(tally).sort((a, b) => b[1] - a[1]));
    };
    out.completude = {
      fichesDontLesExigencesChangent: impact.clientChanges.length,
      exigencesAjouteesSurStaging: count('added'),
      exigencesRetireesSurStaging: count('removed'),
      deviennentIncompletes: impact.clientChanges.filter((c) => c.beforeComplete && !c.afterComplete).map((c) => ({ client: c.id, statutEnregistre: c.storedCompletion, ajoute: c.added, baux: c.bails.map((b) => `${b.id}:${b.status}`) })),
      deviennentCompletes: impact.clientChanges.filter((c) => !c.beforeComplete && c.afterComplete).map((c) => ({ client: c.id, statutEnregistre: c.storedCompletion, retire: c.removed, baux: c.bails.map((b) => `${b.id}:${b.status}`) })),
    };

    const file = path.join(__dirname, '../../reports/prep/lot6-listes.json');
    fs.writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), lectureSeule: true, ...out }, null, 1));
    console.log(JSON.stringify({
      biens: { total: out.biens.total, sansInsee: out.biens.sansInsee.length, sansCoordonnees: out.biens.sansCoordonnees, sansSurface: out.biens.sansSurface.length },
      bauxHabitationSansAdresseLocalisee: out.bauxHabitationSansAdresseLocalisee.length,
      commerciauxAQualifier: out.commerciauxAQualifier,
      documentsSansRattachement: out.documentsSansRattachement,
      datesProbablementProvisoires: out.datesProbablementProvisoires.length,
      bauxSansLocataireAvecDate: out.bauxSansLocataireAvecDate,
      dossiersSignes: out.dossiersSignes,
      pretsPourNotaireSansPaiement: out.pretsPourNotaireSansPaiement,
      completude: { change: out.completude.fichesDontLesExigencesChangent, ajoutees: out.completude.exigencesAjouteesSurStaging, retirees: out.completude.exigencesRetireesSurStaging, incompletes: out.completude.deviennentIncompletes.length, completes: out.completude.deviennentCompletes.length },
    }, null, 1));
  } finally { await prisma.$disconnect(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
