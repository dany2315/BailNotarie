"use server";

import { Resend } from "resend";
import MailConfirmation from "@/emails/mail-Confirmation";
import MailNotificationEquipe from "@/emails/mail-Notification-Equipe";
import { contactFormSchema } from "@/lib/zod/contact";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail(formData: unknown) {
  // Validation avec Zod
  const validated = contactFormSchema.parse(formData);
  try {
    await resend.emails.send({
      from: "noreply@bailnotarie.fr",
      to: validated.email,
      subject: "Confirmation de votre demande de contact",
      react: MailConfirmation({
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        phone: validated.phone,
        message: validated.message,
      }),
    });

    await resend.emails.send({
      from: "noreply@bailnotarie.fr",
      to: ["david@bailnotarie.fr","shlomi@bailnotarie.fr"],
      subject: "Nouvelle demande de contact",
      react: MailNotificationEquipe({
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        phone: validated.phone,
        message: validated.message,
        dateDemande: new Date().toLocaleDateString("fr-FR"),
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur Resend:", error);
    return { success: false, error: "Erreur lors de l'envoi de l'email." };
  }
}