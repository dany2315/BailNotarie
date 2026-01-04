import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// Helper pour sérialiser les Decimal
function serializeDecimal(value: any): any {
  if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
    return Number(value);
  }
  return value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const assignmentId = resolvedParams.id;

    // Vérifier d'abord que l'utilisateur a le droit d'accéder aux dossiers
    if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
      return NextResponse.json(
        { error: "Non autorisé - Seuls les notaires et administrateurs peuvent accéder aux dossiers" },
        { status: 403 }
      );
    }

    // Récupérer le dossier avec vérification de sécurité
    const assignment = await prisma.dossierNotaireAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        client: {
          include: {
            persons: {
              include: {
                documents: true,
              },
            },
            entreprise: {
              include: {
                documents: true,
              },
            },
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
                persons: {
                  orderBy: { isPrimary: 'desc' },
                  include: {
                    documents: true,
                  },
                },
                entreprise: {
                  include: {
                    documents: true,
                  },
                },
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
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Dossier introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que le notaire ne peut voir que SES dossiers assignés
    if (user.role === Role.NOTAIRE && assignment.notaireId !== user.id) {
      return NextResponse.json(
        { error: "Non autorisé - Vous n'avez pas accès à ce dossier" },
        { status: 403 }
      );
    }

    // Essayer de récupérer les requests si la table existe
    let requests: any[] = [];
    try {
      const requestsData = await prisma.notaireRequest.findMany({
        where: { dossierId: assignmentId },
        include: {
          createdBy: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      requests = requestsData;
    } catch (error) {
      // La table n'existe pas encore, on continue sans les requests
      console.warn("Table NotaireRequest n'existe pas encore:", error);
    }

    // Sérialiser les données pour convertir les Decimal en nombres
    const serializedAssignment = JSON.parse(JSON.stringify(assignment, (key, value) => serializeDecimal(value)));
    
    // Ajouter les requests si disponibles
    if (requests.length > 0) {
      serializedAssignment.requests = JSON.parse(JSON.stringify(requests, (key, value) => serializeDecimal(value)));
    } else {
      serializedAssignment.requests = [];
    }

    return NextResponse.json(serializedAssignment);
  } catch (error: any) {
    console.error("Erreur lors de la récupération du dossier:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération du dossier" },
      { status: 500 }
    );
  }
}

