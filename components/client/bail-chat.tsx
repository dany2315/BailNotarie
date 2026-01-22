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
import { Send, FileText, MessageSquare, User, Scale, Download } from "lucide-react";
import { getBailMessages, sendBailMessage, getNotaireRequestsByBail } from "@/lib/actions/bail-messages";
import { formatDateTime } from "@/lib/utils/formatters";
import { Role, BailMessageType, NotaireRequestStatus } from "@prisma/client";
import { useSession } from "@/lib/auth-client";

const messageSchema = z.object({
  content: z.string().min(1, "Le message ne peut pas être vide"),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface BailChatProps {
  bailId: string;
}

export function BailChat({ bailId }: BailChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
  });

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
  }, [messages,requests]);

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

  const onSubmit = async (data: MessageFormData) => {
    try {
      setSending(true);
      const newMessage = await sendBailMessage(bailId, data.content);
      setMessages([...messages, newMessage]);
      reset();
      toast.success("Message envoyé");
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible d'envoyer le message",
      });
    } finally {
      setSending(false);
    }
  };

  const isNotaire = userRole === Role.NOTAIRE;
  const currentUserId = session?.user?.id;

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
                        { isNotaireMessage ? `Maître ${message.sender.name}` : message.sender.name || message.sender.email}
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
                    : "border-orange-200 bg-orange-50"
                }`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className={`h-4 w-4 ${
                        request.status === NotaireRequestStatus.COMPLETED 
                          ? "text-green-600" 
                          : "text-orange-600"
                      }`} />
                      <Badge variant="outline" className={`${
                        request.status === NotaireRequestStatus.COMPLETED 
                          ? "border-green-300 text-green-700" 
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
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulaire d'envoi */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <Textarea
          placeholder="Tapez votre message..."
          {...register("content")}
          disabled={sending}
          rows={3}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
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

