import { z } from "zod";
import { isValidPhoneNumberSafe } from "@/lib/utils/phone-validation";
import { 
  ClientType, 
  ProfilType, 
  FamilyStatus, 
  MatrimonialRegime,
  PropertyStatus,
  BienType,
  BienLegalStatus,
  BailType,
  BailFamille,
  BailStatus,
  DocumentKind
} from "@prisma/client";

// ============================================================================
// SCHÉMAS RÉUTILISABLES - Champs communs
// ============================================================================

// Schéma pour les champs de contact communs (email optionnel par défaut)
const contactFieldsSchema = {
  phone: z.string()
    .optional()
    .refine((val) => !val || isValidPhoneNumberSafe(val), {
      message: "Numéro de téléphone invalide",
    }),
  email: z.string()
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim()
    .optional(),
  fullAddress: z.string()
    .max(500, "L'adresse est trop longue")
    .trim()
    .optional(),
  nationality: z.string()
    .max(100, "La nationalité est trop longue")
    .trim()
    .optional(),
};

// Schéma pour les champs de contact avec email requis
const contactFieldsSchemaWithRequiredEmail = {
  phone: z.string()
    .optional()
    .refine((val) => !val || isValidPhoneNumberSafe(val), {
      message: "Numéro de téléphone invalide",
    }),
  email: z.string()
    .min(1, "L'email est requis")
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(),
  fullAddress: z.string()
    .max(500, "L'adresse est trop longue")
    .trim()
    .optional(),
  nationality: z.string()
    .max(100, "La nationalité est trop longue")
    .trim()
    .optional(),
};

// Schéma pour les champs de personne physique
const physicalPersonFieldsSchema = {
  firstName: z.string()
    .max(100, "Le prénom est trop long")
    .trim().optional(),
  lastName: z.string()
    .max(100, "Le nom est trop long")
    .trim().optional(),
  profession: z.string()
    .max(200, "La profession est trop longue")
    .trim()
    .optional(),
  familyStatus: z.nativeEnum(FamilyStatus).optional(),
  matrimonialRegime: z.nativeEnum(MatrimonialRegime).optional(),
  birthPlace: z.string()
    .max(200, "Le lieu de naissance est trop long")
    .trim()
    .optional(),
  birthDate: z.string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const date = new Date(val);
      if (isNaN(date.getTime())) return undefined;
      return date;
    }),
};

// Schéma pour les champs de personne morale
const legalPersonFieldsSchema = {
  legalName: z.string()
    .min(1, "La raison sociale est requise")
    .max(200, "La raison sociale est trop longue")
    .trim(),
  registration: z.string()
    .max(50, "Le numéro d'enregistrement est trop long")
    .trim()
    .optional(),
};

// Schéma pour les données du bien
const propertyFieldsSchema = {
  propertyLabel: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(200, "Le libellé est trop long")
      .trim()
      .optional()
  ),

  propertyFullAddress: z
    .string()
    .trim()
    .min(1, "L'adresse du bien est requise")
    .max(500, "L'adresse est trop longue"),

  propertySurfaceM2: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .min(1, "La surface est requise")
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      }, {
        message: "La surface doit être un nombre positif",
      })
      .transform((val) => parseFloat(val))
  ),

  propertyType: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      return val;
    },
    z.union([
      z.nativeEnum(BienType),
      z.undefined(),
    ]).refine((val) => val !== undefined, {
      message: "Le type de bien est requis",
    })
  ),

  propertyLegalStatus: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      return val;
    },
    z.union([
      z.nativeEnum(BienLegalStatus),
      z.undefined(),
    ]).refine((val) => val !== undefined, {
      message: "Le statut légal est requis",
    })
  ),

  propertyStatus: z
    .nativeEnum(PropertyStatus)
    .default(PropertyStatus.NON_LOUER),
};

