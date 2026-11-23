import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { NotaireLoginClient } from "./notaire-login-client";

export const dynamic = "force-dynamic";

/**
 * Connexion notaire. Déjà connecté : redirection côté serveur vers son espace, avant d'afficher quoi que ce
 * soit (une seule requête, et la barre de chargement du navigateur tourne pendant ce temps).
 */
export default async function NotaireLoginPage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === Role.NOTAIRE) redirect("/notaire");
    if (user.role === Role.UTILISATEUR) {
      const client = await prisma.user.findUnique({ where: { id: user.id }, select: { client: { select: { profilType: true } } } });
      const profil = client?.client?.profilType;
      redirect(profil === "PROPRIETAIRE" ? "/client/proprietaire" : profil === "LOCATAIRE" ? "/client/locataire" : "/client");
    }
    // Équipe (administrateur, opérateur, relecteur)
    redirect("/interface");
  }
  return <NotaireLoginClient />;
}
