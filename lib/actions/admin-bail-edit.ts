"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  BailAuditEventType,
  BailFamille,
  BailStatus,
  BailType,
  ClientType,
  CompletionStatus,
  IntakeStatus,
  NotificationType,
  ProfilType,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { createBailAuditLog, getActorName, getClientDisplayName } from "@/lib/actions/bail-audit-log";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";
import { triggerTenantFormEmail } from "@/lib/inngest/helpers";
import { validateRentForProperty } from "@/lib/utils/rent-validation";
import { getStageKey } from "@/lib/utils/bail-stage";
import { EXEMPTION_LABELS } from "@/lib/utils/rent-cap";

type Result<T = undefined> = ({ success: true } & (T extends undefined ? unknown : { data: T })) | { success: false; error: string };

/** Le dossier se modifie tant qu'il n'est pas parti chez le notaire (même règle que la vérification). */
function isEditable(status: BailStatus) {
  const stage = getStageKey(status);
  return stage === "constitution" || stage === "attente_locataire" || stage === "verification";
}

const revalidateField = z
  .string()
  .max(300)
  .refine((path) => /^\/interface(\/[\w-]+)*$/.test(path), "Page invalide")
  .optional();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
const euros = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,7}$/, `${label} : montant en euros entiers attendu`)
    .transform(Number);

/* ------------------------------------------------------------------ */
/* Conditions du bail (type, durée, loyer, charges, dépôt)             */
/* ------------------------------------------------------------------ */

const termsSchema = z.object({
  bailId: z.string().min(1),
  values: z
    .object({
      bailType: z.nativeEnum(BailType),
      bailFamily: z.nativeEnum(BailFamille),
      effectiveDate: isoDate,
      // Vide = pas de date de fin.
      endDate: z.union([isoDate, z.literal("")]),
      rentAmount: euros("Loyer"),
      monthlyCharges: euros("Charges"),
      securityDeposit: euros("Dépôt de garantie"),
      paymentDay: z
        .string()
        .trim()
        .regex(/^\d{1,2}$/, "Jour de paiement : entre 1 et 31")
        .transform(Number)
        .refine((day) => day >= 1 && day <= 31, "Jour de paiement : entre 1 et 31"),
    })
    .partial(),
  revalidate: revalidateField,
});

const utcDate = (value: string) => new Date(`${value}T00:00:00Z`);

/**
 * Modification des conditions du bail depuis la fiche dossier, champ par champ.
 * Mêmes garde-fous que le formulaire complet : plafond du dépôt de garantie
 * et encadrement du loyer.
 */
export async function updateBailTermsAdmin(data: unknown): Promise<Result> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = termsSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, values, revalidate } = parsed.data;
  if (Object.keys(values).length === 0) return { success: true };

  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    select: { id: true, status: true, propertyId: true, bailType: true, rentAmount: true, securityDeposit: true, effectiveDate: true, endDate: true },
  });
  if (!bail) return { success: false, error: "Dossier introuvable" };
  if (!isEditable(bail.status)) return { success: false, error: "Dossier déjà transmis au notaire : modification impossible ici" };

  // Valeurs finales, pour les contrôles qui croisent plusieurs champs.
  const bailType = values.bailType ?? bail.bailType;
  const rentAmount = values.rentAmount ?? bail.rentAmount;
  const securityDeposit = values.securityDeposit ?? bail.securityDeposit;
  const effectiveDate = values.effectiveDate ? utcDate(values.effectiveDate) : bail.effectiveDate;
  const endDate = values.endDate === undefined ? bail.endDate : values.endDate === "" ? null : utcDate(values.endDate);

  if (endDate && effectiveDate && endDate <= effectiveDate) {
    return { success: false, error: "La date de fin doit suivre la date de prise d'effet" };
  }
  const isMeuble = bailType === BailType.BAIL_MEUBLE_1_ANS || bailType === BailType.BAIL_MEUBLE_9_MOIS;
  const maxDeposit = isMeuble ? rentAmount * 2 : rentAmount;
  if (rentAmount > 0 && securityDeposit > maxDeposit) {
    return {
      success: false,
      error: `Le dépôt de garantie ne peut pas dépasser ${isMeuble ? "2 mois" : "1 mois"} de loyer hors charges (max ${maxDeposit.toLocaleString("fr-FR")} €)${values.securityDeposit === undefined ? " : ajustez aussi le dépôt de garantie" : ""}`,
    };
  }
  if (values.rentAmount !== undefined && values.rentAmount !== bail.rentAmount) {
    const rent = await validateRentForProperty(bail.propertyId, values.rentAmount);
    if (!rent.isValid && rent.maxAllowed !== null) {
      return {
        success: false,
        error: `Le loyer dépasse le plafond de l'encadrement : ${rent.maxAllowed.toFixed(2).replace(".", ",")} € maximum (${rent.maxRentPerM2?.toFixed(2).replace(".", ",")} €/m²)`,
      };
    }
  }

  await prisma.bail.update({
    where: { id: bailId },
    data: {
      ...(values.bailType !== undefined && { bailType: values.bailType }),
      ...(values.bailFamily !== undefined && { bailFamily: values.bailFamily }),
      ...(values.effectiveDate !== undefined && { effectiveDate }),
      ...(values.endDate !== undefined && { endDate }),
      ...(values.rentAmount !== undefined && { rentAmount: values.rentAmount }),
      ...(values.monthlyCharges !== undefined && { monthlyCharges: values.monthlyCharges }),
      ...(values.securityDeposit !== undefined && { securityDeposit: values.securityDeposit }),
      ...(values.paymentDay !== undefined && { paymentDay: values.paymentDay }),
      updatedById: user.id,
    },
  });

  if (revalidate) revalidatePath(revalidate);
  revalidatePath(`/interface/baux/${bailId}`);
  revalidatePath("/interface/baux");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Changement de locataire                                             */
