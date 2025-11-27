import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { blogData } from '@/lib/blog-data';
import { z } from 'zod';
import { triggerBlogCommentNotificationEmail } from '@/lib/inngest/helpers';

// Schéma de validation pour les commentaires
const commentSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  content: z.string().min(10, 'Le commentaire doit contenir au moins 10 caractères'),
  articleId: z.string().min(1, 'ID de l\'article requis'),
  captchaToken: z.string().min(1, 'Token reCAPTCHA requis'),
});

export async function POST(request: NextRequest) {
  try {
    
    const body = await request.json();
    
    // Validation des données
    const validatedData = commentSchema.parse(body);
    
    // Vérification du reCAPTCHA
    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!recaptchaSecretKey) {
      return NextResponse.json(
        { error: 'Configuration reCAPTCHA manquante' },
        { status: 500 }
      );
    }

    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: recaptchaSecretKey,
        response: validatedData.captchaToken,
      }),
    });

    const recaptchaData = await recaptchaResponse.json();
    
    if (!recaptchaData.success) {
      return NextResponse.json(
        { error: 'Vérification reCAPTCHA échouée. Veuillez réessayer.' },
        { status: 400 }
      );
    }
    
    // Vérifier que l'article existe dans blog-data.ts
    const article = blogData.find(a => a.id === validatedData.articleId);
    
    if (!article) {
      return NextResponse.json(
        { error: 'Article non trouvé' },
        { status: 404 }
      );
    }
    
    
    // Créer le commentaire
    const comment = await prisma.comment.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        content: validatedData.content,
        articleId: validatedData.articleId,
        isApproved: true, // Approuver automatiquement si le captcha est valide
      },
    });
    
    
    // Envoyer un email de notification aux administrateurs
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://www.bailnotarie.fr';
      const articleUrl = `${baseUrl.replace(/\/$/, '')}/blog/${article.slug}`;
      const commentDate = new Date(comment.createdAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await triggerBlogCommentNotificationEmail({
        commenterName: validatedData.name,
        commenterEmail: validatedData.email,
        commentContent: validatedData.content,
        articleTitle: article.title,
        articleUrl: articleUrl,
        commentDate: commentDate,
      });
      
      console.log('✅ Email de notification déclenché');
    } catch (emailError) {
      // Ne pas bloquer la création du commentaire si l'email échoue
      console.error('⚠️ Erreur lors de l\'envoi de l\'email de notification:', emailError);
    }
    
    return NextResponse.json(
      { 
        message: 'Commentaire soumis avec succès',
        comment: {
          id: comment.id,
          name: comment.name,
          content: comment.content,
          createdAt: comment.createdAt,
          isApproved: comment.isApproved,
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
