"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailNotaireAssignment from "@/emails/mail-notaire-assignment";
import { triggerNotaireWelcomeEmail } from "@/lib/inngest/helpers";

// Schémas de validation
const createNotaireSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

const assignDossierSchema = z.object({
  bailId: z.string().min(1, "Le bail est requis"),
  notaireId: z.string().min(1, "Le notaire est requis"),
  notes: z.string().optional().nullable(),
});

const revokeAssignmentSchema = z.object({
  assignmentId: z.string(),
});

/**
 * Helper pour sérialiser les objets Decimal de Prisma en nombres
 * Cela évite l'erreur "Only plain objects can be passed to Client Components"
 */
function serializeDecimal(value: any): any {
  if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
    return Number(value);
  }
  return value;
}

const createNotaireRequestSchema = z.object({
  dossierId: z.string().min(1, "Le dossier est requis"),
  type: z.enum(["DOCUMENT", "DATA"]),
  title: z.string().min(1, "Le titre est requis"),
  content: z.string().min(1, "Le contenu est requis"),
  targetProprietaire: z.boolean().default(false),
  targetLocataire: z.boolean().default(false),
});

/**
 * Créer un nouveau notaire
 */
export async function createNotaire(data: unknown) {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const validated = createNotaireSchema.parse(data);

  const email = validated.email.toLowerCase().trim();

  // Vérifier si l'utilisateur existe déjà
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // Si l'utilisateur existe, mettre à jour son rôle en NOTAIRE
    if (existingUser.role !== Role.NOTAIRE) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: Role.NOTAIRE,
          name: validated.name || existingUser.name,
        },
      });
    }
    revalidatePath("/interface/notaires");
    return existingUser;
  }

  // Créer un nouvel utilisateur avec le rôle NOTAIRE
  // Note: Better Auth créera automatiquement un compte, mais on peut aussi le créer manuellement
  // Pour l'instant, on crée juste l'utilisateur dans la base de données
  // Le notaire utilisera l'authentification OTP, donc pas besoin de mot de passe
  const newNotaire = await prisma.user.create({
    data: {
      email,
      name: validated.name,
      role: Role.NOTAIRE,
      emailVerified: false, // Sera vérifié lors de la première connexion OTP
    },
  });

  // Envoyer un email de bienvenue via Inngest
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.bailnotarie.fr";
    const loginUrl = `${baseUrl}/notaire/login`;

    await triggerNotaireWelcomeEmail({
      email: newNotaire.email,
      userName: newNotaire.name,
      loginUrl,
    });
  } catch (emailError) {
    console.error("Erreur lors de l'envoi de l'email de bienvenue:", emailError);
    // Ne pas faire échouer la création si l'email échoue
  }

  revalidatePath("/interface/notaires");
  return newNotaire;
}

/**
 * Assigner un dossier à un notaire
 * Un dossier = un bail avec toutes ses données (parties et bien)
 */
