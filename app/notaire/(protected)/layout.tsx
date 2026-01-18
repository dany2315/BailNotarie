import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { NotaireSidebar } from "@/components/notaire/notaire-sidebar";
import { NotaireHeader } from "@/components/notaire/notaire-header";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function NotaireHeaderSkeleton() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-48 bg-muted animate-pulse rounded mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </header>
  );
}

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
    redirect("/notaire/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <NotaireSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Suspense fallback={<NotaireHeaderSkeleton />}>
          <NotaireHeader 
            userId={user.id}
            userName={user.name}
            userEmail={user.email}
          />
        </Suspense>
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}



