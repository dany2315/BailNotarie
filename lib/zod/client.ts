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
const documentMetaSchema = z.object({
  kind: z.nativeEnum(DocumentKind),
  fileKey: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  label: z.string().optional(),
});

const personFieldsSchema = {
  firstName: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("Le prénom est requis")
      .min(1, "Le prénom est requis")
      .max(100, "Le prénom est trop long")
      .trim()
  ),
  lastName: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("Le nom est requis")
      .min(1, "Le nom est requis")
      .max(100, "Le nom est trop long")
      .trim()
  ),
  profession: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("La profession est requise")
      .min(1, "La profession est requise")
      .max(200, "La profession est trop longue")
      .trim()
  ),
  phone: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("Le numéro de téléphone est requis")
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
    .trim(),
  fullAddress: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("L'adresse est requise")
      .min(1, "L'adresse est requise")
      .max(500, "L'adresse est trop longue")
      .trim()
  ),
  nationality: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("La nationalité est requise")
      .min(1, "La nationalité est requise")
      .max(100, "La nationalité est trop longue")
      .trim()
  ),
  familyStatus: z.nativeEnum(FamilyStatus, {
    message: "La situation familiale est requise",
  }),
  matrimonialRegime: z.nativeEnum(MatrimonialRegime).optional(),
  birthPlace: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string("Le lieu de naissance est requis")
      .min(1, "Le lieu de naissance est requis")
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
  isPrimary: z.boolean().optional(),
  documents: z.array(documentMetaSchema).optional(),
};

const personsArraySchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch (error) {
        return [];
      }
    }
    return val;
  },
  z.array(z.object(personFieldsSchema)).optional()
);

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
  kbis: z.any().optional(),
  statutes: z.any().optional(),
  
  // Pièces jointes - Client (personne physique)
  birthCert: z.any().optional(),
  idIdentity: z.any().optional(),
  livretDeFamille: z.any().optional(),
  contratDePacs: z.any().optional(),
  
  // Pièces jointes - Bien (propriétaire uniquement)
  diagnostics: z.any().optional(),
  reglementCopropriete: z.any().optional(),
  cahierChargeLotissement: z.any().optional(),
  statutAssociationSyndicale: z.any().optional(),
  
  // Pièces jointes - Bail (propriétaire et locataire)
  insuranceOwner: z.any().optional(),
  ribOwner: z.any().optional(),

  // Pièces jointes - Titre de propriété
  titleDeed: z.any().optional(),
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
  persons: personsArraySchema,
});

