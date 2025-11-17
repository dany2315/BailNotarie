"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createCommentSchema } from "@/lib/zod/comment";
import { revalidatePath } from "next/cache";
import { CommentTarget, Role } from "@prisma/client";

export async function createComment(data: unknown) {
  const user = await requireAuth();
  const validated = createCommentSchema.parse(data);

  const comment = await prisma.commentInterface.create({
    data: {
      target: validated.target as CommentTarget,
      targetId: validated.targetId,
      body: validated.body,
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  // Revalidate selon la cible
  if (validated.target === "PARTY") {
    revalidatePath(`/interface/parties/${validated.targetId}`);
  } else if (validated.target === "PROPERTY") {
    revalidatePath(`/interface/properties/${validated.targetId}`);
  } else if (validated.target === "LEASE") {
    revalidatePath(`/interface/leases/${validated.targetId}`);
  }

  return comment;
}

export async function getComments(target: string, targetId: string) {
  await requireAuth();

  return prisma.commentInterface.findMany({
    where: {
      target: target as any,
      targetId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function deleteComment(id: string) {
  const user = await requireAuth();
  const comment = await prisma.commentInterface.findUnique({ where: { id } });

  if (!comment) {
    throw new Error("Commentaire introuvable");
  }

  // Seul l'auteur ou un admin peut supprimer
  if (comment.createdById !== user.id && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  await prisma.commentInterface.delete({ where: { id } });

  // Revalidate selon la cible
  if (comment.target === CommentTarget.CLIENT) {
    revalidatePath(`/interface/parties/${comment.targetId}`);
  } else if (comment.target === CommentTarget.PROPERTY) {
    revalidatePath(`/interface/properties/${comment.targetId}`);
  } else if (comment.target === CommentTarget.BAIL) {
    revalidatePath(`/interface/leases/${comment.targetId}`);
  }
}


