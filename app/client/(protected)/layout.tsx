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
      <HideOnRoute paths={["/client/proprietaire/baux/new"]}>
        <LpNav />
      </HideOnRoute>
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

