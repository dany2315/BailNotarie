import { getCurrentUser } from "@/lib/auth-helpers";
import { getClientProfilType } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Role, ProfilType } from "@prisma/client";
import { LocataireHeader } from "@/components/client/locataire-header";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LocataireProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Rediriger vers la page de connexion si non authentifié
  if (!user) {
    redirect("/client/login");
  }

  // Rediriger si l'utilisateur n'est pas un client
  if (user.role !== Role.UTILISATEUR) {
    redirect("/client/login");
  }

  // Vérifier que c'est un locataire
  const profilType = await getClientProfilType(user.id);
  if (profilType !== ProfilType.LOCATAIRE) {
    // Rediriger vers l'interface appropriée ou login
    if (profilType === ProfilType.PROPRIETAIRE) {
      redirect("/client/proprietaire");
    }
    redirect("/client/login");
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
        <LocataireHeader 
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
        />
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
    </div>
  );
}