/* ------------------------------------------------------------------ */

export interface TenantOption {
  id: string;
  name: string;
  email: string | null;
  completionStatus: CompletionStatus;
}

const tenantInclude = {
  persons: { orderBy: { isPrimary: "desc" as const }, take: 1, select: { firstName: true, lastName: true, email: true } },
  entreprise: { select: { legalName: true, name: true, email: true } },
};

function toOption(client: {
  id: string;
  type: ClientType;
  completionStatus: CompletionStatus;
  persons: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
  entreprise: { legalName: string | null; name: string | null; email: string | null } | null;
}): TenantOption {
  return {
    id: client.id,
    name: getClientDisplayName(client) || "Locataire sans nom",
    email: client.type === ClientType.PERSONNE_MORALE ? client.entreprise?.email || null : client.persons[0]?.email || null,
    completionStatus: client.completionStatus,
  };
}

/** Locataires existants (nom, e-mail ou raison sociale), pour « Changer de locataire ». */
export async function searchTenantsAdmin(data: unknown): Promise<Result<TenantOption[]>> {
  await requireRole([Role.ADMINISTRATEUR]);
  const parsed = z.object({ query: z.string().trim().max(100), excludeId: z.string().optional() }).safeParse(data);
  if (!parsed.success) return { success: false, error: "Recherche invalide" };
  const { query, excludeId } = parsed.data;
  if (query.length < 2) return { success: true, data: [] };

  const contains = { contains: query, mode: "insensitive" as const };
  const clients = await prisma.client.findMany({
    where: {
      profilType: ProfilType.LOCATAIRE,
      ...(excludeId && { id: { not: excludeId } }),
      OR: [
        { persons: { some: { OR: [{ firstName: contains }, { lastName: contains }, { email: contains }] } } },
        { entreprise: { OR: [{ legalName: contains }, { name: contains }, { email: contains }] } },
      ],
    },
    include: tenantInclude,
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  return { success: true, data: clients.map(toOption) };
}

const changeTenantSchema = z
  .object({
    bailId: z.string().min(1),
    tenantId: z.string().min(1).optional(),
    email: z.string().trim().toLowerCase().email("E-mail invalide").optional(),
    sendForm: z.boolean(),
    revalidate: revalidateField,
  })
  .refine((d) => !!d.tenantId !== !!d.email, "Choisissez un locataire existant ou saisissez un e-mail");

const READY_TENANT: CompletionStatus[] = [CompletionStatus.PENDING_CHECK, CompletionStatus.COMPLETED];

/**
 * Remplace le locataire du dossier. L'ancien locataire est retiré du dossier
 * (sa fiche client est conservée) et ses formulaires en attente pour ce
 * dossier sont désactivés. Si le nouveau locataire n'a pas encore rempli son
 * formulaire, le dossier repasse en « Formulaire locataire en attente ».
 */
export async function changeBailTenantAdmin(data: unknown): Promise<Result<{ tenantName: string; formSent: boolean }>> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = changeTenantSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, tenantId, email, sendForm, revalidate } = parsed.data;

  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    include: { property: { select: { label: true, fullAddress: true } }, parties: { select: { id: true, profilType: true } } },
  });
  if (!bail) return { success: false, error: "Dossier introuvable" };
  if (!isEditable(bail.status)) return { success: false, error: "Dossier déjà transmis au notaire : changement impossible ici" };
  const owner = bail.parties.find((p) => p.profilType === ProfilType.PROPRIETAIRE);
  const previous = bail.parties.find((p) => p.profilType === ProfilType.LOCATAIRE);
  if (!owner) return { success: false, error: "Le dossier n'a pas de propriétaire" };

  // Le nouveau locataire : existant, ou retrouvé / créé à partir de l'e-mail.
  let tenant = tenantId
    ? await prisma.client.findFirst({ where: { id: tenantId, profilType: ProfilType.LOCATAIRE }, include: tenantInclude })
    : null;
  if (tenantId && !tenant) return { success: false, error: "Locataire introuvable" };
  let created = false;
  if (email) {
    const person = await prisma.person.findUnique({ where: { email }, select: { clientId: true, client: { select: { profilType: true } } } });
    if (person && person.client.profilType !== ProfilType.LOCATAIRE) {
      return { success: false, error: "Cet e-mail appartient déjà à un client qui n'est pas locataire" };
    }
    tenant = person
      ? await prisma.client.findUnique({ where: { id: person.clientId }, include: tenantInclude })
      : null;
    if (!tenant) {
      tenant = await prisma.client.create({
        data: {
          type: ClientType.PERSONNE_PHYSIQUE,
          profilType: ProfilType.LOCATAIRE,
          createdById: user.id,
          persons: { create: { email, isPrimary: true, createdById: user.id } },
        },
        include: tenantInclude,
      });
      created = true;
    }
  }
  if (!tenant) return { success: false, error: "Locataire introuvable" };
  if (tenant.id === previous?.id) return { success: false, error: "C'est déjà le locataire de ce dossier" };

  const option = toOption(tenant);
  const nextStatus =
    (bail.status === BailStatus.PENDING_VALIDATION || bail.status === BailStatus.AWAITING_TENANT) && !READY_TENANT.includes(tenant.completionStatus)
      ? BailStatus.AWAITING_TENANT_FORM
      : bail.status;
  const actorName = getActorName(user);

  const intakeLink = await prisma.$transaction(async (tx) => {
    await tx.bail.update({
      where: { id: bailId },
      data: {
        parties: { set: [{ id: owner.id }, { id: tenant!.id }] },
        ...(nextStatus !== bail.status && { status: nextStatus }),
        updatedById: user.id,
      },
    });
    // Les formulaires encore ouverts de l'ancien locataire pour ce dossier ne servent plus.
    if (previous) {
      await tx.intakeLink.updateMany({
        where: { bailId, clientId: previous.id, target: "TENANT", status: IntakeStatus.PENDING },
        data: { status: IntakeStatus.REVOKED },
      });
    }
    await createBailAuditLog(
      { bailId, eventType: BailAuditEventType.TENANT_ADDED, actorId: user.id, actorName, tenantId: tenant!.id, tenantName: option.name },
      tx,
    );
    if (nextStatus !== bail.status) {
      await createBailAuditLog(
        { bailId, eventType: BailAuditEventType.STATUS_CHANGED, actorId: user.id, actorName, fromStatus: bail.status, toStatus: nextStatus },
        tx,
      );
    }
    // Lien de formulaire du nouveau locataire pour ce dossier (réutilisé s'il existe encore).
    const existing = await tx.intakeLink.findFirst({
      where: { bailId, clientId: tenant!.id, target: "TENANT", status: { in: [IntakeStatus.PENDING, IntakeStatus.SUBMITTED] } },
      orderBy: { createdAt: "desc" },
    });
    return (
      existing ??
      tx.intakeLink.create({
        data: { target: "TENANT", clientId: tenant!.id, propertyId: bail.propertyId, bailId, createdById: user.id },
      })
    );
  });

  if (created) {
    await createNotificationForAllUsers(NotificationType.CLIENT_CREATED, "BAIL", bailId, user.id, {
      createdByForm: false,
      profileType: ProfilType.LOCATAIRE,
      bailPropertyLabel: bail.property?.label || bail.property?.fullAddress?.split(",")[0] || null,
    }).catch((error) => console.error("[changeBailTenantAdmin] notification", error));
  }

  let formSent = false;
  if (sendForm && intakeLink.status === IntakeStatus.PENDING && option.email) {
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    try {
      await triggerTenantFormEmail({ to: option.email, formUrl: `${baseUrl}/intakes/${intakeLink.token}` });
      formSent = true;
    } catch (error) {
      console.error("[changeBailTenantAdmin] e-mail du formulaire", error);
    }
  }

  if (revalidate) revalidatePath(revalidate);
  revalidatePath(`/interface/baux/${bailId}`);
  revalidatePath("/interface/baux");
  revalidatePath(`/interface/clients/${tenant.id}`);
  if (previous) revalidatePath(`/interface/clients/${previous.id}`);
  return { success: true, data: { tenantName: option.name, formSent } };
}

