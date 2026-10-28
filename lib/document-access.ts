import { IntakeStatus, IntakeTarget, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, STAFF_ROLES } from "@/lib/auth-helpers";

/**
 * Accès à une pièce (lecture : URL de téléchargement ; suppression).
 *
 * - Lien d'intake en cours : pièces de son client (personnes, entreprise), de son bien et de son
 *   bail. Un locataire ne supprime que ses propres pièces, pas celles du bien ou du bail.
 * - Équipe : tout.
 * - Notaire : pièces des dossiers qui lui sont attribués ; il ne supprime que ce qu'il a envoyé.
 * - Client : ses pièces, celles de ses biens et de ses baux (un locataire lit les pièces du bail
 *   et du bien loué) ; il ne supprime que les pièces de son dossier propriétaire ou qu'il a envoyées.
 */

export type DocumentMode = "read" | "delete";

const DOCUMENT_SELECT = {
  id: true,
  fileKey: true,
  clientId: true,
  personId: true,
  entrepriseId: true,
  propertyId: true,
  bailId: true,
  notaireRequestId: true,
  uploadedById: true,
  person: { select: { clientId: true } },
  entreprise: { select: { clientId: true } },
  notaireRequest: { select: { dossier: { select: { notaireId: true, bailId: true } } } },
} as const;

type AccessDocument = NonNullable<Awaited<ReturnType<typeof findDocument>>>;

function findDocument(id: string) {
  return prisma.document.findUnique({ where: { id }, select: DOCUMENT_SELECT });
}

/** Client propriétaire de la pièce (directement, ou via sa personne ou son entreprise). */
const docClientId = (doc: AccessDocument) => doc.clientId ?? doc.person?.clientId ?? doc.entreprise?.clientId ?? null;

export async function canAccessDocument(doc: AccessDocument, mode: DocumentMode, token?: string | null): Promise<boolean> {
  const clientId = docClientId(doc);

  if (token) {
    const link = await prisma.intakeLink.findUnique({
      where: { token },
      select: { status: true, target: true, clientId: true, propertyId: true, bailId: true },
    });
    if (!link || link.status !== IntakeStatus.PENDING) return false;
    if (clientId && clientId === link.clientId) return true;
    // Le bien et le bail du lien : lecture pour tous, suppression pour le propriétaire seulement.
    const ownerLink = link.target === IntakeTarget.OWNER;
    if (doc.propertyId && doc.propertyId === link.propertyId) return mode === "read" || ownerLink;
    if (doc.bailId && doc.bailId === link.bailId) return mode === "read" || ownerLink;
    return false;
  }

  const user = await getCurrentUser();
  if (!user) return false;
  if (STAFF_ROLES.includes(user.role)) return true;
  if (doc.uploadedById && doc.uploadedById === user.id) return true;

  if (user.role === Role.NOTAIRE) {
    if (mode === "delete") return false;
    if (doc.notaireRequest?.dossier.notaireId === user.id) return true;
    const assignments = await prisma.dossierNotaireAssignment.findMany({
      where: { notaireId: user.id },
      select: { clientId: true, propertyId: true, bailId: true, bail: { select: { propertyId: true, parties: { select: { id: true } } } } },
    });
    return assignments.some(
      (a) =>
        (!!doc.bailId && doc.bailId === a.bailId) ||
        (!!doc.propertyId && (doc.propertyId === a.propertyId || doc.propertyId === a.bail?.propertyId)) ||
        (!!clientId && (clientId === a.clientId || !!a.bail?.parties.some((party) => party.id === clientId))),
    );
  }

  if (user.role !== Role.UTILISATEUR) return false;
  const own = await prisma.user.findUnique({ where: { id: user.id }, select: { clientId: true } });
  const ownClientId = own?.clientId;
  if (!ownClientId) return false;
  if (clientId === ownClientId) return true;

  // Bien : le propriétaire ; en lecture, aussi le locataire d'un bail sur ce bien.
  if (doc.propertyId) {
    const property = await prisma.property.findUnique({
      where: { id: doc.propertyId },
      select: { ownerId: true, bails: { where: { parties: { some: { id: ownClientId } } }, select: { id: true }, take: 1 } },
    });
    if (property?.ownerId === ownClientId) return true;
    if (mode === "read" && property?.bails.length) return true;
  }
  // Bail (et pièces d'une demande du notaire sur ce bail) : le propriétaire ; en lecture, les parties.
  const bailId = doc.bailId ?? doc.notaireRequest?.dossier.bailId ?? null;
  if (bailId) {
    const bail = await prisma.bail.findUnique({
      where: { id: bailId },
      select: { property: { select: { ownerId: true } }, parties: { select: { id: true } } },
    });
    if (bail?.property.ownerId === ownClientId) return true;
    if (mode === "read" && bail?.parties.some((party) => party.id === ownClientId)) return true;
  }
  return false;
}

/** Pièce par identifiant, si l'appelant y a accès (sinon null). */
export async function accessibleDocument(id: string, mode: DocumentMode, token?: string | null) {
  const doc = await findDocument(id);
  if (!doc) return null;
  return (await canAccessDocument(doc, mode, token)) ? doc : null;
}

/** Un fichier peut être lu si au moins une pièce qui le référence est accessible à l'appelant. */
export async function canReadFileKey(fileKeys: string[], token?: string | null): Promise<boolean> {
  const docs = await prisma.document.findMany({ where: { fileKey: { in: fileKeys } }, select: DOCUMENT_SELECT });
  for (const doc of docs) {
    if (await canAccessDocument(doc, "read", token)) return true;
  }
  return false;
}

/**
 * Clés de fichiers transmises par le navigateur pour créer des pièces : format d'upload attendu,
 * et jamais déjà rattachées à une autre pièce (sinon on pourrait s'approprier le fichier d'autrui).
 */
export async function assertFreshFileKeys(fileKeys: string[]) {
  const invalid = fileKeys.some(
    (key) => typeof key !== "string" || !key.startsWith("documents/") || key.includes("..") || key.length > 500,
  );
  if (invalid) throw new Error("Fichier invalide");
  const used = await prisma.document.count({ where: { fileKey: { in: fileKeys } } });
  if (used > 0) throw new Error("Fichier invalide");
}