// Schéma pour les données du bail
const bailFieldsSchema = {
  bailType: z.nativeEnum(BailType)
    .default(BailType.BAIL_NU_3_ANS),
  bailFamily: z.nativeEnum(BailFamille)
    .default(BailFamille.HABITATION),
  bailRentAmount: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .min(1, "Le montant du loyer est requis")
      .refine((val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 0;
      }, {
        message: "Le montant du loyer doit être un nombre entier positif",
      })
      .transform((val) => parseInt(val, 10))
  ),
  bailMonthlyCharges: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .min(1, "Les charges mensuelles sont requises")
      .refine((val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 0;
      }, {
        message: "Les charges mensuelles doivent être un nombre entier positif ou zéro",
      })
      .transform((val) => parseInt(val, 10))
  ),
  bailSecurityDeposit: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .min(1, "Le dépôt de garantie est requis")
      .refine((val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 0;
      }, {
        message: "Le dépôt de garantie doit être un nombre entier positif ou zéro",
      })
      .transform((val) => parseInt(val, 10))
  ),
  bailEffectiveDate: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .min(1, "La date de prise d'effet est requise")
      .transform((val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) {
          throw new z.ZodError([{
            code: z.ZodIssueCode.custom,
            path: ["bailEffectiveDate"],
            message: "Date de début invalide",
          }]);
        }
        return date;
      })
  ),
  bailEndDate: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return String(val);
    },
    z.string()
      .optional()
      .transform((val) => {
        if (!val || val === "") return undefined;
        const date = new Date(val);
        if (isNaN(date.getTime())) return undefined;
        return date;
      })
  ),
  bailPaymentDay: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .min(1, "Le jour de paiement est requis")
      .refine((val) => {
        const num = parseInt(val);
        return !isNaN(num) && num >= 1 && num <= 31;
      }, {
        message: "Le jour de paiement doit être un nombre entre 1 et 31",
      })
      .transform((val) => {
        const num = parseInt(val);
        return num;
      })
  ),
};

// Schéma pour les pièces jointes
const documentFieldsSchema = {
  // Pièces jointes - Client (personne morale)
  kbis: z.any(),
  statutes: z.any(),
  
  // Pièces jointes - Client (personne physique)
  birthCert: z.any(),
  idIdentity: z.any(),
  livretDeFamille: z.any(),
  contratDePacs: z.any(),
  
  // Pièces jointes - Bien (propriétaire uniquement)
  diagnostics: z.any(),
  reglementCopropriete: z.any(),
  cahierChargeLotissement: z.any(),
  statutAssociationSyndicale: z.any(),
  
  // Pièces jointes - Bail (propriétaire et locataire)
  insuranceOwner: z.any(),
  ribOwner: z.any(),

  // Pièces jointes - Titre de propriété
  titleDeed: z.any(),
};

// ============================================================================
// SCHÉMAS DE CRÉATION DE CLIENT
// ============================================================================

// Schéma pour création basique de client (email uniquement)
export const createBasicClientSchema = z.object({
  email: z.string()
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(),
  profilType: z.literal(ProfilType.PROPRIETAIRE),
});

// Schéma pour client personne physique PROPRIETAIRE complet
export const createOwnerPhysicalClientSchema = z.object({
  type: z.literal(ClientType.PERSONNE_PHYSIQUE),
  profilType: z.literal(ProfilType.PROPRIETAIRE).default(ProfilType.PROPRIETAIRE),
  ...physicalPersonFieldsSchema,
  ...contactFieldsSchemaWithRequiredEmail,
});

// Schéma pour client personne morale PROPRIETAIRE complet
export const createOwnerLegalClientSchema = z.object({
  type: z.literal(ClientType.PERSONNE_MORALE),
  profilType: z.literal(ProfilType.PROPRIETAIRE),
  ...legalPersonFieldsSchema,
  ...contactFieldsSchemaWithRequiredEmail,
});

// Schéma pour client LOCATAIRE (minimum requis)
export const createTenantBasicClientSchema = z.object({
  type: z.literal(ClientType.PERSONNE_PHYSIQUE),
  profilType: z.literal(ProfilType.LOCATAIRE),
  firstName: z.string()
    .min(1, "Le prénom est requis")
    .max(100, "Le prénom est trop long")
    .trim(),
  lastName: z.string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom est trop long")
    .trim(),
  email: z.string()
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(),
  phone: z.string()
    .optional()
    .refine((val) => !val || isValidPhoneNumberSafe(val), {
      message: "Numéro de téléphone invalide",
    }),
});

// ============================================================================
// SCHÉMAS DE FORMULAIRES (INTAKE)
// ============================================================================

