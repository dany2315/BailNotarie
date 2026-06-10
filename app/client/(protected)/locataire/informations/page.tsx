import { requireLocataireAuth } from "@/lib/auth-helpers";
import { getClientFullInfo } from "@/lib/actions/client-space";
import { ClientInfoDisplay } from "@/components/client/client-info-display";
import { Card, CardContent } from "@/components/ui/card";
import { UserRound, Building2, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LocataireInformationsPage() {
  const { client } = await requireLocataireAuth();
  const clientData = await getClientFullInfo(client.id);

  if (!clientData) {
    return (
      <div className="p-4 sm:p-6 md:max-w-2xl md:mx-auto">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Client introuvable</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEntreprise = clientData.type === "PERSONNE_MORALE";
  const primaryPerson = clientData.persons?.[0];
  const displayName = isEntreprise
    ? clientData.entreprise?.legalName || clientData.entreprise?.name || "Entreprise"
    : primaryPerson
    ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || primaryPerson.email || "Locataire"
    : "Locataire";

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="p-4 sm:p-6 space-y-8 md:max-w-2xl md:mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 bg-primary/10 text-primary">
          {isEntreprise ? <Building2 className="h-7 w-7" /> : (initials || <UserRound className="h-7 w-7" />)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{displayName}</h1>
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 shrink-0">
              <KeyRound className="h-3 w-3" />
              Locataire
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Informations personnelles</p>
        </div>
      </div>

      {/* Contenu */}
      <ClientInfoDisplay
        clientType={clientData.type}
        persons={clientData.persons || []}
        entreprise={clientData.entreprise}
        clientDocuments={clientData.documents || []}
      />
    </div>
  );
}
