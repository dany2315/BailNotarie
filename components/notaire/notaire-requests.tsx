"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, Plus, User, Building2 } from "lucide-react";
import { createNotaireRequest } from "@/lib/actions/notaires";
import { formatDateTime } from "@/lib/utils/formatters";

const requestSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  content: z.string().min(1, "Le contenu est requis"),
  targetPartyId: z.string().min(1, "Un destinataire doit être sélectionné"),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface NotaireRequest {
  id: string;
  title: string;
  content: string;
  targetProprietaire: boolean;
  targetLocataire: boolean;
  targetPartyIds?: string[];
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  createdAt: Date;
  createdBy: {
    id: string;
    email: string;
    name?: string | null;
  };
}

interface NotaireRequestsProps {
  dossierId: string;
  initialRequests?: NotaireRequest[];
  bailParties?: Array<{
    id: string;
    profilType: string;
    persons?: Array<{
      firstName?: string | null;
      lastName?: string | null;
    }>;
    entreprise?: {
      legalName: string;
      name: string;
    } | null;
  }>;
}

export function NotaireRequests({
  dossierId,
  initialRequests = [],
  bailParties = [],
}: NotaireRequestsProps) {
  const [requests, setRequests] = useState<NotaireRequest[]>(initialRequests);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      content: "",
      targetPartyId: "",
    },
  });

  const selectedPartyId = watch("targetPartyId");

  const onSubmit = async (data: RequestFormData) => {
    setIsLoading(true);
    try {
      // Trouver la partie sélectionnée pour déterminer le type
      const selectedParty = bailParties.find(p => p.id === data.targetPartyId);
      const isProprietaire = selectedParty?.profilType === "PROPRIETAIRE";
      const isLocataire = selectedParty?.profilType === "LOCATAIRE";

      const newRequest = await createNotaireRequest({
        dossierId,
        title: data.title,
        content: data.content,
        targetProprietaire: isProprietaire,
        targetLocataire: isLocataire,
        targetPartyIds: [data.targetPartyId],
      });
      
      setRequests([newRequest, ...requests]);
      toast.success("Demande créée avec succès");
      reset();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error("Erreur lors de la création de la demande", {
        description: error.message || "Une erreur est survenue",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPartyName = (party: typeof bailParties[0]) => {
    if (party.entreprise) {
      return party.entreprise.legalName || party.entreprise.name;
    }
    const primaryPerson = party.persons?.find((p) => p) || party.persons?.[0];
    if (primaryPerson) {
      return `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || "Client";
    }
    return "Client";
  };

  const getPartyDisplayName = (party: typeof bailParties[0]) => {
    const name = getPartyName(party);
    const type = party.profilType === "PROPRIETAIRE" ? "Propriétaire" : "Locataire";
    return `${name} (${type})`;
  };

  // Récupérer le nom de la partie sélectionnée pour une demande
  const getRequestPartyName = (request: NotaireRequest) => {
    // Si on a les targetPartyIds, récupérer le nom des parties
    if (request.targetPartyIds && request.targetPartyIds.length > 0) {
      const partyNames = request.targetPartyIds
        .map(id => {
          const party = bailParties.find(p => p.id === id);
          return party ? getPartyDisplayName(party) : null;
        })
        .filter(Boolean);
      if (partyNames.length > 0) {
        return partyNames.join(", ");
      }
    }
    
    // Fallback aux anciens champs
    const types = [];
    if (request.targetProprietaire) types.push("Propriétaire");
    if (request.targetLocataire) types.push("Locataire");
    return types.join(", ") || "Non spécifié";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Demandes aux parties</CardTitle>
            <CardDescription>
              Demander des pièces ou des données au propriétaire ou locataire
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle demande
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer une demande de document</DialogTitle>
                <DialogDescription>
                  Demander un document à une partie du dossier
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="targetPartyId">Destinataire *</Label>
                  <Select
                    value={selectedPartyId}
                    onValueChange={(value) => setValue("targetPartyId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une partie" />
                    </SelectTrigger>
                    <SelectContent>
                      {bailParties.map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          <div className="flex items-center gap-2">
                            {party.profilType === "PROPRIETAIRE" ? (
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>{getPartyName(party)}</span>
                            <Badge variant="outline" className="text-xs ml-1">
                              {party.profilType === "PROPRIETAIRE" ? "Propriétaire" : "Locataire"}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.targetPartyId && (
                    <p className="text-sm text-destructive">{errors.targetPartyId.message}</p>
                  )}
                  {bailParties.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aucune partie disponible dans ce dossier
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Nom de la piéce *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: piéce d'identiter"
                    {...register("title")}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Contenu de la demande *</Label>
                  <Textarea
                    id="content"
                    placeholder="Décrivez en détail ce que vous demandez..."
                    rows={6}
                    {...register("content")}
                  />
                  {errors.content && (
                    <p className="text-sm text-destructive">{errors.content.message}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      reset();
                    }}
                    disabled={isLoading}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isLoading || bailParties.length === 0}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer la demande
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucune demande pour le moment. Créez-en une pour commencer.
          </p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{request.title}</h3>
                      <Badge variant="default">
                        Document
                      </Badge>
                      <Badge
                        variant={
                          request.status === "PENDING"
                            ? "default"
                            : request.status === "COMPLETED"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {request.status === "PENDING"
                          ? "En attente"
                          : request.status === "COMPLETED"
                          ? "Complétée"
                          : "Annulée"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {request.content}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>Destinataire:</span>
                    <Badge variant="outline" className="text-xs">
                      {request.targetProprietaire && <Building2 className="h-3 w-3 mr-1" />}
                      {request.targetLocataire && <User className="h-3 w-3 mr-1" />}
                      {getRequestPartyName(request)}
                    </Badge>
                  </div>
                  <span>•</span>
                  <span>Créée le {formatDateTime(request.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