// Schéma pour formulaire propriétaire (avec données du bien)
export const ownerFormSchema = z.object({
  // Données client propriétaire
  clientId: z.string().cuid("ID client invalide"),
  type: z.nativeEnum(ClientType),
  // Champs personne physique (optionnels mais validés conditionnellement)
  firstName: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("le prénom est requis")
      .max(100, "Le prénom est trop long")
      .trim()
  ),
  lastName: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("le nom est requis")
      .max(100, "Le nom est trop long")
      .trim()
  ),
  profession: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("le profession est requis")
      .max(200, "La profession est trop longue")
      .trim()
  ),
  familyStatus: z.nativeEnum(FamilyStatus, {
    error:"La situation familiale est requise"
  }),
  matrimonialRegime: z.nativeEnum(MatrimonialRegime, {
    error: "Le régime matrimonial est requis",
  }).optional(),
  birthPlace: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("le lieu de naissance est requis")
      .max(200, "Le lieu de naissance est trop long")
      .trim()
  ),
  birthDate: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .min(1, "La date de naissance est requise")
      .transform((val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) {
          throw new z.ZodError([{
            code: z.ZodIssueCode.custom,
            path: ["birthDate"],
            message: "Date de naissance invalide",
          }]);
        }
        return date;
      })
  ),
  // Champs personne morale (optionnels mais validés conditionnellement)
  legalName: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(200, "La raison sociale est trop longue")
      .trim()
      .optional()
  ),
  registration: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(50, "Le numéro d'enregistrement est trop long")
      .trim()
      .optional()
  ),
  // Champs communs
  phone: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("le numéro de téléphone est requis")
      .min(1, "Le numéro de téléphone est requis")
      .max(15, "Le numéro de téléphone est trop long")
      .refine((val) => !val || isValidPhoneNumberSafe(val), {
        message: "Numéro de téléphone invalide",
      })
  ),
  email: z.string()
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(), // Email requis et non modifiable
  fullAddress: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("l'adresse est requis")
      .max(500, "L'adresse est trop longue")
      .trim()
  ),
  nationality: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("la nationalité est requis")
      .min(1, "La nationalité est requise")
      .max(100, "La nationalité est trop longue")
      .trim()
      .refine((val) => val !== undefined, {
        message: "La nationalité est requise",
      })
  ),
  
  // Données du bien
  ...propertyFieldsSchema,
  
  // Données du bail
  ...bailFieldsSchema,
  
  // Données du locataire (email uniquement)
  tenantEmail: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .email("Email du locataire invalide")
      .max(100, "L'email est trop long")
      .toLowerCase()
      .trim()
      .optional()
  ),
  
  // Pièces jointes
  ...documentFieldsSchema,
}).superRefine((data, ctx) => {
  // Validation conditionnelle selon le type de client
  if (data.type === ClientType.PERSONNE_PHYSIQUE) {
    // Pour personne physique : firstName, lastName et birthDate sont requis
    if (!data.firstName || (typeof data.firstName === 'string' && data.firstName.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["firstName"],
        message: "Le prénom est requis",
      });
    }
    if (!data.lastName || (typeof data.lastName === 'string' && data.lastName.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastName"],
        message: "Le nom est requis",
      });
    }
    if (!data.birthDate || data.birthDate === null || data.birthDate === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDate"],
        message: "La date de naissance est requise",
      });
    }
  } else if (data.type === ClientType.PERSONNE_MORALE) {
    // Pour personne morale : legalName et registration sont requis
    if (!data.legalName || (typeof data.legalName === 'string' && data.legalName.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legalName"],
        message: "La raison sociale est requise",
      });
    }
    if (!data.registration || (typeof data.registration === 'string' && data.registration.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registration"],
        message: "Le SIREN/SIRET est requis",
      });
    }
  }
});

