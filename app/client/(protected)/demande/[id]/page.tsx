import { redirect } from "next/navigation";
import { ProfilType, Role } from "@prisma/client";
import { getClientProfilType, getCurrentUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * Lien de l'e-mail « pièces demandées » : mène à la page de la demande dans le bon espace
 * (propriétaire ou locataire), en passant par la connexion si besoin.
 */
export default async function ComplementRequestLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== Role.UTILISATEUR) {
    redirect(`/client/login?next=${encodeURIComponent(`/client/demande/${id}`)}`);
  }
  const profilType = await getClientProfilType(user.id);
  if (profilType === ProfilType.PROPRIETAIRE) redirect(`/client/proprietaire/demande/${id}`);
  if (profilType === ProfilType.LOCATAIRE) redirect(`/client/locataire/demande/${id}`);
  redirect("/client");
}
