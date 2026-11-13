import Link from "next/link";
import { FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getNotaireComplementRequests } from "@/lib/actions/complement-requests";
import { loadNotaireDossier } from "@/lib/notaire/dossier-view";
import { defaultDossierId, notaireDossierList } from "@/lib/notaire/dossier-list";
import { NotaireDossierPanel } from "@/components/notaire/notaire-dossier-panel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Le dossier ouvert (la liste des dossiers est dans le menu latéral). */
export default async function NotaireDossiersPage({ searchParams }: { searchParams: Promise<{ dossierId?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { dossierId } = await searchParams;
  const list = await notaireDossierList(user.id);
  const selectedId = dossierId && list.some((d) => d.id === dossierId) ? dossierId : defaultDossierId(list);
  const view = selectedId ? await loadNotaireDossier(selectedId) : null;
  const requests = view?.bailId ? await getNotaireComplementRequests(view.bailId) : [];

  if (!view) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileText className="size-5" />
          </span>
          <p className="mt-4 text-[15px] font-semibold">{list.length === 0 ? "Aucun dossier pour le moment" : "Ce dossier n'est pas accessible"}</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {list.length === 0 ? "Les dossiers qui vous sont confiés apparaîtront ici." : "Choisissez un dossier dans le menu."}
          </p>
          <Link href="/notaire" className="mt-4 inline-block text-[13.5px] font-medium text-primary hover:underline">
            Tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  return <NotaireDossierPanel key={view.assignmentId} view={view} requests={requests} />;
}