// Schéma pour formulaire locataire complet (tous les champs requis)
export const tenantFormSchema = z.object({
  clientId: z.string().cuid("ID client invalide"),
  // Champs personne physique (tous requis)
  type: z.nativeEnum(ClientType),
  firstName: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("le prénom est requis")
      .max(100, "Le prénom est trop long")
      .trim()
  ),
  lastName: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("le nom est requis")
      .max(100, "Le nom est trop long")
      .trim()
  ),
    profession: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : val),
      z.string("le profession est requis")
        .max(200, "La profession est trop longue")
        .trim()
    ),
  familyStatus: z.nativeEnum(FamilyStatus, {
      error:"La situation familiale est requise"
    }),
  matrimonialRegime: z.nativeEnum(MatrimonialRegime, {
      error: "Le régime matrimonial est requis",
    }).optional(),
    birthPlace: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : val),
      z.string("le lieu de naissance est requis")
        .max(200, "Le lieu de naissance est trop long")
        .trim()
    ),
    birthDate: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return "";
        return String(val);
      },
      z.string()
        .min(1, "La date de naissance est requise")
        .transform((val) => {
          const date = new Date(val);
          if (isNaN(date.getTime())) {
            throw new z.ZodError([{
              code: z.ZodIssueCode.custom,
              path: ["birthDate"],
              message: "Date de naissance invalide",
            }]);
          }
          return date;
        })
    ),
  // Champs de contact (tous requis)
  phone: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("le numéro de téléphone est requis")
      .min(1, "Le numéro de téléphone est requis")
      .max(15, "Le numéro de téléphone est trop long")
      .refine((val) => !val || isValidPhoneNumberSafe(val), {
        message: "Numéro de téléphone invalide",
      })
  ),
  email: z.string()
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(), // Email requis et non modifiable
  fullAddress: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("l'adresse est requis")
      .max(500, "L'adresse est trop longue")
      .trim()
  ),
  legalName: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : val),
      z.string()
        .max(200, "La raison sociale est trop longue")
        .trim()
        .optional()
    ),
   registration: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : val),
      z.string()
        .max(50, "Le numéro d'enregistrement est trop long")
        .trim()
        .optional()
    ),
    nationality: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : val),
      z.string("la nationalité est requis")
        .min(1, "La nationalité est requise")
        .max(100, "La nationalité est trop longue")
        .trim()
        .refine((val) => val !== undefined, {
          message: "La nationalité est requise",
        })
    ),
});

// ============================================================================
// SCHÉMAS DE CRÉATION COMPLÈTE AVEC BIEN ET BAIL
// ============================================================================

// Schéma pour création complète de client avec bien, bail et locataire (personne physique)
export const createFullOwnerPhysicalClientWithPropertySchema = createOwnerPhysicalClientSchema.extend({

  email: z.string()
    .email("Email invalide")
    .min(1, "L'email est requis")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(),
  // Données du bien
  propertyLabel: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(200, "Le libellé est trop long")
      .trim()
      .optional()
  ),

  propertyFullAddress: z
    .string()
    .trim()
    .min(1, "L'adresse du bien est requise")
    .max(500, "L'adresse est trop longue"),


  propertySurfaceM2: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
    .optional()
  ),

  propertyType: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      return val;
    },
    z.union([
      z.nativeEnum(BienType),
      z.undefined(),
    ]).refine((val) => val !== undefined, {
      message: "Le type de bien est requis",
    })
    .optional()
  ),

  propertyLegalStatus: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      return val;
    },
    z.union([
      z.nativeEnum(BienLegalStatus),
      z.undefined(),
    ]).refine((val) => val !== undefined, {
      message: "Le statut légal est requis",
    })
    .optional()
  ),

  propertyStatus: z
    .nativeEnum(PropertyStatus)
    .default(PropertyStatus.NON_LOUER),
  
  // Données du bail
  bailType: z.nativeEnum(BailType)
    .default(BailType.BAIL_NU_3_ANS),
  bailFamily: z.nativeEnum(BailFamille)
    .default(BailFamille.HABITATION),
  bailRentAmount: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .transform((val) => parseInt(val, 10))
      .optional()
  ),
  bailMonthlyCharges: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, {
        message: "Les charges mensuelles doivent être un nombre positif ou zéro",
      })
      .transform((val) => parseInt(val, 10))
      .optional()
  ),
  bailSecurityDeposit: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, {
        message: "Le dépôt de garantie doit être un nombre positif ou zéro",
      })
      .transform((val) => parseInt(val, 10))
      .optional()
  ),
  bailEffectiveDate: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return String(val);
    },
    z.string()
      .optional()
      .transform((val) => {
        if (!val || val === "") return undefined;
        const date = new Date(val);
        if (isNaN(date.getTime())) return undefined;
        return date;
      })
      .optional()
  ),
  bailEndDate: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return String(val);
    },
    z.string()
      .optional()
      .transform((val) => {
        if (!val || val === "") return undefined;
        const date = new Date(val);
        if (isNaN(date.getTime())) return undefined;
        return date;
      })
      .optional()
  ),
  bailPaymentDay: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return "";
      return String(val);
    },
    z.string()
      .transform((val) => {
        const num = parseInt(val);
        return num;
      })
      .optional()
  ),
  
  // Données du locataire (email uniquement)
  tenantEmail: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .email("Email du locataire invalide")
      .max(100, "L'email est trop long")
      .toLowerCase()
      .trim()
      .optional()
  ),
  

});

