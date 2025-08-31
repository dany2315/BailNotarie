import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma de validation pour les commentaires
const commentSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  content: z.string().min(10, 'Le commentaire doit contenir au moins 10 caractères'),
  articleId: z.string().min(1, 'ID de l\'article requis'),
});

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Début de la création d\'un commentaire...');
    
    const body = await request.json();
    console.log('📋 Données reçues:', { ...body, email: '[MASKED]' });
    
    // Validation des données
    const validatedData = commentSchema.parse(body);
    console.log('✅ Données validées avec succès');
    
    // Vérifier que l'article existe
    const article = await prisma.article.findUnique({
      where: { id: validatedData.articleId }
    });
    
    if (!article) {
      console.log('❌ Article non trouvé:', validatedData.articleId);
      return NextResponse.json(
        { error: 'Article non trouvé' },
        { status: 404 }
      );
    }
    
    console.log('✅ Article trouvé:', article.title);
    
    // Créer le commentaire
    const comment = await prisma.comment.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        content: validatedData.content,
        articleId: validatedData.articleId,
        isApproved: false, // Par défaut, les commentaires ne sont pas approuvés
      },
    });
    
    console.log('✅ Commentaire créé avec succès:', comment.id);
    
    return NextResponse.json(
      { 
        message: 'Commentaire soumis avec succès',
        comment: {
          id: comment.id,
          name: comment.name,
          content: comment.content,
          createdAt: comment.createdAt,
        }
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du commentaire:', error);
    
    if (error instanceof z.ZodError) {
      console.log('🔍 Erreurs de validation:', error.issues);
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    
    if (!articleId) {
      return NextResponse.json(
        { error: 'ID de l\'article requis' },
        { status: 400 }
      );
    }
    
    // Récupérer tous les commentaires pour un article
    const comments = await prisma.comment.findMany({
      where: {
        articleId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json({ comments });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des commentaires:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
