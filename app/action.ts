"use server";

import { Resend } from "resend";
import MailConfirmation from "@/emails/mail-Confirmation";
import MailNotificationEquipe from "@/emails/mail-Notification-Equipe";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail(formData: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}) {
  try {
    await resend.emails.send({
      from: "noreply@bailnotarie.fr",
      to: formData.email,
      subject: "Confirmation de votre demande de contact",
      react: MailConfirmation({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
      }),
    });

    await resend.emails.send({
      from: "noreply@bailnotarie.fr",
      to: "davidserfaty2315@gmail.com",
      subject: "Nouvelle demande de contact",
      react: MailNotificationEquipe({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        dateDemande: new Date().toLocaleDateString("fr-FR"),
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur Resend:", error);
    return { success: false, error: "Erreur lors de l'envoi de l'email." };
  }
}