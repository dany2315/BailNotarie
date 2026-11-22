import { z } from "zod";
import "@/lib/zod/locale";

// Helper pour valider le dépôt de garantie selon le type de bail
function validateSecurityDeposit(
  bailType: string | undefined,
  rentAmount: number | undefined,
  securityDeposit: number | undefined,
  ctx: z.RefinementCtx
) {
  if (!rentAmount || !securityDeposit || rentAmount <= 0 || securityDeposit <= 0) {
    return;
  }

  // Bail meublé → max 2 mois de loyer hors charges
  // Bail nu → max 1 mois de loyer hors charges
  const isMeubleBail =
    bailType === "BAIL_MEUBLE_1_ANS" || bailType === "BAIL_MEUBLE_9_MOIS";
  const maxDeposit = isMeubleBail ? rentAmount * 2 : rentAmount;

  if (securityDeposit > maxDeposit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["securityDeposit"],
      message: `Le dépôt de garantie ne peut pas dépasser ${isMeubleBail ? "2" : "1"} mois de loyer hors charges (max ${maxDeposit.toLocaleString("fr-FR")} €)`,
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
    .enum(["DRAFT", "AWAITING_TENANT", "AWAITING_TENANT_FORM", "PENDING_VALIDATION", "READY_FOR_NOTARY", "CLIENT_CONTACTED", "PROVISION_RECEIVED", "SIGNED", "TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"])
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
  // Date de début et jour de paiement : demandés une fois le locataire choisi. Sans locataire, ils restent
  // vides (jamais une date d'attente) ; avec un locataire, ils sont exigés (contrôle plus bas).
  effectiveDate: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
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
  // Hors de 1 à 31 : refusé (plus remplacé par « vide » sans le dire). La limite à 28 se contrôle dans
  // l'action, qui laisse passer une valeur déjà enregistrée.
  paymentDay: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || (/^\d{1,2}$/.test(val.trim()) && Number(val) >= 1 && Number(val) <= 31), "Le jour de paiement doit être compris entre 1 et 28.")
    .transform((val) => (val ? Number(val) : null)),
  propertyId: z.string().cuid("ID bien invalide").min(1, "Le bien est requis"),
  tenantId: z.string().cuid("ID locataire invalide").optional().or(z.literal("")),
  // Contrôle du loyer (espace client) : réponses sur la relocation et le complément de loyer,
  // et classe DPE saisie quand le bien n'en avait pas.
  rentRules: z.record(z.string(), z.any()).optional(),
  dpeClass: z.enum(["A", "B", "C", "D", "E", "F", "G"]).optional(),
});

// Schéma de création avec validation du dépôt de garantie
export const createLeaseSchema = createLeaseBaseSchema.superRefine((data, ctx) => {
  validateSecurityDeposit(data.bailType, data.rentAmount, data.securityDeposit, ctx);
  // Locataire choisi : la date de début et le jour de paiement sont exigés dans le même parcours.
  if (data.tenantId) {
    if (!data.effectiveDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["effectiveDate"], message: "La date de début est requise quand un locataire est indiqué" });
    if (!data.paymentDay) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paymentDay"], message: "Le jour de paiement est requis quand un locataire est indiqué" });
  }
});

// Schéma de base pour la mise à jour - tous les champs sont optionnels
const updateLeaseBaseSchema = z.object({
  id: z.string().cuid("ID invalide"),
  leaseType: z.enum(["HABITATION", "COMMERCIAL"]).optional(),
  bailType: z
    .enum(["BAIL_NU_3_ANS", "BAIL_NU_6_ANS", "BAIL_MEUBLE_1_ANS", "BAIL_MEUBLE_9_MOIS"])
    .optional(),
  status: z
    .enum(["DRAFT", "AWAITING_TENANT", "AWAITING_TENANT_FORM", "PENDING_VALIDATION", "READY_FOR_NOTARY", "CLIENT_CONTACTED", "PROVISION_RECEIVED", "SIGNED", "TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"])
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
    .refine((val) => !val || (/^\d{1,2}$/.test(val.trim()) && Number(val) >= 1 && Number(val) <= 31), "Le jour de paiement doit être compris entre 1 et 28.")
    .transform((val) => {
      if (!val) return null;
      return Number(val);
    }),
  propertyId: z.string().cuid("ID bien invalide").optional(),
  tenantId: z.string().cuid("ID locataire invalide").optional(),
});

// Schéma de mise à jour avec validation du dépôt de garantie
export const updateLeaseSchema = updateLeaseBaseSchema.superRefine((data, ctx) => {
  validateSecurityDeposit(data.bailType, data.rentAmount, data.securityDeposit, ctx);
});

export const transitionLeaseSchema = z.object({
  id: z.string().cuid("ID invalide"),
  nextStatus: z.enum(["AWAITING_TENANT", "AWAITING_TENANT_FORM", "PENDING_VALIDATION", "READY_FOR_NOTARY", "CLIENT_CONTACTED", "PROVISION_RECEIVED", "SIGNED", "TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"]),
});

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;
export type TransitionLeaseInput = z.infer<typeof transitionLeaseSchema>;
