"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, FileText, MessageSquare, User, Scale, Plus, AlertCircle, Loader2, Download } from "lucide-react";
import { getBailMessages, getBailMessagesAndRequests, sendBailMessage, getNotaireRequestsByBail } from "@/lib/actions/bail-messages";
import { createNotaireRequest } from "@/lib/actions/notaires";
import { formatDateTime } from "@/lib/utils/formatters";
import { Role, BailMessageType, NotaireRequestStatus } from "@prisma/client";
import { useSession } from "@/lib/auth-client";
import { getS3PublicUrl } from "@/hooks/use-s3-public-url";
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
  selectedPartyId?: string | null;
}

export function NotaireBailChat({ bailId, dossierId, bailParties, selectedPartyId: externalSelectedPartyId }: NotaireBailChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [internalSelectedPartyId, setInternalSelectedPartyId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Utiliser la partie sélectionnée externe si fournie, sinon utiliser l'état interne
  const selectedPartyId = externalSelectedPartyId !== undefined ? externalSelectedPartyId : internalSelectedPartyId;

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

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      // Si une partie est sélectionnée et que l'utilisateur est notaire, utiliser getBailMessagesAndRequests pour filtrer
      if (selectedPartyId) {
        const { messages: messagesData, requests: requestsData } = await getBailMessagesAndRequests(bailId, selectedPartyId);
        setMessages(messagesData);
        setRequests(requestsData);
      } else {
        // Sinon, charger tous les messages
        const [messagesData, requestsData] = await Promise.all([
          getBailMessages(bailId),
          getNotaireRequestsByBail(bailId),
        ]);
        setMessages(messagesData);
        setRequests(requestsData);
      }
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de charger les messages",
      });
    } finally {
      setLoading(false);
    }
  }, [bailId, selectedPartyId]);

  useEffect(() => {
    if (!session?.user?.id) return; // Ne pas charger si pas de session
    
    loadMessages();
    // Recharger les messages toutes les 30 secondes
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [bailId, selectedPartyId, loadMessages, session?.user?.id]);

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

  // Initialiser le destinataire par défaut pour le notaire si aucune partie n'est sélectionnée
  useEffect(() => {
    if (userRole === Role.NOTAIRE && !selectedPartyId && !internalSelectedPartyId && bailParties.length > 0) {
      // Sélectionner le premier propriétaire par défaut, ou le premier locataire si pas de propriétaire
      const firstProprietaire = bailParties.find((p) => p.profilType === "PROPRIETAIRE");
      const firstLocataire = bailParties.find((p) => p.profilType === "LOCATAIRE");
      const defaultRecipient = firstProprietaire || firstLocataire;
      if (defaultRecipient) {
        setInternalSelectedPartyId(defaultRecipient.id);
      }
    }
  }, [userRole, selectedPartyId, internalSelectedPartyId, bailParties]);

  const onSubmitMessage = async (data: MessageFormData) => {
    try {
      setSending(true);
      
      // Pour le notaire, utiliser selectedPartyId si disponible, sinon erreur
      const recipientPartyId = userRole === Role.NOTAIRE ? selectedPartyId : undefined;
      
      if (userRole === Role.NOTAIRE && !recipientPartyId) {
        toast.error("Erreur", {
          description: "Veuillez sélectionner un destinataire",
        });
        setSending(false);
        return;
      }
      
      const newMessage = await sendBailMessage(
        bailId, 
        data.content,
        recipientPartyId || undefined
      );
      setMessages([...messages, newMessage]);
      resetMessage();
      toast.success("Message envoyé");
      // Recharger les messages pour avoir la vue à jour
      loadMessages();
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
      
      // Créer un message dans le chat pour cette demande aux destinataires sélectionnés
      // Envoyer au propriétaire si sélectionné
      if (data.targetProprietaire && proprietaires.length > 0) {
        await sendBailMessage(bailId, `Nouvelle demande : ${data.title}`, proprietaires[0].id);
      }
      // Envoyer au locataire si sélectionné
      if (data.targetLocataire && locataires.length > 0) {
        await sendBailMessage(bailId, `Nouvelle demande : ${data.title}`, locataires[0].id);
      }
      
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

  // Trouver la partie sélectionnée pour afficher son nom
  const selectedParty = selectedPartyId ? bailParties.find((p) => p.id === selectedPartyId) : null;

  return (
    <div className="space-y-4">
      {/* Indicateur de la partie avec laquelle on discute */}
      {isNotaire && selectedParty && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <User className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            Discussion avec {getPartyName(selectedParty)} ({selectedParty.profilType === "PROPRIETAIRE" ? "Propriétaire" : "Locataire"})
          </span>
        </div>
      )}
      
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
                              href={getS3PublicUrl(doc.fileKey) || doc.fileKey}
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
                  <Label htmlFor="title">Nom de la piéce *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: piéce d'identiter"
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
        {/* Sélecteur de destinataire pour le notaire - seulement si aucune partie n'est sélectionnée */}
        {isNotaire && !selectedPartyId && (
          <div className="space-y-2">
            <Label htmlFor="recipient">Destinataire du message *</Label>
            <Select
              value={internalSelectedPartyId || ""}
              onValueChange={(value) => setInternalSelectedPartyId(value)}
            >
              <SelectTrigger id="recipient">
                <SelectValue placeholder="Sélectionner un destinataire" />
              </SelectTrigger>
              <SelectContent>
                {proprietaires.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Propriétaire : {getPartyName(prop)}
                    </div>
                  </SelectItem>
                ))}
                {locataires.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Locataire : {getPartyName(loc)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!internalSelectedPartyId && (
              <p className="text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Vous devez sélectionner un destinataire pour envoyer un message
              </p>
            )}
          </div>
        )}
        
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
          <Button type="submit" disabled={sending || (isNotaire && !selectedPartyId && !internalSelectedPartyId)}>
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

