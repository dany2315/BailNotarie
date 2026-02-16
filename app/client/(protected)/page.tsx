import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getClientProfilType } from "@/lib/auth-helpers";
import { ProfilType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ClientRedirectPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/client/login");
  }

  const profilType = await getClientProfilType(user.id);

  if (!profilType) {
    // Si pas de profilType, rediriger vers login
    redirect("/client/login");
  }

  // Rediriger selon le profilType
  if (profilType === ProfilType.PROPRIETAIRE) {
    redirect("/client/proprietaire");
  } else if (profilType === ProfilType.LOCATAIRE) {
    redirect("/client/locataire");
  }

  // Fallback : rediriger vers login
  redirect("/client/login");
}








