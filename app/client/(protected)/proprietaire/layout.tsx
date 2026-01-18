import { getCurrentUser } from "@/lib/auth-helpers";
import { getClientProfilType } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Role, ProfilType } from "@prisma/client";
import { ProprietaireSidebar } from "@/components/client/proprietaire-sidebar";
import { ProprietaireHeader } from "@/components/client/proprietaire-header";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProprietaireProtectedLayout({
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

  // Vérifier que c'est un propriétaire
  const profilType = await getClientProfilType(user.id);
  if (profilType !== ProfilType.PROPRIETAIRE) {
    // Rediriger vers l'interface appropriée ou login
    if (profilType === ProfilType.LOCATAIRE) {
      redirect("/client/locataire");
    }
    redirect("/client/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ProprietaireSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ProprietaireHeader 
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
        />
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}







