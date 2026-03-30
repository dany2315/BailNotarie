import { z } from "zod";

// Helper pour valider le dépôt de garantie selon le type de bail
function validateSecurityDeposit(
  leaseType: string | undefined,
  rentAmount: number | undefined,
  securityDeposit: number | undefined,
  ctx: z.RefinementCtx
) {
  if (!rentAmount || !securityDeposit || rentAmount <= 0 || securityDeposit <= 0) {
    return;
  }

  // Bail nu → max 1 mois de loyer
  const maxDeposit = rentAmount;

  if (securityDeposit > maxDeposit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["securityDeposit"],
      message: `Le dépôt de garantie ne peut pas dépasser 1 mois de loyer hors charges (max ${maxDeposit.toLocaleString("fr-FR")} €)`,
    });
  }
}

// Schéma de base pour la création
const createLeaseBaseSchema = z.object({
  leaseType: z.enum(["HABITATION", "COMMERCIAL"]).default("HABITATION"),
  bailType: z
    .enum(["BAIL_NU_3_ANS", "BAIL_NU_6_ANS", "BAIL_MEUBLE_1_ANS", "BAIL_MEUBLE_9_MOIS"])
    .default("BAIL_NU_3_ANS"),
  status: z
    .enum(["DRAFT", "PENDING_VALIDATION", "READY_FOR_NOTARY", "CLIENT_CONTACTED", "SIGNED", "TERMINATED"])
    .default("DRAFT"),
  rentAmount: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) throw new Error("Le montant du loyer doit être un nombre entier positif");
    return num;
  }),
  monthlyCharges: z
    .string()
    .default("0")
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 0) return 0;
      return num;
    }),
  securityDeposit: z
    .string()
    .default("0")
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 0) return 0;
      return num;
    }),
  effectiveDate: z.string().transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) throw new Error("Date de début invalide");
    return date;
  }),
  endDate: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const date = new Date(val);
      if (isNaN(date.getTime())) return undefined;
      return date;
    }),
  paymentDay: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return null;
      const num = parseInt(val);
      if (isNaN(num) || num < 1 || num > 31) return null;
      return num;
    }),
  propertyId: z.string().cuid("ID bien invalide").min(1, "Le bien est requis"),
  tenantId: z.string().cuid("ID locataire invalide").min(1, "Le locataire est requis"),
});

// Schéma de création avec validation du dépôt de garantie
export const createLeaseSchema = createLeaseBaseSchema.superRefine((data, ctx) => {
  validateSecurityDeposit(data.leaseType, data.rentAmount, data.securityDeposit, ctx);
});

// Schéma de base pour la mise à jour - tous les champs sont optionnels
const updateLeaseBaseSchema = z.object({
  id: z.string().cuid("ID invalide"),
  leaseType: z.enum(["HABITATION", "COMMERCIAL"]).optional(),
  bailType: z
    .enum(["BAIL_NU_3_ANS", "BAIL_NU_6_ANS", "BAIL_MEUBLE_1_ANS", "BAIL_MEUBLE_9_MOIS"])
    .optional(),
  status: z
    .enum(["DRAFT", "PENDING_VALIDATION", "READY_FOR_NOTARY", "CLIENT_CONTACTED", "SIGNED", "TERMINATED"])
    .optional(),
  rentAmount: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 0) throw new Error("Le montant du loyer doit être un nombre entier positif");
      return num;
    }),
  monthlyCharges: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 0) return 0;
      return num;
    }),
  securityDeposit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 0) return 0;
      return num;
    }),
  effectiveDate: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Date de début invalide");
      return date;
    }),
  endDate: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const date = new Date(val);
      if (isNaN(date.getTime())) return undefined;
      return date;
    }),
  paymentDay: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return null;
      const num = parseInt(val);
      if (isNaN(num) || num < 1 || num > 31) return null;
      return num;
    }),
  propertyId: z.string().cuid("ID bien invalide").optional(),
  tenantId: z.string().cuid("ID locataire invalide").optional(),
});

// Schéma de mise à jour avec validation du dépôt de garantie
export const updateLeaseSchema = updateLeaseBaseSchema.superRefine((data, ctx) => {
  validateSecurityDeposit(data.leaseType, data.rentAmount, data.securityDeposit, ctx);
});

export const transitionLeaseSchema = z.object({
  id: z.string().cuid("ID invalide"),
  nextStatus: z.enum(["PENDING_VALIDATION", "READY_FOR_NOTARY", "CLIENT_CONTACTED", "SIGNED", "TERMINATED"]),
});

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;
export type TransitionLeaseInput = z.infer<typeof transitionLeaseSchema>;
