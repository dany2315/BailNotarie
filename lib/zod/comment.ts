import { z } from "zod";
import "@/lib/zod/locale";

export const createCommentSchema = z.object({
  target: z.enum(["CLIENT", "PROPERTY", "BAIL", "DOCUMENT", "INTAKE", "LEAD"]),
  targetId: z.string().cuid("ID cible invalide").min(1, "L'ID de la cible est requis"),
  body: z.string("Le commentaire ne peut pas être vide")
    .min(1, "Le commentaire ne peut pas être vide")
    .max(5000, "Le commentaire est trop long")
    .trim(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;


