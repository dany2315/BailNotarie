import { requireProprietaireAuth } from "@/lib/auth-helpers";
import {
  getPendingNotaireRequests,
  getClientBails,
  getActiveIntakeLinksForClient,
} from "@/lib/actions/client-space";
import { getClientBailDrafts } from "@/lib/actions/leases";
import { ProfilType } from "@prisma/client";
import { OwnerDashboard } from "@/components/client-v2/owner-dashboard";
import { missingRentProofs } from "@/lib/rent-proofs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProprietaireDashboardPage() {
  const { user, client } = await requireProprietaireAuth();

  const [pendingRequests, baux, activeIntakes, bailDrafts, rentProofs] = await Promise.all([
    getPendingNotaireRequests(client.id, ProfilType.PROPRIETAIRE),
    getClientBails(client.id, ProfilType.PROPRIETAIRE),
    getActiveIntakeLinksForClient(client.id),
    getClientBailDrafts(client.id),
    missingRentProofs(client.id),
  ]);

  return (
    <OwnerDashboard
      baux={baux as any}
      pendingRequests={pendingRequests as any}
      activeIntakes={activeIntakes}
      bailDrafts={bailDrafts as any}
      rentProofs={rentProofs}
      userName={user.name ?? null}
    />
  );
}
