import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientFullInfo } from "@/lib/actions/client-space";
import { ClientPersonsTabs } from "@/components/clients/client-persons-tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompletionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProprietaireInformationsPage() {
  const { client } = await requireProprietaireAuth();
  
  const clientData = await getClientFullInfo(client.id);

  if (!clientData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Client introuvable</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabels: Record<CompletionStatus, string> = {
    NOT_STARTED: "Non commencé",
    PARTIAL: "Partiel",
    PENDING_CHECK: "En attente de vérification",
    COMPLETED: "Complété",
  };

  const statusColors: Record<CompletionStatus, string> = {
    NOT_STARTED: "bg-gray-100 text-gray-800",
    PARTIAL: "bg-orange-100 text-orange-800",
    PENDING_CHECK: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes informations personnelles</h1>
          <p className="text-muted-foreground">Consultez et gérez vos informations</p>
        </div>
        <Badge className={statusColors[clientData.completionStatus]}>
          {statusLabels[clientData.completionStatus]}
        </Badge>
      </div>

      <ClientPersonsTabs
        clientType={clientData.type}
        persons={clientData.persons || []}
        entreprise={clientData.entreprise}
        clientDocuments={clientData.documents || []}
      />
    </div>
  );
}


