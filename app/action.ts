"use server";

import { contactFormSchema } from "@/lib/zod/contact";
import { triggerContactConfirmationEmail, triggerContactNotificationEmail } from "@/lib/inngest/helpers";

export async function sendMail(formData: unknown) {
  // Validation avec Zod
  const validated = contactFormSchema.parse(formData);
  try {
    // Déclencher les envois d'emails via Inngest (asynchrone, ne bloque pas le rendu)
    await Promise.all([
      triggerContactConfirmationEmail({
        email: validated.email,
        firstName: validated.firstName,
        lastName: validated.lastName,
        phone: validated.phone,
        message: validated.message,
      }),
      triggerContactNotificationEmail({
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        phone: validated.phone,
        message: validated.message,
        dateDemande: new Date().toLocaleDateString("fr-FR"),
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Erreur lors du déclenchement des emails:", error);
    return { success: false, error: "Erreur lors de l'envoi de l'email." };
  }
}