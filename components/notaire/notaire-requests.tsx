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
import { Loader2, FileText, Plus, User, Building2, Download, Clock, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
  documents?: Array<{
    id: string;
    label: string | null;
    fileKey: string;
    mimeType: string | null;
    size: number | null;
    clientId: string | null;
    createdAt: Date;
    client?: {
      id: string;
      profilType: string;
      persons?: Array<{
        firstName: string | null;
        lastName: string | null;
      }>;
      entreprise?: {
        legalName: string;
        name: string;
      } | null;
    } | null;
    uploadedBy?: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
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

  // Fonction helper pour obtenir une URL signée pour le téléchargement
  const getSignedUrlForDownload = async (fileKey: string): Promise<string> => {
    try {
      const response = await fetch("/api/blob/get-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la génération de l'URL signée");
      }

      const { signedUrl } = await response.json();
      return signedUrl;
    } catch (error) {
      console.error("[NotaireRequests] Erreur lors de la génération de l'URL signée:", error);
      // Fallback : générer l'URL publique depuis la clé S3
      const { getS3PublicUrl } = await import("@/hooks/use-s3-public-url");
      return getS3PublicUrl(fileKey) || fileKey;
    }
  };

  // Fonction helper pour télécharger un document avec URL signée S3
  const handleDownloadDocument = async (
    fileKey: string,
    fileName: string
  ): Promise<void> => {
    if (typeof window === "undefined" || typeof window.document === "undefined") {
      return;
    }

    try {
      const downloadUrl = await getSignedUrlForDownload(fileKey);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("[NotaireRequests] Erreur lors du téléchargement:", error);
      toast.error("Erreur lors du téléchargement du document");
    }
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
            {requests.map((request) => {
              const statusConfig = {
                PENDING: {
                  icon: Clock,
                  label: "En attente",
                  badgeVariant: "default" as const,
                  badgeClass: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",
                  cardClass: "border-l-4 border-l-orange-500",
                },
                COMPLETED: {
                  icon: CheckCircle2,
                  label: "Complétée",
                  badgeVariant: "secondary" as const,
                  badgeClass: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
                  cardClass: "border-l-4 border-l-green-500",
                },
                CANCELLED: {
                  icon: XCircle,
                  label: "Annulée",
                  badgeVariant: "outline" as const,
                  badgeClass: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400",
                  cardClass: "border-l-4 border-l-gray-400 opacity-75",
                },
              };

              const status = statusConfig[request.status];
              const StatusIcon = status.icon;
              const hasDocuments = request.documents && request.documents.length > 0;

              return (
                <div
                  key={request.id}
                  className={`border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow ${status.cardClass}`}
                >
                  <div className="p-5 space-y-4">
                    {/* En-tête de la demande */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${
                            request.status === "PENDING" 
                              ? "bg-orange-50 dark:bg-orange-900/20" 
                              : request.status === "COMPLETED"
                              ? "bg-green-50 dark:bg-green-900/20"
                              : "bg-gray-50 dark:bg-gray-900/20"
                          }`}>
                            <FileText className={`h-5 w-5 ${
                              request.status === "PENDING"
                                ? "text-orange-600 dark:text-orange-400"
                                : request.status === "COMPLETED"
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-600 dark:text-gray-400"
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-3">{request.title}</h3>
                            
                            {/* Destinataire bien mis en avant */}
                            <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded bg-primary/10">
                                  {request.targetProprietaire && !request.targetLocataire ? (
                                    <Building2 className="h-4 w-4 text-primary" />
                                  ) : request.targetLocataire && !request.targetProprietaire ? (
                                    <User className="h-4 w-4 text-primary" />
                                  ) : (
                                    <User className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Destinataire</p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {getRequestPartyName(request)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <Badge className={`${status.badgeClass} flex items-center gap-1.5`}>
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                              {hasDocuments && (
                                <Badge variant="outline" className="flex items-center gap-1.5">
                                  <FileText className="h-3 w-3" />
                                  {request.documents!.length} document{request.documents!.length > 1 ? "s" : ""} reçu{request.documents!.length > 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contenu de la demande */}
                        <div className="bg-muted/30 rounded-md p-3 mb-3">
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {request.content}
                          </p>
                        </div>

                        {/* Documents fournis */}
                        {hasDocuments && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Separator className="flex-1" />
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Documents fournis
                              </span>
                              <Separator className="flex-1" />
                            </div>
                            <div className="space-y-2">
                              {request.documents!.map((doc) => {
                                const senderName = doc.client?.entreprise 
                                  ? (doc.client.entreprise.legalName || doc.client.entreprise.name)
                                  : doc.client?.persons?.[0]
                                    ? `${doc.client.persons[0].firstName || ""} ${doc.client.persons[0].lastName || ""}`.trim()
                                    : doc.uploadedBy?.name || doc.uploadedBy?.email || "Utilisateur";
                                const profilType = doc.client?.profilType === "PROPRIETAIRE" 
                                  ? "Propriétaire" 
                                  : doc.client?.profilType === "LOCATAIRE" 
                                    ? "Locataire" 
                                    : null;
                                
                                return (
                                  <div key={doc.id} className="flex items-start gap-3 p-3 bg-background border rounded-lg hover:bg-accent/50 transition-colors group">
                                    <div className="p-1.5 rounded bg-muted">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const signedUrl = await getSignedUrlForDownload(doc.fileKey);
                                          window.open(signedUrl, "_blank", "noopener,noreferrer");
                                        }}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block text-left w-full"
                                      >
                                        {doc.label || "Document"}
                                      </button>
                                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          <span>{senderName}</span>
                                        </div>
                                        {profilType && (
                                          <>
                                            <span>•</span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                              {profilType}
                                            </Badge>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadDocument(
                                        doc.fileKey,
                                        doc.label || "Document"
                                      )}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded"
                                      title="Télécharger le document"
                                    >
                                      <Download className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Informations de la demande */}
                    <Separator />
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Créée le {formatDateTime(request.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
