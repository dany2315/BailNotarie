import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { NotaireSidebar } from "@/components/notaire/notaire-sidebar";
import { NotaireHeader } from "@/components/notaire/notaire-header";
import { getDossiersByNotaire } from "@/lib/actions/notaires";
import { DOSSIER_TAB_STATUSES } from "@/lib/utils/bails-labels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NotaireProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/notaire/login");
  }

  if (user.role !== Role.NOTAIRE) {
    redirect("/notaire/login");
  }

  // Fetch unique des dossiers — les stats sont calculées ici
  const dossiers = await getDossiersByNotaire(user.id);
  type DossierType = Awaited<ReturnType<typeof getDossiersByNotaire>>[number];
  const getBailStatus = (d: DossierType) => d.bail?.status || "READY_FOR_NOTARY";

  const stats = {
    aContacter: dossiers.filter((d: DossierType) => getBailStatus(d) === "READY_FOR_NOTARY").length,
    enTraitement: dossiers.filter((d: DossierType) => getBailStatus(d) === "CLIENT_CONTACTED").length,
    signes: dossiers.filter((d: DossierType) => getBailStatus(d) === "SIGNED").length,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <NotaireSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <NotaireHeader
          userName={user.name}
          userEmail={user.email}
          stats={stats}
        />
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}



