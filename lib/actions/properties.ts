"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createPropertySchema, updatePropertySchema } from "@/lib/zod/property";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { PropertyStatus } from "@prisma/client";

export async function createProperty(data: unknown) {
  const user = await requireAuth();
  const validated = createPropertySchema.parse(data);

  const property = await prisma.property.create({
    data: {
      ...validated,
      surfaceM2: validated.surfaceM2 ? new Decimal(validated.surfaceM2) : null,
      createdById: user.id,
      status: PropertyStatus.NON_LOUER,
    },
    include: {
      owner: true,
    },
  });

  revalidatePath("/interface/properties");
  return property;
}

export async function updateProperty(data: unknown) {
  const user = await requireAuth();
  const validated = updatePropertySchema.parse(data);
  const { id, ...updateData } = validated;

  const property = await prisma.property.update({
    where: { id },
    data: {
      ...updateData,
      surfaceM2: updateData.surfaceM2 !== undefined ? (updateData.surfaceM2 ? new Decimal(updateData.surfaceM2) : null) : undefined,
      updatedById: user.id,
    },
    include: {
      owner: true,
    },
  });

  revalidatePath("/interface/properties");
  revalidatePath(`/interface/properties/${id}`);
  return property;
}

export async function deleteProperty(id: string) {
  await requireAuth();
  await prisma.property.delete({ where: { id } });
  revalidatePath("/interface/properties");
}

export async function getProperty(id: string) {
  await requireAuth();
  return prisma.property.findUnique({
    where: { id },
    include: {
      owner: true,
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      bails: { include: { parties: true } },
      documents: true,
    },
  });
}

export async function getProperties(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  ownerId?: string;
}) {
  await requireAuth();

  const where: any = {};

  if (params.status) {
    where.status = params.status;
  }

  if (params.ownerId) {
    where.ownerId = params.ownerId;
  }

  if (params.search) {
    where.fullAddress = { contains: params.search, mode: "insensitive" };
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 10;

  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        owner: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.property.count({ where }),
  ]);

  // Sérialiser les données pour éviter les problèmes de sérialisation avec les objets Decimal
  const serializedData = JSON.parse(JSON.stringify(data));

  return {
    data: serializedData,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

