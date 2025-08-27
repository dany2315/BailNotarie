"use server";

import { Resend } from "resend";
import MailConfirmation from "@/emails/mail-Confirmation";

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

    return { success: true };
  } catch (error) {
    console.error("Erreur Resend:", error);
    return { success: false, error: "Erreur lors de l'envoi de l'email." };
  }
}