/* ------------------------------------------------------------------ */
/* Complément de loyer justifié                                         */
/* ------------------------------------------------------------------ */

const supplementSchema = z.object({
  bailId: z.string().min(1),
  // null : on retire le complément.
  reason: z.string().trim().min(10, "Précisez le motif (10 caractères minimum)").max(2000).nullable(),
  revalidate: revalidateField,
});

/**
 * Loyer au-dessus du loyer de référence majoré : après réponse du propriétaire,
 * l'équipe indique que le complément de loyer est justifié (caractéristiques
 * exceptionnelles du logement) et en garde le motif.
 */
export async function setRentSupplementAdmin(data: unknown): Promise<Result> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = supplementSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, reason, revalidate } = parsed.data;
  const bail = await prisma.bail.findUnique({ where: { id: bailId }, select: { status: true } });
  if (!bail) return { success: false, error: "Dossier introuvable" };
  if (!isEditable(bail.status)) return { success: false, error: "Dossier déjà transmis au notaire : modification impossible ici" };

  await prisma.bail.update({
    where: { id: bailId },
    data: {
      rentSupplementReason: reason,
      rentSupplementAt: reason ? new Date() : null,
      rentSupplementByName: reason ? getActorName(user) : null,
      updatedById: user.id,
    },
  });
  if (revalidate) revalidatePath(revalidate);
  revalidatePath(`/interface/baux/${bailId}`);
  return { success: true };
}

