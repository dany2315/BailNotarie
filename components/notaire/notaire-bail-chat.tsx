"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, FileText, MessageSquare, User, Scale, Plus, AlertCircle, Loader2, Download } from "lucide-react";
import { getBailMessages, sendBailMessage, getNotaireRequestsByBail } from "@/lib/actions/bail-messages";
import { createNotaireRequest } from "@/lib/actions/notaires";
import { formatDateTime } from "@/lib/utils/formatters";
import { Role, BailMessageType, NotaireRequestStatus } from "@prisma/client";
import { useSession } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const messageSchema = z.object({
  content: z.string().min(1, "Le message ne peut pas être vide"),
});

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

type MessageFormData = z.infer<typeof messageSchema>;
type RequestFormData = z.infer<typeof requestSchema>;

interface NotaireBailChatProps {
  bailId: string;
  dossierId: string;
  bailParties: Array<{
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

export function NotaireBailChat({ bailId, dossierId, bailParties }: NotaireBailChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    register: registerMessage,
    handleSubmit: handleSubmitMessage,
    reset: resetMessage,
    formState: { errors: messageErrors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
  });

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    reset: resetRequest,
    watch,
    setValue,
    formState: { errors: requestErrors },
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

  const loadMessages = async () => {
    try {
      setLoading(true);
      const [messagesData, requestsData] = await Promise.all([
        getBailMessages(bailId),
        getNotaireRequestsByBail(bailId),
      ]);
      setMessages(messagesData);
      setRequests(requestsData);
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de charger les messages",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // Recharger les messages toutes les 30 secondes
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [bailId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, requests]);

  // Charger le rôle de l'utilisateur depuis l'API
  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/user/role")
        .then((res) => res.json())
        .then((data) => {
          if (data.role) {
            setUserRole(data.role as Role);
          }
        })
        .catch((error) => {
          console.error("Erreur lors de la récupération du rôle:", error);
        });
    }
  }, [session?.user?.id]);

  const onSubmitMessage = async (data: MessageFormData) => {
    try {
      setSending(true);
      const newMessage = await sendBailMessage(bailId, data.content);
      setMessages([...messages, newMessage]);
      resetMessage();
      toast.success("Message envoyé");
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible d'envoyer le message",
      });
    } finally {
      setSending(false);
    }
  };

  const onSubmitRequest = async (data: RequestFormData) => {
    try {
      setSending(true);
      const newRequest = await createNotaireRequest({
        dossierId,
        ...data,
      });
      
      // Créer un message dans le chat pour cette demande
      await sendBailMessage(bailId, `Nouvelle demande : ${data.title}`);
      
      setRequests([newRequest, ...requests]);
      resetRequest();
      setIsRequestDialogOpen(false);
      toast.success("Demande créée avec succès");
      loadMessages();
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de créer la demande",
      });
    } finally {
      setSending(false);
    }
  };

  const currentUserId = session?.user?.id;
  const isNotaire = userRole === Role.NOTAIRE;

  const proprietaires = bailParties.filter((p) => p.profilType === "PROPRIETAIRE");
  const locataires = bailParties.filter((p) => p.profilType === "LOCATAIRE");

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

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chargement des messages...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zone de messages */}
      <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
        {messages.length === 0 && requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun message pour le moment. Commencez la conversation !
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwnMessage = message.senderId === currentUserId;
              const isNotaireMessage = message.sender.role === Role.NOTAIRE;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : isNotaireMessage
                        ? "bg-blue-100 text-blue-900"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isNotaireMessage ? (
                        <Scale className="h-3 w-3" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                      <span className="text-xs font-medium">
                        {message.sender.name || message.sender.email}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              );
            })}

            {/* Afficher les demandes comme messages spéciaux */}
            {requests.map((request) => (
              <div key={request.id} className="flex justify-start">
                <Card className={`max-w-[80%] ${
                  request.status === NotaireRequestStatus.COMPLETED 
                    ? "border-green-200 bg-green-50" 
                    : request.status === NotaireRequestStatus.CANCELLED
                      ? "border-gray-200 bg-gray-50"
                      : "border-orange-200 bg-orange-50"
                }`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className={`h-4 w-4 ${
                        request.status === NotaireRequestStatus.COMPLETED 
                          ? "text-green-600" 
                          : request.status === NotaireRequestStatus.CANCELLED
                            ? "text-gray-600"
                            : "text-orange-600"
                      }`} />
                      <Badge variant="outline" className={`${
                        request.status === NotaireRequestStatus.COMPLETED 
                          ? "border-green-300 text-green-700" 
                          : request.status === NotaireRequestStatus.CANCELLED
                            ? "border-gray-300 text-gray-700"
                            : "border-orange-300 text-orange-700"
                      }`}>
                        Demande de document
                      </Badge>
                      {request.status === NotaireRequestStatus.PENDING && (
                        <Badge className="bg-orange-600 text-white">En attente</Badge>
                      )}
                      {request.status === NotaireRequestStatus.COMPLETED && (
                        <Badge className="bg-green-600 text-white">Complétée</Badge>
                      )}
                      {request.status === NotaireRequestStatus.CANCELLED && (
                        <Badge className="bg-gray-600 text-white">Annulée</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{request.title}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {request.content}
                    </p>
                    {/* Afficher les documents fournis */}
                    {request.documents && request.documents.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Documents fournis :</p>
                        {request.documents.map((doc: any) => (
                          <div key={doc.id} className="flex items-center gap-2 text-xs bg-background p-2 rounded">
                            <FileText className="h-3 w-3 shrink-0" />
                            <a
                              href={doc.fileKey}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:no-underline flex-1 truncate text-blue-600 hover:text-blue-800"
                            >
                              {doc.label || "Document"}
                            </a>
                            <Download className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>
                        De : {request.createdBy.name || request.createdBy.email}
                      </p>
                      <p>{formatDateTime(request.createdAt)}</p>
                      <div className="flex gap-2 mt-1">
                        {request.targetProprietaire && (
                          <Badge variant="outline" className="text-xs">
                            Propriétaire
                          </Badge>
                        )}
                        {request.targetLocataire && (
                          <Badge variant="outline" className="text-xs">
                            Locataire
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Actions pour le notaire */}
      {isNotaire && (
        <div className="flex gap-2">
          <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Créer une demande
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer une demande</DialogTitle>
                <DialogDescription>
                  Demander des pièces ou des données aux parties du dossier
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitRequest(onSubmitRequest)} className="space-y-4">
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
                  {requestErrors.type && (
                    <p className="text-sm text-destructive">{requestErrors.type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Titre de la demande *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Demande de pièce d'identité"
                    {...registerRequest("title")}
                  />
                  {requestErrors.title && (
                    <p className="text-sm text-destructive">{requestErrors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Contenu de la demande *</Label>
                  <Textarea
                    id="content"
                    placeholder="Décrivez en détail ce que vous demandez..."
                    rows={6}
                    {...registerRequest("content")}
                  />
                  {requestErrors.content && (
                    <p className="text-sm text-destructive">{requestErrors.content.message}</p>
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
                          Propriétaire{proprietaires.length > 1 ? "s" : ""}
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
                          Locataire{locataires.length > 1 ? "s" : ""}
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

                  {requestErrors.targetProprietaire && (
                    <p className="text-sm text-destructive">
                      {requestErrors.targetProprietaire.message}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsRequestDialogOpen(false);
                      resetRequest();
                    }}
                    disabled={sending}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={sending}>
                    {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer la demande
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Formulaire d'envoi de message */}
      <form onSubmit={handleSubmitMessage(onSubmitMessage)} className="space-y-2">
        <Textarea
          placeholder="Tapez votre message..."
          {...registerMessage("content")}
          disabled={sending}
          rows={3}
        />
        {messageErrors.content && (
          <p className="text-sm text-destructive">{messageErrors.content.message}</p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={sending}>
            {sending ? (
              "Envoi..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