export async function assignDossierToNotaire(data: unknown) {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const validated = assignDossierSchema.parse(data);

  // Vérifier que le notaire existe et est bien un notaire
  const notaire = await prisma.user.findUnique({
    where: { id: validated.notaireId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!notaire || notaire.role !== Role.NOTAIRE) {
    throw new Error("Notaire introuvable ou invalide");
  }

  // Récupérer le bail avec sa propriété et ses parties
  const bail = await prisma.bail.findUnique({
    where: { id: validated.bailId },
    include: {
      property: {
        include: {
          owner: {
            include: {
              persons: { where: { isPrimary: true }, take: 1 },
              entreprise: true,
            },
          },
        },
      },
      parties: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
    },
  });

  if (!bail) {
    throw new Error("Bail introuvable");
  }

  if (!bail.property) {
    throw new Error("Le bail doit être associé à une propriété");
  }

  // Utiliser le propriétaire de la propriété comme client principal
  // Si le propriétaire n'est pas dans les parties, on l'ajoute logiquement
  const clientId = bail.property.ownerId;

  // Vérifier si l'assignation existe déjà
  const existingAssignment = await prisma.dossierNotaireAssignment.findFirst({
    where: {
      bailId: validated.bailId,
      notaireId: validated.notaireId,
    },
  });

  if (existingAssignment) {
    throw new Error("Ce bail est déjà assigné à ce notaire");
  }

  // Créer l'assignation
  const assignment = await prisma.dossierNotaireAssignment.create({
    data: {
      clientId: clientId,
      propertyId: bail.propertyId,
      bailId: validated.bailId,
      notaireId: validated.notaireId,
      assignedById: user.id,
      notes: validated.notes || null,
    },
    include: {
      client: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
      property: true,
      bail: {
        include: {
          property: true,
          parties: {
            include: {
              persons: { where: { isPrimary: true }, take: 1 },
              entreprise: true,
            },
          },
        },
      },
      notaire: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  // Envoyer un email de notification au notaire (optionnel)
  try {
    const client = bail.property.owner;
    const clientName = client?.entreprise?.legalName || 
                      (client?.persons?.[0] ? `${client.persons[0].firstName || ""} ${client.persons[0].lastName || ""}`.trim() : "Client") ||
                      "Client";
    const propertyAddress = bail.property.fullAddress || undefined;

    await resendSendEmail({
      from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
      to: notaire.email,
      subject: "Nouveau dossier assigné - BailNotarie",
      react: MailNotaireAssignment({
        userName: notaire.name,
        clientName,
        propertyAddress,
        notes: validated.notes || undefined,
        interfaceUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.bailnotarie.fr"}/notaire/dossiers`,
      }),
    });
  } catch (emailError) {
    console.error("Erreur lors de l'envoi de l'email d'assignation:", emailError);
    // Ne pas faire échouer l'assignation si l'email échoue
  }

  // Sérialiser les données pour convertir les Decimal en nombres
  const serializedAssignment = JSON.parse(JSON.stringify(assignment, (key, value) => serializeDecimal(value)));

  revalidatePath("/interface/notaires");
  revalidatePath("/interface/baux");
  return serializedAssignment;
}

/**
 * Récupérer tous les dossiers assignés à un notaire
 */
export async function getDossiersByNotaire(notaireId?: string) {
  const user = await requireAuth();
  
  // Si notaireId n'est pas fourni, utiliser l'utilisateur connecté
  const targetNotaireId = notaireId || user.id;

  // Vérifier que l'utilisateur est un notaire ou un admin
  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  // Si l'utilisateur est un notaire, il ne peut voir que ses propres dossiers
  if (user.role === Role.NOTAIRE && user.id !== targetNotaireId) {
    throw new Error("Non autorisé");
  }

  const assignments = await prisma.dossierNotaireAssignment.findMany({
    where: {
      notaireId: targetNotaireId,
    },
    include: {
      client: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
      property: true,
      bail: {
        include: {
          property: true,
          parties: {
            include: {
              persons: {
                orderBy: { isPrimary: 'desc' },
              },
              entreprise: true,
              documents: true,
            },
          },
        },
      },
      notaire: {
        select: { id: true, email: true, name: true },
      },
      assignedBy: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });

  // Sérialiser les données pour convertir les Decimal en nombres
  // Cela évite l'erreur "Only plain objects can be passed to Client Components"
  const serializedAssignments = JSON.parse(JSON.stringify(assignments, (key, value) => serializeDecimal(value)));

  return serializedAssignments;
}

/**
 * Récupérer un dossier spécifique (vérifie que le notaire y a accès)
 */
export async function getDossierById(assignmentId: string) {
  const user = await requireAuth();

  const assignment = await prisma.dossierNotaireAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      client: {
        include: {
          persons: true,
          entreprise: true,
          documents: true,
        },
      },
      property: {
        include: {
          documents: true,
        },
      },
      bail: {
        include: {
          property: true,
          documents: true,
          parties: {
            include: {
              persons: true,
              entreprise: true,
            },
          },
        },
      },
      notaire: {
        select: { id: true, email: true, name: true },
      },
      assignedBy: {
        select: { id: true, email: true, name: true },
      },
      requests: {
        include: {
          createdBy: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!assignment) {
    throw new Error("Dossier introuvable");
  }

  // Vérifier que l'utilisateur a accès à ce dossier
  if (user.role === Role.NOTAIRE && assignment.notaireId !== user.id) {
    throw new Error("Non autorisé");
  }

  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  // Sérialiser les données pour convertir les Decimal en nombres
  const serializedAssignment = JSON.parse(JSON.stringify(assignment, (key, value) => serializeDecimal(value)));

  return serializedAssignment;
}

/**
 * Révoquer une assignation
 */
export async function revokeAssignment(data: unknown) {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const validated = revokeAssignmentSchema.parse(data);

  const assignment = await prisma.dossierNotaireAssignment.findUnique({
    where: { id: validated.assignmentId },
  });

  if (!assignment) {
    throw new Error("Assignation introuvable");
  }

  await prisma.dossierNotaireAssignment.delete({
    where: { id: validated.assignmentId },
  });

  revalidatePath("/interface/notaires");
  revalidatePath("/interface/baux");
  return { success: true };
}

/**
 * Récupérer tous les notaires
 */
export async function getAllNotaires() {
  await requireRole([Role.ADMINISTRATEUR]);

  const notaires = await prisma.user.findMany({
    where: {
      role: Role.NOTAIRE,
    },
    include: {
      _count: {
        select: {
          notaireAssignments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return notaires;
}

/**
 * Récupérer toutes les assignations (pour l'admin)
 */
export async function getAllAssignations() {
  await requireRole([Role.ADMINISTRATEUR]);

  const assignments = await prisma.dossierNotaireAssignment.findMany({
    include: {
      client: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
      property: true,
      bail: true,
      notaire: {
        select: { id: true, email: true, name: true },
      },
      assignedBy: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });

  // Sérialiser les données pour convertir les Decimal en nombres
  const serializedAssignments = JSON.parse(JSON.stringify(assignments, (key, value) => serializeDecimal(value)));

  return serializedAssignments;
}

/**
 * Créer une demande du notaire
 */
export async function createNotaireRequest(data: unknown) {
  const user = await requireAuth();
  
  // Vérifier que l'utilisateur est un notaire
  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  const validated = createNotaireRequestSchema.parse(data);

  // Vérifier que le dossier existe et que le notaire y a accès
  const dossier = await prisma.dossierNotaireAssignment.findUnique({
    where: { id: validated.dossierId },
  });

  if (!dossier) {
    throw new Error("Dossier introuvable");
  }

  // Si l'utilisateur est un notaire, vérifier qu'il a accès à ce dossier
  if (user.role === Role.NOTAIRE && dossier.notaireId !== user.id) {
    throw new Error("Non autorisé");
  }

  // Vérifier qu'au moins un destinataire est sélectionné
  if (!validated.targetProprietaire && !validated.targetLocataire) {
    throw new Error("Au moins un destinataire doit être sélectionné");
  }

  // Créer la demande
  const request = await prisma.notaireRequest.create({
    data: {
      dossierId: validated.dossierId,
      type: validated.type,
      title: validated.title,
      content: validated.content,
      targetProprietaire: validated.targetProprietaire,
      targetLocataire: validated.targetLocataire,
      createdById: user.id,
    },
    include: {
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  revalidatePath(`/notaire/dossiers/${validated.dossierId}`);
  return request;
}

/**
 * Récupérer les demandes d'un dossier
 */
export async function getNotaireRequestsByDossier(dossierId: string) {
  const user = await requireAuth();

  // Vérifier que le dossier existe et que le notaire y a accès
  const dossier = await prisma.dossierNotaireAssignment.findUnique({
    where: { id: dossierId },
  });

  if (!dossier) {
    throw new Error("Dossier introuvable");
  }

  // Vérifier que l'utilisateur a accès à ce dossier
  if (user.role === Role.NOTAIRE && dossier.notaireId !== user.id) {
    throw new Error("Non autorisé");
  }

  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  const requests = await prisma.notaireRequest.findMany({
    where: { dossierId },
    include: {
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return requests;
}