const exemptionSchema = z
  .object({
    bailId: z.string().min(1),
    // null : le logement redevient soumis à l'encadrement.
    exemption: z.enum(Object.keys(EXEMPTION_LABELS) as [string, ...string[]]).nullable(),
    note: z.string().trim().max(2000).nullable(),
    revalidate: revalidateField,
  })
  .refine((d) => d.exemption !== "OTHER" || (d.note?.length ?? 0) >= 10, {
    message: "Précisez le motif (10 caractères minimum)",
    path: ["note"],
  });

/**
 * Logement exclu de l'encadrement (logement social, conventionné APL ou Anah, loi de 1948…) :
 * le plafond ne s'applique pas ; le motif et son auteur restent visibles dans le dossier.
 */
export async function setRentCapExemptionAdmin(data: unknown): Promise<Result> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = exemptionSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, exemption, note, revalidate } = parsed.data;
  const bail = await prisma.bail.findUnique({ where: { id: bailId }, select: { status: true } });
  if (!bail) return { success: false, error: "Dossier introuvable" };
  if (!isEditable(bail.status)) return { success: false, error: "Dossier déjà transmis au notaire : modification impossible ici" };

  await prisma.bail.update({
    where: { id: bailId },
    data: {
      rentCapExemption: exemption,
      rentCapExemptionNote: exemption ? note || null : null,
      rentCapExemptionAt: exemption ? new Date() : null,
      rentCapExemptionByName: exemption ? getActorName(user) : null,
      updatedById: user.id,
    },
  });
  if (revalidate) revalidatePath(revalidate);
  revalidatePath(`/interface/baux/${bailId}`);
  return { success: true };
}
