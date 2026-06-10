import { requireLocataireAuth } from "@/lib/auth-helpers";
import { getClientBails, getPendingNotaireRequests, getActiveIntakeLinksForClient } from "@/lib/actions/client-space";
import { ProfilType } from "@prisma/client";
import { DashboardLocataireClient } from "@/components/client/dashboard-locataire-client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LocataireDashboardPage() {
  const { user, client } = await requireLocataireAuth();

  const [baux, pendingRequests, activeIntakes] = await Promise.all([
    getClientBails(client.id, ProfilType.LOCATAIRE),
    getPendingNotaireRequests(client.id, ProfilType.LOCATAIRE),
    getActiveIntakeLinksForClient(client.id),
  ]);

  return (
    <DashboardLocataireClient
      baux={baux as any}
      pendingRequests={pendingRequests as any}
      activeIntake={activeIntakes[0] ?? null}
      userName={user.name ?? null}
    />
  );
}

