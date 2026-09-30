import { getCurrentUser } from "@/lib/auth-helpers";
import { getClientProfilType } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Role, ProfilType } from "@prisma/client";
import { OwnerTabsBar, OwnerTabsDock } from "@/components/client-v2/owner-tabs";
import { OwnerScrollArea } from "@/components/client-v2/owner-scroll-area";
import { HideOnRoute } from "@/components/ui/hide-on-route";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Les routes où la navigation de l'espace client s'efface (parcours de
    création d'un bail), comme avec l'ancien bandeau. */
const HIDE_NAV_ON = ["/client/proprietaire/baux/new"];

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Au-dessus de 640 px, un segmenté centré sous la barre du site ; en
          dessous, une barre basse fixe à portée du pouce — d'où la réserve de
          place en bas du conteneur de défilement. Les deux disparaissent sur
          le parcours de création d'un bail, comme l'ancien bandeau. */}
      <OwnerScrollArea hideDockOn={HIDE_NAV_ON}>
        <HideOnRoute paths={HIDE_NAV_ON}>
          <OwnerTabsBar />
        </HideOnRoute>
        {children}
      </OwnerScrollArea>
      <HideOnRoute paths={HIDE_NAV_ON}>
        <OwnerTabsDock />
      </HideOnRoute>
    </div>
  );
}








