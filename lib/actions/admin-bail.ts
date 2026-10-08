"use server";

import { z } from "zod";
import { isValidPhoneNumberSafe } from "@/lib/utils/phone-validation";
import { revalidatePath } from "next/cache";
import {
  BailStatus,
  CompletionStatus,
  FamilyStatus,
  MatrimonialRegime,
  NotaireRequestStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { assignDossierToNotaire } from "@/lib/actions/notaires";
import { getBailMissingData, transitionLease } from "@/lib/actions/leases";
import { updateClientCompletionStatus } from "@/lib/actions/clients";
import { updatePropertyCompletionStatus } from "@/lib/actions/properties";

/* ------------------------------------------------------------------ */
/* Suivi du dossier : notaire, demandes en cours, formulaires          */
/* ------------------------------------------------------------------ */

export interface IntakeTracking {
  target: string;
  status: string;
  formEmailSentAt: string | null;
  formEmailCount: number;
  lastFormEmailSentAt: string | null;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  submittedAt: string | null;
}

export interface BailFollowUp {
  notaire: { id: string; name: string; assignedAt: string; notes: string | null } | null;
  pendingRequests: Array<{ id: string; title: string; createdAt: string; target: string }>;
  intakes: IntakeTracking[];
  lastActivityAt: string | null;
}

export async function getBailFollowUp(bailId: string): Promise<BailFollowUp> {
  await requireRole([Role.ADMINISTRATEUR]);

  const [assignment, intakes, lastAudit] = await Promise.all([
    prisma.dossierNotaireAssignment.findFirst({
      where: { bailId },
      orderBy: { assignedAt: "desc" },
      select: {
        id: true,
        assignedAt: true,
        notes: true,
        notaire: { select: { id: true, name: true, email: true } },
        // Demandes encore ouvertes uniquement : les discussions ne remontent pas ici.
        requests: {
          where: { status: NotaireRequestStatus.PENDING },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, createdAt: true, targetProprietaire: true, targetLocataire: true },
        },
      },
    }),
    prisma.intakeLink.findMany({
      where: { bailId },
      orderBy: { createdAt: "desc" },
      select: {
        target: true,
        status: true,
        formEmailSentAt: true,
        formEmailCount: true,
        lastFormEmailSentAt: true,
        firstOpenedAt: true,
        lastOpenedAt: true,
        submittedAt: true,
      },
    }),
    prisma.bailAuditLog.findFirst({ where: { bailId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return {
    notaire: assignment
      ? {
          id: assignment.notaire.id,
          name: assignment.notaire.name || assignment.notaire.email,
          assignedAt: assignment.assignedAt.toISOString(),
          notes: assignment.notes,
        }
      : null,
    pendingRequests: (assignment?.requests || []).map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt.toISOString(),
      target:
        r.targetProprietaire && r.targetLocataire
          ? "Propriétaire et locataire"
          : r.targetProprietaire
            ? "Propriétaire"
            : r.targetLocataire
              ? "Locataire"
              : "Parties",
    })),
    intakes: intakes.map((link) => ({
      target: link.target,
      status: link.status,
      formEmailSentAt: iso(link.formEmailSentAt),
      formEmailCount: link.formEmailCount,
      lastFormEmailSentAt: iso(link.lastFormEmailSentAt),
      firstOpenedAt: iso(link.firstOpenedAt),
      lastOpenedAt: iso(link.lastOpenedAt),
      submittedAt: iso(link.submittedAt),
    })),
    lastActivityAt: iso(lastAudit?.createdAt ?? null),
  };
}

/* ------------------------------------------------------------------ */
/* Valider et envoyer au notaire                                       */
/* ------------------------------------------------------------------ */

const sendToNotarySchema = z.object({
  bailId: z.string().min(1),
  notaireId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

/** Statuts depuis lesquels l'envoi au notaire est possible. */
const SENDABLE_STATUSES: BailStatus[] = [
  BailStatus.AWAITING_TENANT_FORM,
  BailStatus.PENDING_VALIDATION,
  BailStatus.READY_FOR_NOTARY,
];

/**
 * Valide le dossier et l'envoie au notaire choisi, en une seule action :
 * 1. refuse s'il manque encore une donnée ou une pièce obligatoire ;
 * 2. assigne le notaire (s'il n'y en a pas déjà un) — e-mail au notaire ;
 * 3. marque propriétaire, locataire et bien comme vérifiés (comme le menu
 *    « Statut de complétion » le fait aujourd'hui, e-mails clients compris) ;
 * 4. s'assure que le bail est « Prêt pour notaire » (historique tracé).
 */
export async function validateAndSendToNotary(
  data: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole([Role.ADMINISTRATEUR]);
  const parsed = sendToNotarySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, notaireId, notes } = parsed.data;

  try {
    const bail = await prisma.bail.findUnique({
      where: { id: bailId },
      select: {
        id: true,
        status: true,
        propertyId: true,
        property: { select: { completionStatus: true } },
        parties: { select: { id: true, profilType: true, completionStatus: true } },
        dossierAssignments: { select: { id: true }, take: 1 },
      },
    });
    if (!bail) return { success: false, error: "Dossier introuvable" };
    if (!SENDABLE_STATUSES.includes(bail.status)) {
      return { success: false, error: "Ce dossier n'est pas à l'étape de vérification" };
    }

    const owner = bail.parties.find((p) => p.profilType === "PROPRIETAIRE");
    const tenant = bail.parties.find((p) => p.profilType === "LOCATAIRE");
    if (!owner || !tenant) return { success: false, error: "Le dossier doit avoir un propriétaire et un locataire" };

    const missing = await getBailMissingData(bailId);
    if (!missing) return { success: false, error: "Impossible de contrôler le dossier" };
    if (missing.totalMissing > 0) {
      return {
        success: false,
        error: `Il manque encore ${missing.totalMissing} élément${missing.totalMissing > 1 ? "s" : ""} : complétez-les avant l'envoi.`,
      };
    }

    if (bail.dossierAssignments.length === 0) {
      if (!notaireId) return { success: false, error: "Choisissez un notaire" };
      await assignDossierToNotaire({ bailId, notaireId, notes: notes || null });
    }

    for (const party of [owner, tenant]) {
      if (party.completionStatus !== CompletionStatus.COMPLETED) {
        await updateClientCompletionStatus({ id: party.id, completionStatus: CompletionStatus.COMPLETED });
      }
    }
    if (bail.property.completionStatus !== CompletionStatus.COMPLETED) {
      await updatePropertyCompletionStatus({ id: bail.propertyId, completionStatus: CompletionStatus.COMPLETED });
    }

    const after = await prisma.bail.findUnique({ where: { id: bailId }, select: { status: true } });
    if (after && after.status !== BailStatus.READY_FOR_NOTARY) {
      await transitionLease({ id: bailId, nextStatus: "READY_FOR_NOTARY" });
    }

    revalidatePath("/interface");
    revalidatePath("/interface/baux");
    revalidatePath(`/interface/baux/${bailId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[validateAndSendToNotary]", error);
    return { success: false, error: error?.message || "Erreur lors de l'envoi au notaire" };
  }
}

/* ------------------------------------------------------------------ */
/* Saisie directe d'un champ manquant                                  */
/* ------------------------------------------------------------------ */

const text = (max: number) => z.string().trim().min(1, "Champ requis").max(max, "Trop long");
const optionalText = (max: number) => z.string().trim().max(max, "Trop long");
const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
  .transform((v) => new Date(`${v}T00:00:00.000Z`))
  .refine((d) => !isNaN(d.getTime()), "Date invalide");

/** Champs modifiables en direct, et leur validation. L'e-mail est exclu : il
    sert à la connexion du client et se modifie depuis la page complète. */
/** Téléphone au format international (même contrôle que les formulaires). */
const phoneField = z
  .string()
  .trim()
  .refine((value) => isValidPhoneNumberSafe(value), { message: "Numéro de téléphone invalide" });

const PERSON_FIELDS = {
  firstName: text(100),
  lastName: text(100),
  phone: phoneField,
  fullAddress: text(300),
  nationality: text(100),
  birthPlace: text(200),
  profession: optionalText(200),
  birthDate: isoDay,
  familyStatus: z.nativeEnum(FamilyStatus),
  matrimonialRegime: z.nativeEnum(MatrimonialRegime),
} as const;

const ENTREPRISE_FIELDS = {
  legalName: text(200),
  name: text(200),
  registration: text(100),
  phone: phoneField,
  fullAddress: text(300),
} as const;

const updateFieldSchema = z.object({
  entity: z.enum(["person", "entreprise"]),
  id: z.string().min(1),
  field: z.string().min(1),
  value: z.string(),
});

export async function updatePartyFieldAdmin(
  data: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole([Role.ADMINISTRATEUR]);
  const parsed = updateFieldSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const { entity, id, field, value } = parsed.data;

  const fields: Record<string, z.ZodTypeAny> = entity === "person" ? PERSON_FIELDS : ENTREPRISE_FIELDS;
  const validator = fields[field];
  if (!validator) return { success: false, error: "Ce champ ne peut pas être modifié ici" };
  const result = validator.safeParse(value);
  if (!result.success) return { success: false, error: result.error.issues[0]?.message || "Valeur invalide" };

  try {
    let clientId: string;
    if (entity === "person") {
      const updated = await prisma.person.update({
        where: { id },
        data: { [field]: result.data === "" ? null : result.data },
        select: { clientId: true },
      });
      clientId = updated.clientId;
    } else {
      const updated = await prisma.entreprise.update({
        where: { id },
        data: { [field]: result.data },
        select: { clientId: true },
      });
      clientId = updated.clientId;
    }

    const bails = await prisma.bail.findMany({
      where: { parties: { some: { id: clientId } } },
      select: { id: true },
    });
    revalidatePath(`/interface/clients/${clientId}`);
    for (const bail of bails) revalidatePath(`/interface/baux/${bail.id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "Fiche introuvable" };
    }
    console.error("[updatePartyFieldAdmin]", error);
    return { success: false, error: "Enregistrement impossible" };
  }
}
