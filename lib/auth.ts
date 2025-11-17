import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

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
});


