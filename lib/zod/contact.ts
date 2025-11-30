import { z } from "zod";
import { isValidPhoneNumberSafe } from "@/lib/utils/phone-validation";

export const contactFormSchema = z.object({
  firstName: z.string()
    .min(2, "Le prénom doit contenir au moins 2 caractères")
    .max(50, "Le prénom est trop long")
    .trim()
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le prénom contient des caractères invalides"),
  lastName: z.string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom est trop long")
    .trim()
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le nom contient des caractères invalides"),
  email: z.string()
    .email("Adresse email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(),
  phone: z.string()
    .min(1, "Le numéro de téléphone est requis")
    .refine((val) => isValidPhoneNumberSafe(val), {
      message: "Numéro de téléphone invalide",
    })
    .trim(),
  message: z.string()
    .min(10, "Le message doit contenir au moins 10 caractères")
    .max(2000, "Le message est trop long")
    .trim(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

