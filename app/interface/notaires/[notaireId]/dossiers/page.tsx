import { getDossiersByNotaire } from "@/lib/actions/notaires";
import { requireRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { getAllNotaires } from "@/lib/actions/notaires";
import { DossiersNotaireTable } from "@/components/notaires/dossiers-notaire-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NotaireDossiersPage({
  params,
}: {
  params: Promise<{ notaireId: string }>;
}) {
  await requireRole([Role.ADMINISTRATEUR]);
  
  const resolvedParams = await params;
  const dossiers = await getDossiersByNotaire(resolvedParams.notaireId);
  const notaires = await getAllNotaires();
  const notaire = notaires.find((n) => n.id === resolvedParams.notaireId);

  if (!notaire) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/interface/notaires">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Dossiers de {notaire.name || notaire.email}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                {dossiers.length} dossier{dossiers.length !== 1 ? "s" : ""} assigné{dossiers.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <DossiersNotaireTable dossiers={dossiers} />
    </div>
  );
}





