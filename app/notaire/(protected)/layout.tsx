import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { NotaireSidebar } from "@/components/notaire/notaire-sidebar";
import { defaultDossierId, notaireDossierList } from "@/lib/notaire/dossier-list";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Espace notaire : un seul menu latéral (tableau de bord, dossiers, et les menus à venir) et la page. */
export default async function NotaireProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.NOTAIRE) redirect("/notaire/login");
  const list = await notaireDossierList(user.id);

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row">
      <NotaireSidebar list={list} defaultId={defaultDossierId(list)} user={{ name: user.name ?? null, email: user.email }} />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/25">{children}</main>
    </div>
  );
}
