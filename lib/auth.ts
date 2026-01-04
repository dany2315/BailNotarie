import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "./prisma";
import { resend } from "./resend";
import MailNotaireOTP from "@/emails/mail-notaire-otp";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    
  }),
  emailAndPassword: {
    enabled: true,
    emailVerification: false,
  },
  trustedOrigins: [
    "http://localhost:3000",
    "https://staging.bailnotarie.fr",
    "https://www.bailnotarie.fr",
  ],
  plugins: [
    emailOTP({
      disableSignUp: true, // Empêcher l'inscription automatique
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      async sendVerificationOTP({ email, otp, type }) {
        // Vérifier que l'utilisateur existe et est un notaire
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: { id: true, email: true, role: true, name: true },
        });

        // Si l'utilisateur n'existe pas ou n'est pas un notaire, lancer une erreur
        if (!user) {
          throw new Error("Aucun compte trouvé pour cet email");
        }

        if (user.role !== "NOTAIRE") {
          throw new Error("Cet email n'est pas associé à un compte notaire");
        }

        // Envoyer l'email via Resend
        try {
          await resend.emails.send({
            from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
            to: email.toLowerCase().trim(),
            subject: "Code de connexion - BailNotarie",
            react: MailNotaireOTP({
              userName: user.name || "Notaire",
              code: otp,
            }),
          });
        } catch (emailError: any) {
          console.error("Erreur lors de l'envoi de l'email OTP:", emailError);
          throw new Error("Impossible d'envoyer l'email. Veuillez réessayer plus tard");
        }
      },
    }),
  ],
});


