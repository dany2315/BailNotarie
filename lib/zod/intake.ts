import { z } from "zod";

export const createIntakeLinkSchema = z.object({
  target: z.enum(["OWNER", "TENANT"]),
  propertyId: z.string().cuid().optional(),
  leaseId: z.string().cuid().optional(),
  partyId: z.string().cuid().optional(),
});

// Schéma pour le payload d'intake (flexible pour accepter toutes les données)
export const intakePayloadSchema = z.any();

export const submitIntakeSchema = z.object({
  token: z.string().min(1, "Le token est requis"),
  payload: intakePayloadSchema,
});

export type CreateIntakeLinkInput = z.infer<typeof createIntakeLinkSchema>;
export type SubmitIntakeInput = z.infer<typeof submitIntakeSchema>;

