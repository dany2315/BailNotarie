import { LpNav } from "@/components/lp/lp-nav";
import { HideOnRoute } from "@/components/ui/hide-on-route";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ClientProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen-safe overflow-hidden">
      {/* `overlay` : la barre ne réserve aucune hauteur. Le conteneur de
          défilement commence donc tout en haut et son fond — le canevas de la
          page — passe derrière la pastille, qui le laisse deviner au lieu de
          se détacher sur une bande d'une autre couleur. */}
      <HideOnRoute paths={["/client/proprietaire/baux/new"]}>
        <LpNav overlay />
      </HideOnRoute>
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

