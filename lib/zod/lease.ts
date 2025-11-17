import { z } from "zod";

export const createLeaseSchema = z.object({
  leaseType: z.enum(["HABITATION", "MEUBLE", "COMMERCIAL", "PROFESSIONNEL", "SAISONNIER", "OTHER"]).default("HABITATION"),
  status: z.enum(["DRAFT", "PENDING_VALIDATION", "READY_FOR_NOTARY", "ACTIVE", "TERMINATED", "CANCELED"]).default("DRAFT"),
  rentAmount: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) throw new Error("Le montant du loyer doit être un nombre entier positif");
    return num;
  }),
  monthlyCharges: z.string().default("0").transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return 0;
    return num;
  }),
  securityDeposit: z.string().default("0").transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return 0;
    return num;
  }),
  effectiveDate: z.string().transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) throw new Error("Date de début invalide");
    return date;
  }),
  endDate: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const date = new Date(val);
    if (isNaN(date.getTime())) return undefined;
    return date;
  }),
  paymentDay: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseInt(val);
    if (isNaN(num) || num < 1 || num > 31) return null;
    return num;
  }),
  propertyId: z.string().cuid("ID bien invalide").min(1, "Le bien est requis"),
  tenantId: z.string().cuid("ID locataire invalide").min(1, "Le locataire est requis"),
});

// Schéma de mise à jour - tous les champs sont optionnels
export const updateLeaseSchema = z.object({
  id: z.string().cuid("ID invalide"),
  leaseType: z.enum(["HABITATION", "MEUBLE", "COMMERCIAL", "PROFESSIONNEL", "SAISONNIER", "OTHER"]).optional(),
  status: z.enum(["DRAFT", "PENDING_VALIDATION", "READY_FOR_NOTARY", "ACTIVE", "TERMINATED", "CANCELED"]).optional(),
  rentAmount: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) throw new Error("Le montant du loyer doit être un nombre entier positif");
    return num;
  }),
  monthlyCharges: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return 0;
    return num;
  }),
  securityDeposit: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return 0;
    return num;
  }),
  effectiveDate: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const date = new Date(val);
    if (isNaN(date.getTime())) throw new Error("Date de début invalide");
    return date;
  }),
  endDate: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const date = new Date(val);
    if (isNaN(date.getTime())) return undefined;
    return date;
  }),
  paymentDay: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseInt(val);
    if (isNaN(num) || num < 1 || num > 31) return null;
    return num;
  }),
  propertyId: z.string().cuid("ID bien invalide").optional(),
  tenantId: z.string().cuid("ID locataire invalide").optional(),
});

export const transitionLeaseSchema = z.object({
  id: z.string().cuid("ID invalide"),
  nextStatus: z.enum(["PENDING_VALIDATION", "READY_FOR_NOTARY", "ACTIVE", "TERMINATED", "CANCELED"]),
});

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;
export type TransitionLeaseInput = z.infer<typeof transitionLeaseSchema>;


