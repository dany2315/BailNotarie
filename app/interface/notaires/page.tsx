import { getAllNotaires } from "@/lib/actions/notaires";
import { NotairesTable } from "@/components/notaires/notaires-table";
import { NotaireCreateButton } from "@/components/notaires/notaire-create-button";
import { requireRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

export default async function NotairesPage() {
  await requireRole([Role.ADMINISTRATEUR]);
  
  const notaires = await getAllNotaires();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Notaires</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestion des comptes notaires et assignation de dossiers
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <NotaireCreateButton />
        </div>
      </div>

      <NotairesTable notaires={notaires} />
    </div>
  );
}

