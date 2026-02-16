import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "./prisma";
import { resendSendEmail } from "./resend-rate-limited";
import MailNotaireOTP from "@/emails/mail-notaire-otp";
import MailClientOTP from "@/emails/mail-client-otp";
import { Role } from "@prisma/client";

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
        const normalizedEmail = email.toLowerCase().trim();
        
        // 1. Vérifier si un User existe déjà avec cet email
        let user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { 
            id: true, 
            email: true, 
            role: true, 
            name: true,
            clientId: true
          },
        });

        // Helper pour récupérer le nom d'un client
        async function getClientName(clientId: string | null): Promise<string | null> {
          if (!clientId) return null;
          
          const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
              persons: { where: { isPrimary: true }, take: 1 },
              entreprise: true,
            },
          });

          if (!client) return null;

          if (client.entreprise) {
            return client.entreprise.legalName || client.entreprise.name || null;
          }

          if (client.persons.length > 0) {
            const person = client.persons[0];
            return `${person.firstName || ""} ${person.lastName || ""}`.trim() || null;
          }

          return null;
        }

        // 2. Si l'utilisateur existe
        if (user) {
          // 2a. Si c'est un notaire → comportement actuel
          if (user.role === Role.NOTAIRE) {
            await resendSendEmail({
              from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
              to: normalizedEmail,
              subject: "Code de connexion - BailNotarie",
              react: MailNotaireOTP({
                userName: user.name || "Notaire",
                code: otp,
              }),
            });
            return; // Sortir de la fonction
          }
          
          // 2b. Si c'est un utilisateur client → envoyer OTP client
          if (user.role === Role.UTILISATEUR) {
            // Récupérer le nom du client pour l'email
            const clientName = await getClientName(user.clientId);
            
            await resendSendEmail({
              from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
              to: normalizedEmail,
              subject: "Code de connexion - BailNotarie",
              react: MailClientOTP({
                userName: clientName || user.name || "Client",
                code: otp,
              }),
            });
            return;
          }
          
          // 2c. Autres rôles → erreur
          throw new Error("Cet email n'est pas associé à un compte valide");
        }

        // 3. Si aucun User n'existe, chercher un Client correspondant
        // IMPORTANT: Cette fonction est appelée APRÈS que Better Auth ait vérifié l'existence du User
        // Avec disableSignUp: true, Better Auth rejette la demande si User n'existe pas
        // Donc cette partie ne devrait normalement jamais être atteinte pour les nouveaux Users
        // MAIS on la garde comme sécurité au cas où Better Auth changerait son comportement
        
        // 3a. Chercher dans Person.email
        const person = await prisma.person.findUnique({
          where: { email: normalizedEmail },
          include: { client: true },
        });

        if (person && person.client) {
          // Créer un User pour ce Client
          // NOTE: Ce code ne sera probablement jamais exécuté car Better Auth rejette avant
          // Mais on le garde pour la sécurité
          try {
            user = await prisma.user.create({
              data: {
                email: normalizedEmail,
                role: Role.UTILISATEUR,
                name: `${person.firstName || ""} ${person.lastName || ""}`.trim() || null,
                clientId: person.client.id,
                emailVerified: false,
              },
            });

            await resendSendEmail({
              from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
              to: normalizedEmail,
              subject: "Code de connexion - BailNotarie",
              react: MailClientOTP({
                userName: `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Client",
                code: otp,
              }),
            });
            return;
          } catch (error: any) {
            // Si le User existe déjà (race condition), récupérer le User existant
            if (error.code === "P2002") {
              user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
                select: { 
                  id: true, 
                  email: true, 
                  role: true, 
                  name: true,
                  clientId: true
                },
              });
              if (user && user.role === Role.UTILISATEUR) {
                const clientName = await getClientName(user.clientId);
                await resendSendEmail({
                  from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
                  to: normalizedEmail,
                  subject: "Code de connexion - BailNotarie",
                  react: MailClientOTP({
                    userName: clientName || user.name || "Client",
                    code: otp,
                  }),
                });
                return;
              }
            }
            throw error;
          }
        }

        // 3b. Chercher dans Entreprise.email
        const entreprise = await prisma.entreprise.findUnique({
          where: { email: normalizedEmail },
          include: { client: true },
        });

        if (entreprise && entreprise.client) {
          // Créer un User pour ce Client
          // NOTE: Ce code ne sera probablement jamais exécuté car Better Auth rejette avant
          // Mais on le garde pour la sécurité
          try {
            user = await prisma.user.create({
              data: {
                email: normalizedEmail,
                role: Role.UTILISATEUR,
                name: entreprise.legalName || entreprise.name || null,
                clientId: entreprise.client.id,
                emailVerified: false,
              },
            });

            await resendSendEmail({
              from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
              to: normalizedEmail,
              subject: "Code de connexion - BailNotarie",
              react: MailClientOTP({
                userName: entreprise.legalName || entreprise.name || "Client",
                code: otp,
              }),
            });
            return;
          } catch (error: any) {
            // Si le User existe déjà (race condition), récupérer le User existant
            if (error.code === "P2002") {
              user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
                select: { 
                  id: true, 
                  email: true, 
                  role: true, 
                  name: true,
                  clientId: true
                },
              });
              if (user && user.role === Role.UTILISATEUR) {
                const clientName = await getClientName(user.clientId);
                await resendSendEmail({
                  from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
                  to: normalizedEmail,
                  subject: "Code de connexion - BailNotarie",
                  react: MailClientOTP({
                    userName: clientName || user.name || "Client",
                    code: otp,
                  }),
                });
                return;
              }
            }
            throw error;
          }
        }

        // 4. Si aucun Client trouvé → erreur
        throw new Error("Aucun compte trouvé pour cet email");
      },
    }),
  ],
});


