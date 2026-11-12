import { requireLocataireAuth } from "@/lib/auth-helpers";
import { getClientBails, getPendingNotaireRequests, getActiveIntakeLinksForClient } from "@/lib/actions/client-space";
import { ProfilType } from "@prisma/client";
import { TenantDashboard } from "@/components/client-v2/tenant";
import { getMyOpenComplementRequests } from "@/lib/actions/complement-requests";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LocataireDashboardPage() {
  const { user, client } = await requireLocataireAuth();

  const [baux, pendingRequests, activeIntakes, complementRequests] = await Promise.all([
    getClientBails(client.id, ProfilType.LOCATAIRE),
    getPendingNotaireRequests(client.id, ProfilType.LOCATAIRE),
    getActiveIntakeLinksForClient(client.id),
    getMyOpenComplementRequests(),
  ]);

  return (
    <TenantDashboard
      baux={baux}
      pendingRequests={pendingRequests}
      activeIntake={activeIntakes[0] ?? null}
      userName={user.name ?? null}
      complementRequests={complementRequests}
    />
  );
}

