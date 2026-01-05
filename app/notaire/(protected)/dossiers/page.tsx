import { getCurrentUser } from "@/lib/auth-helpers";
import { getDossiersByNotaire } from "@/lib/actions/notaires";
import { DossiersSidebar } from "@/components/notaire/dossiers-sidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NotaireDossiersPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  const dossiers = await getDossiersByNotaire(user.id);

  return (
    <div className="h-full">
      <DossiersSidebar dossiers={dossiers} />
    </div>
  );
}

