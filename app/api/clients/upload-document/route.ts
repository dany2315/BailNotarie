import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { put } from "@vercel/blob";
import { DocumentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { 
  updateClientCompletionStatus as calculateAndUpdateClientStatus 
} from "@/lib/utils/completion-status";
import { revalidatePath } from "next/cache";

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();
    
    const file = formData.get("file") as File | null;
    const kind = formData.get("kind") as string | null;
    const personId = formData.get("personId") as string | null;
    const entrepriseId = formData.get("entrepriseId") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    if (!kind || !Object.values(DocumentKind).includes(kind as DocumentKind)) {
      return NextResponse.json(
        { error: "Type de document invalide" },
        { status: 400 }
      );
    }

    if (!personId && !entrepriseId) {
      return NextResponse.json(
        { error: "ID personne ou entreprise manquant" },
        { status: 400 }
      );
    }

    // Récupérer le clientId depuis Person ou Entreprise
    let clientId: string | null = null;
    
    if (personId) {
      const person = await prisma.person.findUnique({
        where: { id: personId },
        select: { clientId: true },
      });
      if (!person) {
        return NextResponse.json(
          { error: "Personne introuvable" },
          { status: 404 }
        );
      }
      clientId = person.clientId;
    } else if (entrepriseId) {
      const entreprise = await prisma.entreprise.findUnique({
        where: { id: entrepriseId },
        select: { clientId: true },
      });
      if (!entreprise) {
        return NextResponse.json(
          { error: "Entreprise introuvable" },
          { status: 404 }
        );
      }
      clientId = entreprise.clientId;
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "Client introuvable" },
        { status: 404 }
      );
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `documents/${clientId}/${timestamp}-${sanitizedName}`;

    // Uploader le fichier vers Vercel Blob
    const blob = await put(fileName, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Créer le document dans la base de données
    const document = await prisma.document.create({
      data: {
        kind: kind as DocumentKind,
        label: file.name,
        fileKey: blob.url,
        mimeType: file.type,
        size: file.size,
        ...(personId && { personId }),
        ...(entrepriseId && { entrepriseId }),
        uploadedById: user.id,
      },
    });

    // Mettre à jour le statut de complétion
    await calculateAndUpdateClientStatus(clientId);

    revalidatePath(`/interface/clients/${clientId}`);
    revalidatePath(`/interface/clients/${clientId}/edit`);

    return NextResponse.json({ 
      success: true, 
      document: {
        id: document.id,
        kind: document.kind,
        label: document.label,
        fileKey: document.fileKey,
        mimeType: document.mimeType,
      }
    });
  } catch (error: any) {
    console.error("Erreur lors de l'upload du document:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'upload du document" },
      { status: 500 }
    );
  }
}

