import { getCurrentUser } from "@/lib/auth-helpers";
import { getDossiersByNotaire } from "@/lib/actions/notaires";
import { getNotaireComplementRequests } from "@/lib/actions/complement-requests";
import { loadNotaireDossier } from "@/lib/notaire/dossier-view";
import { DOSSIER_TAB_STATUSES } from "@/lib/utils/bails-labels";
import { NotaireDossiersShell, type DossierListItem } from "@/components/notaire/notaire-dossiers-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const personName = (p: { firstName?: string | null; lastName?: string | null } | undefined) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

function partyName(party: any): string {
  if (!party) return "";
  if (party.entreprise) return party.entreprise.legalName || party.entreprise.name || "Société";
  return (party.persons ?? []).map(personName).filter(Boolean).join(" et ");
}

export default async function NotaireDossiersPage({ searchParams }: { searchParams: Promise<{ dossierId?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { dossierId } = await searchParams;

  const dossiers = await getDossiersByNotaire(user.id);
  const list: DossierListItem[] = dossiers.map((d: any) => {
    const parties: any[] = d.bail?.parties ?? [];
    return {
      id: d.id,
      owner: partyName(parties.find((p) => p.profilType === "PROPRIETAIRE")) || partyName(d.client) || "Propriétaire",
      tenant: partyName(parties.find((p) => p.profilType === "LOCATAIRE")) || null,
      address: d.bail?.property?.fullAddress || d.property?.fullAddress || "",
      status: d.bail?.status || "READY_FOR_NOTARY",
      bailType: d.bail?.bailType ?? null,
      assignedAt: d.assignedAt,
    };
  });

  // Dossier ouvert : celui de l'adresse, sinon le premier en cours.
  const selectedId =
    dossierId && list.some((d) => d.id === dossierId)
      ? dossierId
      : (list.find((d) => DOSSIER_TAB_STATUSES.en_cours.includes(d.status)) ?? list[0])?.id ?? null;
  const view = selectedId ? await loadNotaireDossier(selectedId) : null;
  const requests = view?.bailId ? await getNotaireComplementRequests(view.bailId) : [];

  return <NotaireDossiersShell list={list} selectedId={selectedId} explicit={!!dossierId} view={view} requests={requests} />;
}
