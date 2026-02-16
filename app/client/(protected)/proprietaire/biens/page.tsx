import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientProperties } from "@/lib/actions/client-space";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Home, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { CompletionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProprietaireBiensPage() {
  const { client } = await requireProprietaireAuth();
  
  const biens = await getClientProperties(client.id);

  const completionStatusLabels: Record<CompletionStatus, string> = {
    NOT_STARTED: "Non commencé",
    PARTIAL: "Partiel",
    PENDING_CHECK: "En vérification",
    COMPLETED: "Complété",
  };

  const completionStatusVariants: Record<CompletionStatus, "default" | "secondary" | "outline" | "destructive"> = {
    NOT_STARTED: "secondary",
    PARTIAL: "outline",
    PENDING_CHECK: "default",
    COMPLETED: "default",
  };

  const completionStatusColors: Record<CompletionStatus, string> = {
    NOT_STARTED: "bg-gray-100 text-gray-800 border-gray-200",
    PARTIAL: "bg-orange-100 text-orange-800 border-orange-200",
    PENDING_CHECK: "bg-blue-100 text-blue-800 border-blue-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mes biens</h1>
        <p className="text-muted-foreground">Gérez tous vos biens immobiliers</p>
      </div>

      {/* Liste des biens avec carte d'ajout intégrée */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Carte d'ajout de bien */}
        <Link href="/client/proprietaire/biens/new">
          <Card className="h-full border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group p-0">
            <CardContent className="flex flex-col items-center justify-center py-4 ">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="rounded-full bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Ajouter un bien</h3>
                  <p className="text-sm text-muted-foreground">
                    Créez un nouveau bien immobilier
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Liste des biens existants */}
        {biens.map((bien) => (
          <Link key={bien.id} href={`/client/proprietaire/biens/${bien.id}`}>
            <Card className="h-full hover:shadow-md transition-all cursor-pointer p-0">
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Home className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {bien.label || bien.fullAddress}
                        </h3>
                      </div>
                    </div>
                    <Badge 
                      variant={completionStatusVariants[bien.completionStatus]} 
                      className={`shrink-0 ${completionStatusColors[bien.completionStatus]}`}
                    >
                      {completionStatusLabels[bien.completionStatus]}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {bien.fullAddress}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {bien.surfaceM2 && (
                        <span>{bien.surfaceM2.toString()} m²</span>
                      )}
                      <span>{bien.bails.length} bail{bien.bails.length > 1 ? "x" : ""}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-2 border-t flex flex-row justify-between">
                    <span className="text-xs text-muted-foreground pt-2">
                      Ajouté le {formatDateTime(bien.createdAt)}
                    </span>
                    <span className="flex flex-row items-center gap-1 bg-primary/10 cursor-pointer rounded-full hover:text-primary p-1.5 hover:scale-95 transition-colors">
                    <ArrowRight className="h-4 w-4 text-primary hover:scale-95 transition-colors " />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Message si aucun bien */}
      {biens.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun bien</h3>
            <p className="text-muted-foreground">
              Commencez par ajouter votre premier bien immobilier
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}