// Schéma pour client personne morale PROPRIETAIRE complet
export const createOwnerLegalClientSchema = z.object({
  type: z.literal(ClientType.PERSONNE_MORALE),
  profilType: z.literal(ProfilType.PROPRIETAIRE),
  ...legalPersonFieldsSchema,
  ...contactFieldsSchemaWithRequiredEmail,
  persons: personsArraySchema,
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
export const ownerFormSchema = z
  .object({
    // Données client propriétaire
    clientId: z.string().cuid("ID client invalide"),
    type: z.nativeEnum(ClientType),

    // 🌟 SEULS CHAMPS "IDENTITÉ" EN RACINE → email + téléphone
    // Le téléphone peut venir de persons[0].phone pour PERSONNE_PHYSIQUE
    phone: z.preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? undefined : val,
      z
        .string()
        .max(15, "Le numéro de téléphone est trop long")
        .refine((val) => !val || isValidPhoneNumberSafe(val), {
          message: "Numéro de téléphone invalide",
        })
        .optional()
    ),
    email: z
      .string()
      .email("Email invalide")
      .max(100, "L'email est trop long")
      .toLowerCase()
      .trim(), // Email requis et non modifiable

    // Données du bien
    ...propertyFieldsSchema,

    // Données du bail
    ...bailFieldsSchema,

    clientDocuments: z.array(documentMetaSchema).optional(),
    propertyDocuments: z.array(documentMetaSchema).optional(),
    bailDocuments: z.array(documentMetaSchema).optional(),

    // Données du locataire (email uniquement)
    tenantEmail: z.preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? undefined : val,
      z
        .string()
        .email("Email du locataire invalide")
        .max(100, "L'email est trop long")
        .toLowerCase()
        .trim()
        .optional()
    ),

    // Pièces jointes
    ...documentFieldsSchema,

    // Bloc entreprise (pour PERSONNE_MORALE)
    entreprise: z
      .object({
        legalName: z
          .string()
          .min(1, "La raison sociale est requise")
          .max(200, "La raison sociale est trop longue")
          .trim(),
        registration: z
          .string()
          .min(1, "Le numéro d'enregistrement est requis")
          .max(50, "Le numéro d'enregistrement est trop long")
          .trim(),
        name: z
          .string()
          .min(1, "Le nom commercial est requis")
          .max(200, "Le nom commercial est trop long")
          .trim(),
        email: z
          .string()
          .email("Email invalide")
          .max(100, "L'email est trop long")
          .toLowerCase()
          .trim(),
        phone: z
          .string()
          .min(1, "Le numéro de téléphone est requis")
          .max(15, "Le numéro de téléphone est trop long")
          .trim(),
        fullAddress: z
          .string()
          .min(1, "L'adresse est requise")
          .max(500, "L'adresse est trop longue")
          .trim(),
      })
      .optional(),
    documents: z.array(documentMetaSchema).optional(),

    // Personnes (personne principale + autres)
    // 👉 Contient TOUTES les infos perso (nom, prénom, naissance, etc.)
    persons: personsArraySchema,
  })
  .superRefine((data, ctx) => {
    // ------------------------------------------------------------------
    // PERSONNE PHYSIQUE → tout doit venir de persons[]
    // ------------------------------------------------------------------
    if (data.type === ClientType.PERSONNE_PHYSIQUE) {
      if (!data.persons || data.persons.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["persons"],
          message: "Au moins une personne est requise",
        });
        return;
      }

      const isEmpty = (val: unknown) =>
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "");

      data.persons.forEach((person, index) => {
        const basePath: (string | number)[] = ["persons", index];

        if (isEmpty(person.firstName)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "firstName"],
            message: "Le prénom est requis",
          });
        }

        if (isEmpty(person.lastName)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "lastName"],
            message: "Le nom est requis",
          });
        }

        if (isEmpty(person.email)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "email"],
            message: "L'email est requis",
          });
        }

        if (isEmpty(person.phone)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "phone"],
            message: "Le téléphone est requis",
          });
        }

        if (isEmpty(person.fullAddress)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "fullAddress"],
            message: "L'adresse est requise",
          });
        }

        if (isEmpty(person.profession)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "profession"],
            message: "La profession est requise",
          });
        }

        if (isEmpty(person.nationality)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "nationality"],
            message: "La nationalité est requise",
          });
        }

        if (!person.familyStatus) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "familyStatus"],
            message: "La situation familiale est requise",
          });
        }

        if (isEmpty(person.birthPlace)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "birthPlace"],
            message: "Le lieu de naissance est requis",
          });
        }

        if (!person.birthDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "birthDate"],
            message: "La date de naissance est requise",
          });
        }

        // Régime matrimonial requis uniquement si statut familial = MARIE
        if (
          person.familyStatus === FamilyStatus.MARIE &&
          !person.matrimonialRegime
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "matrimonialRegime"],
            message:
              "Le régime matrimonial est requis lorsque le statut familial est marié",
          });
        }
      });
      
      // Vérifier que le téléphone est présent (soit au niveau racine, soit dans persons[0])
      const primaryPerson = data.persons[0];
      const hasPhoneAtRoot = data.phone && data.phone.trim() !== "";
      const hasPhoneInPerson = primaryPerson?.phone && primaryPerson.phone.trim() !== "";
      
      if (!hasPhoneAtRoot && !hasPhoneInPerson) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Le numéro de téléphone est requis",
        });
      }
    }

    // ------------------------------------------------------------------
    // PERSONNE MORALE → tout doit venir de entreprise
    // ------------------------------------------------------------------
    if (data.type === ClientType.PERSONNE_MORALE) {
      if (!data.entreprise) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entreprise"],
          message: "Les informations de l'entreprise sont requises",
        });
      }
    }
  });


