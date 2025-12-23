import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { sendContactConfirmationEmail, sendContactNotificationEmail } from "@/lib/inngest/functions/contact";
import { sendNotificationEmail } from "@/lib/inngest/functions/notifications";
import { sendOwnerFormEmail, sendTenantFormEmail, sendRequestStatusEmail, sendIntakeConfirmationEmail, sendTenantSubmittedNotificationEmail } from "@/lib/inngest/functions/intake-forms";
import { sendLeadConversionEmail } from "@/lib/inngest/functions/leads";
import { sendBlogCommentNotificationEmail } from "@/lib/inngest/functions/blog-comments";
import { 
  calculateClientCompletionStatus, 
  calculatePropertyCompletionStatus,
  calculateCompletionStatuses 
} from "@/lib/inngest/functions/completion-status";
import { NextRequest } from "next/server";

const handler = serve({
  client: inngest,
  functions: [
    sendContactConfirmationEmail,
    sendContactNotificationEmail,
    sendNotificationEmail,
    sendOwnerFormEmail,
    sendTenantFormEmail,
    sendRequestStatusEmail,
    sendIntakeConfirmationEmail,
    sendTenantSubmittedNotificationEmail,
    sendLeadConversionEmail,
    sendBlogCommentNotificationEmail,
    calculateClientCompletionStatus,
    calculatePropertyCompletionStatus,
    calculateCompletionStatuses,
  ],
});

// Gérer les requêtes GET et POST normalement
export const GET = handler.GET;
export const POST = handler.POST;

// Gérer les requêtes PUT avec gestion du body vide
export async function PUT(request: NextRequest) {
  try {
    // Les requêtes PUT d'Inngest peuvent avoir un body vide (synchronisation)
    // On essaie de lire le body, mais on ne bloque pas si c'est vide
    let body: string;
    try {
      body = await request.text();
    } catch (error) {
      // Si la lecture du body échoue, on utilise un body vide
      body = '';
    }
    
    // Créer une nouvelle requête avec le body (vide ou non)
    // Le body doit être un JSON valide, même s'il est vide
    const bodyToUse = (!body || body.trim() === '') ? '{}' : body;
    
    const newRequest = new NextRequest(request.url, {
      method: 'PUT',
      headers: request.headers,
      body: bodyToUse,
    });
    
    return handler.PUT(newRequest, { params: Promise.resolve({}) });
  } catch (error) {
    // Si l'erreur persiste, on essaie avec un body vide minimal
    console.warn('[Inngest] Erreur lors du traitement de la requête PUT, tentative avec body vide:', error);
    try {
      const newRequest = new NextRequest(request.url, {
        method: 'PUT',
        headers: request.headers,
        body: '{}',
      });
      return handler.PUT(newRequest, { params: Promise.resolve({}) });
    } catch (fallbackError) {
      // Si même ça échoue, on retourne une erreur 400
      console.error('[Inngest] Erreur critique lors du traitement PUT:', fallbackError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors du traitement de la requête PUT' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

