import { getCurrentUser } from "@/lib/auth-helpers";
import { getClientProfilType } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Role, ProfilType } from "@prisma/client";
import { OwnerTabsBar, OwnerTabsDock, TENANT_TABS } from "@/components/client-v2/owner-tabs";
import { OwnerScrollArea } from "@/components/client-v2/owner-scroll-area";

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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Même navigation que chez le propriétaire : segmenté centré sous la
          barre du site au-dessus de 640 px, barre basse fixe en dessous. Les
          onglets vivent dans le conteneur de défilement pour s'accrocher sous
          la barre flottante et laisser la page passer derrière elle. */}
      <OwnerScrollArea hideDockOn={[]}>
        <OwnerTabsBar tabs={TENANT_TABS} />
        {children}
      </OwnerScrollArea>
      <OwnerTabsDock tabs={TENANT_TABS} />
    </div>
  );
}








