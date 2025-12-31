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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, FileText, MessageSquare, Plus, User, Building2 } from "lucide-react";
import { createNotaireRequest } from "@/lib/actions/notaires";
import { formatDateTime } from "@/lib/utils/formatters";

const requestSchema = z.object({
  type: z.enum(["DOCUMENT", "DATA"]),
  title: z.string().min(1, "Le titre est requis"),
  content: z.string().min(1, "Le contenu est requis"),
  targetProprietaire: z.boolean(),
  targetLocataire: z.boolean(),
}).refine(
  (data) => data.targetProprietaire || data.targetLocataire,
  {
    message: "Au moins un destinataire doit être sélectionné",
    path: ["targetProprietaire"],
  }
);

type RequestFormData = z.infer<typeof requestSchema>;

interface NotaireRequest {
  id: string;
  type: "DOCUMENT" | "DATA";
  title: string;
  content: string;
  targetProprietaire: boolean;
  targetLocataire: boolean;
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
      type: "DOCUMENT",
      title: "",
      content: "",
      targetProprietaire: false,
      targetLocataire: false,
    },
  });

  const targetProprietaire = watch("targetProprietaire");
  const targetLocataire = watch("targetLocataire");

  // Séparer les parties par type
  const proprietaires = bailParties.filter((p) => p.profilType === "PROPRIETAIRE");
  const locataires = bailParties.filter((p) => p.profilType === "LOCATAIRE");

  const onSubmit = async (data: RequestFormData) => {
    setIsLoading(true);
    try {
      const newRequest = await createNotaireRequest({
        dossierId,
        ...data,
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Demandes aux parties</CardTitle>
            <CardDescription>
              Demander des pièces ou des données au propriétaire et/ou locataire
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
                <DialogTitle>Créer une demande</DialogTitle>
                <DialogDescription>
                  Demander des pièces ou des données aux parties du dossier
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type de demande *</Label>
                  <Select
                    defaultValue="DOCUMENT"
                    onValueChange={(value) => setValue("type", value as "DOCUMENT" | "DATA")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOCUMENT">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Demande de pièce/document
                        </div>
                      </SelectItem>
                      <SelectItem value="DATA">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Demande de données/informations
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-destructive">{errors.type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Titre de la demande *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Demande de pièce d'identité"
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

                <div className="space-y-3">
                  <Label>Destinataires *</Label>
                  
                  {proprietaires.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="targetProprietaire"
                          checked={targetProprietaire}
                          onCheckedChange={(checked) =>
                            setValue("targetProprietaire", checked === true)
                          }
                        />
                        <Label
                          htmlFor="targetProprietaire"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Propriétaire{proprietaires.length > 1 ? "s" : ""}
                          </div>
                        </Label>
                      </div>
                      {targetProprietaire && (
                        <div className="ml-6 space-y-1">
                          {proprietaires.map((prop) => (
                            <div key={prop.id} className="text-sm text-muted-foreground">
                              • {getPartyName(prop)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {locataires.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="targetLocataire"
                          checked={targetLocataire}
                          onCheckedChange={(checked) =>
                            setValue("targetLocataire", checked === true)
                          }
                        />
                        <Label
                          htmlFor="targetLocataire"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Locataire{locataires.length > 1 ? "s" : ""}
                          </div>
                        </Label>
                      </div>
                      {targetLocataire && (
                        <div className="ml-6 space-y-1">
                          {locataires.map((loc) => (
                            <div key={loc.id} className="text-sm text-muted-foreground">
                              • {getPartyName(loc)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {proprietaires.length === 0 && locataires.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aucune partie disponible dans ce dossier
                    </p>
                  )}

                  {errors.targetProprietaire && (
                    <p className="text-sm text-destructive">
                      {errors.targetProprietaire.message}
                    </p>
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
                  <Button type="submit" disabled={isLoading}>
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
                      {request.type === "DOCUMENT" ? (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h3 className="font-semibold">{request.title}</h3>
                      <Badge
                        variant={
                          request.type === "DOCUMENT" ? "default" : "secondary"
                        }
                      >
                        {request.type === "DOCUMENT" ? "Document" : "Données"}
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
                    <span>Destinataires:</span>
                    {request.targetProprietaire && (
                      <Badge variant="outline" className="text-xs">
                        <Building2 className="h-3 w-3 mr-1" />
                        Propriétaire
                      </Badge>
                    )}
                    {request.targetLocataire && (
                      <Badge variant="outline" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        Locataire
                      </Badge>
                    )}
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



