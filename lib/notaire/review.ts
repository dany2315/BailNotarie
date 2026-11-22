// Vérification du notaire : les pièces du dossier, chacune avec ce qu'elle prouve (mêmes briques que la fiche de
// l'équipe), et ses propres validations, séparées de celles de l'équipe (clés « notaire: »).
// Pas de "use server" : lecture appelée par la page du notaire et par l'action de statut, après contrôle d'accès.

import { prisma } from "@/lib/prisma";
import { buildPartyPoints, partyPieceRows } from "@/components/admin/party-check-section";
import { buildChecklistRows, toChecklistDocument, type ChecklistRow } from "@/lib/utils/document-checklist";
import { getRequiredPropertyFields } from "@/lib/utils/required-fields";
import { NOTAIRE_KEY_PREFIX, pointKey } from "@/lib/utils/verification";
import type { PieceGroup } from "@/components/admin/fiche/pieces-section";

export interface NotaireReview {
  groups: PieceGroup[];
  /** Pièces déposées que le notaire n'a pas encore validées. */
  toVerify: number;
  /** Pièces obligatoires absentes. */
  missing: number;
  done: boolean;
  /** Pourquoi « Le bail est signé » n'est pas encore possible (null quand c'est possible). */
  reason: string | null;
}

/** Dossier tel que le notaire le lit (parties avec personnes, société et leurs pièces ; bien ; bail). */
type ReviewAssignment = {
  property?: any | null;
  bail?: {
    id: string;
    bailFamily?: string | null;
    property?: any | null;
    documents: any[];
    parties: any[];
  } | null;
};

const docKey = (row: ChecklistRow) => pointKey(`doc:${row.key}`, row.documents.map((d) => d.id).sort());

/**
 * Pièces du dossier pour le notaire, rangées comme dans la fiche de l'équipe, et l'état de sa vérification.
 * `checkedKeys` : clés validées sur ce bail (celles du notaire commencent par « notaire: »).
 */
export function notaireReview(
  a: ReviewAssignment,
  checkedKeys: Iterable<string>,
  askable: (role: "OWNER" | "TENANT") => boolean,
): NotaireReview {
  const bail = a.bail;
  const property = bail?.property ?? a.property ?? null;
  const commercial = bail?.bailFamily === "COMMERCIAL";
  // Clés du notaire, sans leur préfixe : mêmes empreintes que la fiche de l'équipe.
  const mine = new Set([...checkedKeys].filter((key) => key.startsWith(NOTAIRE_KEY_PREFIX)).map((key) => key.slice(NOTAIRE_KEY_PREFIX.length)));
  const own = (key: string) => `${NOTAIRE_KEY_PREFIX}${key}`;

  // Le notaire ne dépose ni ne supprime de fichier : il valide, corrige les données, ou demande au client.
  const forNotaire = (rows: ChecklistRow[]) =>
    rows
      .filter((row) => row.documents.length > 0 || row.required)
      .map((row) => ({
        ...row,
        upload: undefined,
        linkedPoints: row.linkedPoints?.map((linked) => ({ ...linked, key: own(linked.key) })),
      }));
  const verificationOf = (rows: ChecklistRow[]) => ({
    bailId: bail?.id ?? "",
    locked: !bail,
    points: Object.fromEntries(rows.map((row) => [row.key, { pointKey: own(docKey(row)), verified: mine.has(docKey(row)) }])),
  });

  const groups: PieceGroup[] = [];
  const parties = bail?.parties ?? [];
  for (const [role, profil, title] of [
    ["OWNER", "PROPRIETAIRE", "Propriétaire"],
    ["TENANT", "LOCATAIRE", "Locataire"],
  ] as const) {
    for (const party of parties.filter((p: any) => p.profilType === profil)) {
      const points = buildPartyPoints(party, null, party.documents ?? [], profil, { commercial });
      const rows = forNotaire(partyPieceRows(points, false, mine));
      if (rows.length === 0) continue;
      groups.push({
        id: `notaire-${party.id}`,
        title,
        name: points.name,
        rows,
        verification: verificationOf(rows),
        complement: bail && askable(role) ? { bailId: bail.id, target: role } : undefined,
        editable: true,
      });
    }
  }
  if (property) {
    const rows = forNotaire(
      buildChecklistRows(
        getRequiredPropertyFields(property.legalStatus, property.subdivisionOver10Years).requiredDocuments,
        (property.documents ?? []).map(toChecklistDocument),
        { keyPrefix: `property-${property.id}`, target: { propertyId: property.id } },
      ),
    );
    if (rows.length > 0) {
      groups.push({
        id: "notaire-logement",
        title: "Le logement",
        rows,
        verification: verificationOf(rows),
        complement: bail && askable("OWNER") ? { bailId: bail.id, target: "OWNER" } : undefined,
        editable: true,
      });
    }
  }
  if (bail) {
    const rows = forNotaire(buildChecklistRows([], bail.documents.map(toChecklistDocument), { keyPrefix: `bail-${bail.id}`, target: { bailId: bail.id } }));
    if (rows.length > 0) {
      groups.push({
        id: "notaire-bail",
        title: "Le bail",
        rows,
        verification: verificationOf(rows),
        complement: askable("OWNER") ? { bailId: bail.id, target: "OWNER" } : undefined,
        editable: true,
      });
    }
  }

  let toVerify = 0;
  let missing = 0;
  for (const group of groups) {
    for (const row of group.rows) {
      if (row.documents.length === 0) {
        if (row.required) missing += 1;
        continue;
      }
      const point = group.verification?.points[row.key];
      if (!point?.verified || (row.linkedPoints ?? []).some((linked) => !linked.verified)) toVerify += 1;
    }
  }
  const reason =
    toVerify > 0
      ? `Terminez d'abord votre vérification : ${toVerify} pièce${toVerify > 1 ? "s" : ""} à vérifier.`
      : missing > 0
        ? `${missing} pièce${missing > 1 ? "s" : ""} obligatoire${missing > 1 ? "s" : ""} manquante${missing > 1 ? "s" : ""} : demandez-la${missing > 1 ? "s" : ""} au client.`
        : null;
  return { groups, toVerify, missing, done: reason === null, reason };
}

/** État de la vérification d'un notaire sur un bail (pour refuser « signé » côté serveur). */
export async function notaireReviewForBail(bailId: string): Promise<NotaireReview | null> {
  const docSelect = { id: true, kind: true, label: true, fileKey: true, mimeType: true, size: true, createdAt: true };
  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    include: {
      property: { include: { documents: { select: docSelect } } },
      documents: { select: docSelect },
      parties: {
        include: {
          persons: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], include: { documents: { select: docSelect } } },
          entreprise: { include: { documents: { select: docSelect } } },
          documents: { where: { personId: null, entrepriseId: null, propertyId: null, bailId: null }, select: docSelect },
        },
      },
    },
  });
  if (!bail) return null;
  const checks = await prisma.bailVerificationCheck.findMany({ where: { bailId }, select: { pointKey: true } });
  return notaireReview({ bail: bail as any }, checks.map((c) => c.pointKey), () => false);
}
