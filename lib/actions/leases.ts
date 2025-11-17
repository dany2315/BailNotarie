"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { createLeaseSchema, updateLeaseSchema, transitionLeaseSchema } from "@/lib/zod/lease";
import { revalidatePath } from "next/cache";
import { BailFamille, BailType, BailStatus, ProfilType } from "@prisma/client";

export async function createLease(data: unknown) {
  const user = await requireAuth();
  const validated = createLeaseSchema.parse(data);

  // Récupérer le propriétaire du bien
  const property = await prisma.property.findUnique({
    where: { id: validated.propertyId },
    include: { owner: true },
  });

  if (!property) {
    throw new Error("Bien introuvable");
  }

  // Vérifier que le locataire existe
  const tenant = await prisma.client.findUnique({
    where: { id: validated.tenantId },
  });

  if (!tenant) {
    throw new Error("Locataire introuvable");
  }

  // Mapper leaseType vers bailFamily
  const bailFamilyMap: Record<string, BailFamille> = {
    HABITATION: BailFamille.HABITATION,
  };

  const bail = await prisma.bail.create({
    data: {
      bailType: BailType.BAIL_NU_3_ANS, // Par défaut
      bailFamily: bailFamilyMap[validated.leaseType] || BailFamille.HABITATION,
      status: validated.status as BailStatus,
      rentAmount: validated.rentAmount,
      monthlyCharges: validated.monthlyCharges,
      securityDeposit: validated.securityDeposit,
      effectiveDate: validated.effectiveDate,
      endDate: validated.endDate || null,
      paymentDay: validated.paymentDay || null,
      propertyId: validated.propertyId,
      parties: {
        connect: [
          { id: property.ownerId }, // Propriétaire
          { id: validated.tenantId }, // Locataire
        ],
      },
      createdById: user.id,
    },
    include: {
      property: { include: { owner: true } },
      parties: true,
    },
  });

  revalidatePath("/interface/leases");
  return bail;
}

export async function updateLease(data: unknown) {
  const user = await requireAuth();
  const validated = updateLeaseSchema.parse(data);
  const { id, tenantId, leaseType, ...updateData } = validated;

  const updatePayload: any = {
    updatedById: user.id,
  };

  if (updateData.rentAmount !== undefined) {
    updatePayload.rentAmount = updateData.rentAmount;
  }
  if (updateData.monthlyCharges !== undefined) {
    updatePayload.monthlyCharges = updateData.monthlyCharges;
  }
  if (updateData.securityDeposit !== undefined) {
    updatePayload.securityDeposit = updateData.securityDeposit;
  }
  if (updateData.effectiveDate !== undefined) {
    updatePayload.effectiveDate = updateData.effectiveDate;
  }
  if (updateData.endDate !== undefined) {
    updatePayload.endDate = updateData.endDate || null;
  }
  if (updateData.paymentDay !== undefined) {
    updatePayload.paymentDay = updateData.paymentDay || null;
  }
  if (updateData.status !== undefined) {
    updatePayload.status = updateData.status as BailStatus;
  }
  if (leaseType) {
    const bailFamilyMap: Record<string, BailFamille> = {
      HABITATION: BailFamille.HABITATION,
    };
    updatePayload.bailFamily = bailFamilyMap[leaseType] || BailFamille.HABITATION;
  }
  if (updateData.propertyId) {
    updatePayload.propertyId = updateData.propertyId;
  }

  // Si tenantId est fourni, mettre à jour les parties
  if (tenantId) {
    const bail = await prisma.bail.findUnique({
      where: { id },
      include: { property: true, parties: true },
    });

    if (bail) {
      const owner = bail.parties.find((p) => p.profilType === ProfilType.PROPRIETAIRE);
      if (owner) {
        updatePayload.parties = {
          set: [
            { id: owner.id }, // Propriétaire
            { id: tenantId }, // Locataire
          ],
        };
      }
    }
  }

  const bail = await prisma.bail.update({
    where: { id },
    data: updatePayload,
    include: {
      property: { include: { owner: true } },
      parties: true,
    },
  });

  revalidatePath("/interface/leases");
  revalidatePath(`/interface/leases/${id}`);
  return bail;
}

export async function transitionLease(data: unknown) {
  const validated = transitionLeaseSchema.parse(data);
  const { id, nextStatus } = validated;

  // Garde des rôles selon la transition
  if (nextStatus === "READY_FOR_NOTARY") {
    await requireRole(["ADMINISTRATEUR", "OPERATEUR", "REVIEWER"]);
  } else if (nextStatus === "ACTIVE") {
    await requireRole(["ADMINISTRATEUR", "NOTAIRE"]);
  } else if (nextStatus === "TERMINATED" || nextStatus === "CANCELED") {
    await requireRole(["ADMINISTRATEUR", "NOTAIRE", "OPERATEUR"]);
  } else {
    await requireAuth();
  }

  const user = await requireAuth();

  const bail = await prisma.bail.update({
    where: { id },
    data: {
      status: nextStatus as BailStatus,
      updatedById: user.id,
    },
    include: {
      property: { include: { owner: true } },
      parties: true,
    },
  });

  revalidatePath("/interface/leases");
  revalidatePath(`/interface/leases/${id}`);
  return bail;
}

export async function deleteLease(id: string) {
  await requireAuth();
  await prisma.bail.delete({ where: { id } });
  revalidatePath("/interface/leases");
}

export async function getLease(id: string) {
  await requireAuth();
  return prisma.bail.findUnique({
    where: { id },
    include: {
      property: {
        include: {
          owner: true,
        },
      },
      parties: true,
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      documents: true,
    },
  });
}

export async function getLeases(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  propertyId?: string;
  tenantId?: string;
}) {
  await requireAuth();

  const where: any = {};

  if (params.status) {
    where.status = params.status as BailStatus;
  }

  if (params.propertyId) {
    where.propertyId = params.propertyId;
  }

  if (params.tenantId) {
    where.parties = {
      some: { id: params.tenantId },
    };
  }

  if (params.search) {
    where.OR = [
      { property: { fullAddress: { contains: params.search, mode: "insensitive" } } },
      { parties: { some: { firstName: { contains: params.search, mode: "insensitive" } } } },
      { parties: { some: { lastName: { contains: params.search, mode: "insensitive" } } } },
      { parties: { some: { legalName: { contains: params.search, mode: "insensitive" } } } },
      { parties: { some: { email: { contains: params.search, mode: "insensitive" } } } },
    ];
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 10;

  const [data, total] = await Promise.all([
    prisma.bail.findMany({
      where,
      include: {
        property: { include: { owner: true } },
        parties: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { effectiveDate: "desc" },
    }),
    prisma.bail.count({ where }),
  ]);

  // Sérialiser les données pour éviter les problèmes de sérialisation
  const serializedData = JSON.parse(JSON.stringify(data));

  return {
    data: serializedData,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}


