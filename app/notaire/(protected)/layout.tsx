import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { NotaireSidebar } from "@/components/notaire/notaire-sidebar";
import { NotaireHeader } from "@/components/notaire/notaire-header";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NotaireProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Rediriger vers la page de connexion si non authentifié
  if (!user) {
    redirect("/notaire/login");
  }

  // Rediriger si l'utilisateur n'est pas un notaire
  if (user.role !== Role.NOTAIRE) {
    redirect("/interface");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <NotaireSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <NotaireHeader 
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