// Schéma pour création complète de client avec bien, bail et locataire (personne morale)
export const createFullOwnerLegalClientWithPropertySchema = createOwnerLegalClientSchema.extend({
  // Données du bien
  ...propertyFieldsSchema,
  
  // Données du bail
  ...bailFieldsSchema,
  
  // Données du locataire (email uniquement)
  tenantEmail: z.string()
    .email("Email du locataire invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim()
    .optional(),
  
  // Pièces jointes
  ...documentFieldsSchema,
});

// ============================================================================
// SCHÉMAS COMPOSÉS (DISCRIMINATED UNIONS)
// ============================================================================

// Schéma pour création complète de client (sans formulaire) - version simple (sans bien/bail/locataire)
export const createFullClientSchema = z.discriminatedUnion("type", [
  createOwnerPhysicalClientSchema,
  createOwnerLegalClientSchema,
]);

// Schéma pour création complète de client avec bien, bail et locataire
export const createFullClientWithPropertySchema = z.discriminatedUnion("type", [
  createFullOwnerPhysicalClientWithPropertySchema,
  createFullOwnerLegalClientWithPropertySchema,
]);

// ============================================================================
// SCHÉMA DE MISE À JOUR
// ============================================================================

export const updateClientSchema = z.object({
  id: z.string().cuid("ID invalide"),
  type: z.nativeEnum(ClientType).optional(),
  profilType: z.nativeEnum(ProfilType).optional(),
  firstName: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(100, "Le prénom est trop long")
      .trim()
      .optional()
  ),
  lastName: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(100, "Le nom est trop long")
      .trim()
      .optional()
  ),
  profession: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(200, "La profession est trop longue")
      .trim()
      .optional()
  ),
  legalName: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(200, "La raison sociale est trop longue")
      .trim()
      .optional()
  ),
  registration: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(50, "Le numéro d'enregistrement est trop long")
      .trim()
      .optional()
  ),
  phone: z.string()
    .trim()
    .optional()
    .refine((val) => !val || isValidPhoneNumberSafe(val), {
      message: "Numéro de téléphone invalide",
    }),
  email: z.string()
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim()
    .optional(),
  fullAddress: z.string()
    .max(500, "L'adresse est trop longue")
    .trim()
    .optional(),
  nationality: z.string()
    .max(100, "La nationalité est trop longue")
    .trim()
    .optional(),
  familyStatus: z.nativeEnum(FamilyStatus).optional(),
  matrimonialRegime: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      return val;
    },
    z.nativeEnum(MatrimonialRegime).optional()
  ),
  birthPlace: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(200, "Le lieu de naissance est trop long")
      .trim()
      .optional()
  ),
  birthDate: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return String(val);
    },
    z.string()
      .optional()
      .transform((val) => {
        if (!val || val === "") return undefined;
        const date = new Date(val);
        if (isNaN(date.getTime())) return undefined;
        return date;
      })
      .optional()
  ),
}).superRefine((data, ctx) => {
  // Validation conditionnelle selon le type de client
  // Si le type n'est pas fourni, on ne fait pas de validation conditionnelle
  if (!data.type) {
    return;
  }

  if (data.type === ClientType.PERSONNE_PHYSIQUE) {
    // Pour personne physique : on ne valide pas legalName et registration
    // Ces champs ne doivent pas être présents ou doivent être undefined/null
    // Pas besoin de validation supplémentaire car ils sont optionnels
  } else if (data.type === ClientType.PERSONNE_MORALE) {
    // Pour personne morale : on ne valide pas firstName, lastName, etc.
    // Ces champs ne doivent pas être présents ou doivent être undefined/null
    // Pas besoin de validation supplémentaire car ils sont optionnels
  }
});

// ============================================================================
// TYPES EXPORTÉS
// ============================================================================

export type CreateBasicClientInput = z.infer<typeof createBasicClientSchema>;
export type CreateFullClientInput = z.infer<typeof createFullClientSchema>;
export type CreateFullClientWithPropertyInput = z.infer<typeof createFullClientWithPropertySchema>;
export type CreateTenantBasicClientInput = z.infer<typeof createTenantBasicClientSchema>;
export type OwnerFormInput = z.infer<typeof ownerFormSchema>;
export type TenantFormInput = z.infer<typeof tenantFormSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