// Schéma pour formulaire locataire complet (tous les champs requis)
// Utilise la même structure que ownerFormSchema avec persons/entreprise
export const tenantFormSchema = z
  .object({
    // Données client locataire
    clientId: z.string().cuid("ID client invalide"),
    type: z.nativeEnum(ClientType),

    // 🌟 SEULS CHAMPS "IDENTITÉ" EN RACINE → email + téléphone
    // Le téléphone peut venir de persons[0].phone pour PERSONNE_PHYSIQUE
    phone: z.preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? undefined : val,
      z
        .string()
        .max(15, "Le numéro de téléphone est trop long")
        .refine((val) => !val || isValidPhoneNumberSafe(val), {
          message: "Numéro de téléphone invalide",
        })
        .optional()
    ),
    email: z
      .string()
      .email("Email invalide")
      .max(100, "L'email est trop long")
      .toLowerCase()
      .trim(), // Email requis et non modifiable

    // Documents du client (assurance, RIB)
    clientDocuments: z.array(documentMetaSchema).optional(),

    // Bloc entreprise (pour PERSONNE_MORALE)
    entreprise: z
      .object({
        legalName: z
          .string()
          .min(1, "La raison sociale est requise")
          .max(200, "La raison sociale est trop longue")
          .trim(),
        registration: z
          .string()
          .min(1, "Le numéro d'enregistrement est requis")
          .max(50, "Le numéro d'enregistrement est trop long")
          .trim(),
        name: z
          .string()
          .min(1, "Le nom commercial est requis")
          .max(200, "Le nom commercial est trop long")
          .trim(),
        email: z
          .string()
          .email("Email invalide")
          .max(100, "L'email est trop long")
          .toLowerCase()
          .trim(),
        phone: z
          .string()
          .min(1, "Le numéro de téléphone est requis")
          .max(15, "Le numéro de téléphone est trop long")
          .trim(),
        fullAddress: z
          .string()
          .min(1, "L'adresse est requise")
          .max(500, "L'adresse est trop longue")
          .trim(),
        nationality: z
          .string()
          .min(1, "La nationalité est requise")
          .max(100, "La nationalité est trop longue")
          .trim(),
      })
      .optional(),
    documents: z.array(documentMetaSchema).optional(),

    // Personnes (personne principale + autres)
    // 👉 Contient TOUTES les infos perso (nom, prénom, naissance, etc.)
    persons: personsArraySchema,
  })
  .superRefine((data, ctx) => {
    // ------------------------------------------------------------------
    // PERSONNE PHYSIQUE → tout doit venir de persons[]
    // ------------------------------------------------------------------
    if (data.type === ClientType.PERSONNE_PHYSIQUE) {
      if (!data.persons || data.persons.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["persons"],
          message: "Au moins une personne est requise",
        });
        return;
      }

      const isEmpty = (val: unknown) =>
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "");

      data.persons.forEach((person, index) => {
        const basePath: (string | number)[] = ["persons", index];

        if (isEmpty(person.firstName)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "firstName"],
            message: "Le prénom est requis",
          });
        }

        if (isEmpty(person.lastName)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "lastName"],
            message: "Le nom est requis",
          });
        }

        if (isEmpty(person.email)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "email"],
            message: "L'email est requis",
          });
        }

        if (isEmpty(person.phone)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "phone"],
            message: "Le téléphone est requis",
          });
        }

        if (isEmpty(person.fullAddress)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "fullAddress"],
            message: "L'adresse est requise",
          });
        }

        if (isEmpty(person.profession)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "profession"],
            message: "La profession est requise",
          });
        }

        if (isEmpty(person.nationality)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "nationality"],
            message: "La nationalité est requise",
          });
        }

        if (!person.familyStatus) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "familyStatus"],
            message: "La situation familiale est requise",
          });
        }

        if (isEmpty(person.birthPlace)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "birthPlace"],
            message: "Le lieu de naissance est requis",
          });
        }

        if (!person.birthDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "birthDate"],
            message: "La date de naissance est requise",
          });
        }

        // Régime matrimonial requis uniquement si statut familial = MARIE
        if (
          person.familyStatus === FamilyStatus.MARIE &&
          !person.matrimonialRegime
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...basePath, "matrimonialRegime"],
            message:
              "Le régime matrimonial est requis lorsque le statut familial est marié",
          });
        }
      });
      
      // Vérifier que le téléphone est présent (soit au niveau racine, soit dans persons[0])
      const primaryPerson = data.persons[0];
      const hasPhoneAtRoot = data.phone && data.phone.trim() !== "";
      const hasPhoneInPerson = primaryPerson?.phone && primaryPerson.phone.trim() !== "";
      
      if (!hasPhoneAtRoot && !hasPhoneInPerson) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Le numéro de téléphone est requis",
        });
      }
    }

    // ------------------------------------------------------------------
    // PERSONNE MORALE → tout doit venir de entreprise
    // ------------------------------------------------------------------
    if (data.type === ClientType.PERSONNE_MORALE) {
      if (!data.entreprise) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entreprise"],
          message: "Les informations de l'entreprise sont requises",
        });
      }
    }
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

// Schéma pour une personne dans le formulaire d'édition
const updatePersonSchema = z.object({
  id: z.string().cuid().optional(), // ID existant ou undefined pour nouvelle personne
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
  phone: z.string()
    .trim()
    .optional()
    .refine((val) => !val || isValidPhoneNumberSafe(val), {
      message: "Numéro de téléphone invalide",
    }),
  email: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .email("Email invalide")
      .max(100, "L'email est trop long")
      .toLowerCase()
      .trim()
      .optional()
  ),
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
  isPrimary: z.boolean().optional(),
});

export const updateClientSchema = z.object({
  id: z.string().cuid("ID invalide"),
  type: z.nativeEnum(ClientType).optional(),
  profilType: z.nativeEnum(ProfilType).optional(),
  // Pour PERSONNE_PHYSIQUE : tableau de personnes
  persons: z.array(updatePersonSchema).optional(),
  // Pour PERSONNE_MORALE : données de l'entreprise
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
  name: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string()
      .max(200, "Le nom commercial est trop long")
      .trim()
      .optional()
  ),
  // Champs de contact pour entreprise (peuvent être dans l'objet entreprise)
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
}).superRefine((data, ctx) => {
  // Validation conditionnelle selon le type de client
  if (!data.type) {
    return;
  }

  if (data.type === ClientType.PERSONNE_PHYSIQUE) {
    // Pour personne physique : valider qu'il y a au moins une personne
    if (data.persons && data.persons.length > 0) {
      // Vérifier qu'au moins une personne est marquée comme primaire
      const hasPrimary = data.persons.some(p => p.isPrimary);
      if (!hasPrimary && data.persons.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Au moins une personne doit être marquée comme primaire",
          path: ["persons"],
        });
      }
    }
  } else if (data.type === ClientType.PERSONNE_MORALE) {
    // Pour personne morale : pas de validation supplémentaire
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
