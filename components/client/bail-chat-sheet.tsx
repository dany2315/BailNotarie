"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, FileText, MessageSquare, User, Scale, Upload, X, Download, Check, Paperclip, Loader2, Trash2 } from "lucide-react";
import { getBailMessagesAndRequests, sendBailMessage, sendBailMessageWithFile, addChatDocumentToBail, addDocumentToNotaireRequest, updateNotaireRequestStatus, deleteBailMessage, getChatOtherUser } from "@/lib/actions/bail-messages";
import { formatDateTime } from "@/lib/utils/formatters";
import { Role, BailMessageType, NotaireRequestStatus } from "@prisma/client";
import { useSession } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InputGroup, InputGroupTextarea, InputGroupButton } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getPusherClient } from "@/lib/pusher-client";
import type { Channel } from "pusher-js";

const messageSchema = z.object({
  content: z.string().optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;

// Fonction helper pour uploader un fichier directement vers S3 avec URL signée
async function uploadFileToS3(
  file: File,
  signedUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Suivi de progression réel avec XMLHttpRequest
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText || xhr.responseText || 'Unknown error'}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed due to network error"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload was aborted"));
    });

    // Upload PUT vers l'URL signée S3
    xhr.open("PUT", signedUrl, true);
    xhr.send(file);
  });
}

// Fonction helper pour obtenir une URL signée pour le téléchargement
async function getSignedUrlForDownload(fileKey: string): Promise<string> {
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
    console.error("[BailChatSheet] Erreur lors de la génération de l'URL signée:", error);
    // En cas d'erreur, retourner l'URL originale
    return fileKey;
  }
}

// Fonction helper pour télécharger un document avec URL signée S3
async function handleDownloadDocument(
  fileKey: string,
  fileName: string
): Promise<void> {
  if (typeof window === "undefined" || typeof window.document === "undefined") {
    toast.error("Téléchargement non disponible dans cet environnement");
    return;
  }

  try {
    // Obtenir une URL signée pour le téléchargement si c'est une URL S3
    let downloadUrl = fileKey;
    
    // Si c'est une URL S3, obtenir une URL signée
    if (fileKey?.startsWith("http") && (fileKey.includes("s3") || fileKey.includes("amazonaws.com"))) {
      try {
        downloadUrl = await getSignedUrlForDownload(fileKey);
      } catch (error) {
        console.warn("[BailChatSheet] Impossible d'obtenir une URL signée, utilisation de l'URL originale");
      }
    }
    
    // Télécharger le fichier
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error("Erreur lors du téléchargement du fichier");
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erreur lors du téléchargement:", error);
    toast.error("Erreur lors du téléchargement du document");
  }
}

// Composant séparé pour le formulaire de réponse à une demande
// Défini en dehors du composant principal pour éviter les problèmes de recréation d'état
function RequestResponseForm({ requestId, bailId, onSuccess }: { requestId: string; bailId: string; onSuccess?: () => void }) {
  const [isResponding, setIsResponding] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [responseFiles, setResponseFiles] = useState<File[]>([]);
  const responseFileInputRef = useRef<HTMLInputElement>(null);

  const handleResponseFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        toast.error("Fichier(s) trop volumineux", {
          description: `La taille maximale est de 10MB par fichier. ${invalidFiles.length} fichier(s) dépassent cette limite.`,
        });
        return;
      }
      setResponseFiles(prev => [...prev, ...files]);
    }
  };

  const removeResponseFile = (index: number) => {
    setResponseFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleResponseSubmit = async () => {
    if (responseFiles.length === 0) {
      toast.error("Erreur", {
        description: "Veuillez sélectionner au moins un fichier",
      });
      return;
    }

    try {
      setIsResponding(true);
      setUploadProgress(0);
      
      // Récupérer le bailId depuis la demande (nécessaire pour générer les URLs signées)
      // On va utiliser une approche différente : uploader chaque fichier vers S3 puis créer les documents
      const uploadedFiles: Array<{ publicUrl: string; fileName: string; mimeType: string; size: number }> = [];
      
      // Calculer la progression totale (chaque fichier = 100%)
      const progressPerFile = 100 / responseFiles.length;
      let currentProgress = 0;

      // Uploader chaque fichier vers S3
      for (let i = 0; i < responseFiles.length; i++) {
        const file = responseFiles[i];
        const fileProgress = (progress: number) => {
          const fileProgressValue = (i * progressPerFile) + (progress * progressPerFile / 100);
          setUploadProgress(Math.min(fileProgressValue, 100));
        };

        // 1. Récupérer l'URL signée S3
        const tokenResponse = await fetch("/api/blob/generate-upload-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bailId: bailId,
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
          }),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.json();
          throw new Error(error.error || "Erreur lors de la récupération de l'URL signée");
        }

        const { signedUrl, publicUrl } = await tokenResponse.json();

        // 2. Uploader directement vers S3
        await uploadFileToS3(file, signedUrl, fileProgress);

        uploadedFiles.push({
          publicUrl,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        });
      }

      // 3. Créer les documents dans la DB via l'API
      const createResponse = await fetch("/api/notaire-requests/add-document-with-s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          files: uploadedFiles,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error || "Erreur lors de la création des documents");
      }
      
      toast.success(`${responseFiles.length} document${responseFiles.length > 1 ? "s" : ""} ajouté${responseFiles.length > 1 ? "s" : ""} à la demande`);
      setResponseFiles([]);
      if (responseFileInputRef.current) {
        responseFileInputRef.current.value = "";
      }
      
      setUploadProgress(0);
      onSuccess?.();
    } catch (error: any) {
      setUploadProgress(0);
      toast.error("Erreur", {
        description: error.message || "Impossible d'ajouter le document",
      });
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <Label className="text-xs font-medium">Répondre avec des documents</Label>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => responseFileInputRef.current?.click()}
            disabled={isResponding}
            className="flex-1"
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Choisir des fichiers
          </Button>
          <input
            ref={responseFileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleResponseFileSelect}
            disabled={isResponding}
            className="hidden"
            multiple
          />
        </div>
        {responseFiles.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {responseFiles.length} fichier{responseFiles.length > 1 ? "s" : ""} sélectionné{responseFiles.length > 1 ? "s" : ""}
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {responseFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-1.5 rounded">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-xs shrink-0">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 shrink-0 hover:bg-destructive/10"
                    onClick={() => removeResponseFile(index)}
                    disabled={isResponding}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {isResponding && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Upload en cours...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleResponseSubmit}
                disabled={isResponding}
                className="w-full"
              >
                {isResponding ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-3 w-3" />
                    Envoyer {responseFiles.length} fichier{responseFiles.length > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface BailChatSheetProps {
  bailId: string;
  trigger?: React.ReactNode;
}

export function BailChatSheet({ bailId, trigger }: BailChatSheetProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [otherUser, setOtherUser] = useState<{ id: string; name: string | null; email: string; role: Role; partyId?: string } | null>(null);
  const [userClientId, setUserClientId] = useState<string | null>(null);
  const [userProfilType, setUserProfilType] = useState<"PROPRIETAIRE" | "LOCATAIRE" | null>(null);
  const userClientIdRef = useRef<string | null>(null);
  const userProfilTypeRef = useRef<"PROPRIETAIRE" | "LOCATAIRE" | null>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, { tempId: string; realId?: string; status: 'sending' | 'sent' | 'error' }>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pusherChannelRef = useRef<Channel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
  });

  const loadMessages = useCallback(async (isInitial = false) => {
    if (!open) return;
    try {
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const { messages: messagesData, requests: requestsData, userClientId: clientId } = await getBailMessagesAndRequests(bailId);
      
      // Utiliser le clientId retourné par l'API
      if (clientId && !userClientId) {
        setUserClientId(clientId);
      }
      
      if (isInitial) {
        // Chargement initial : remplacer tout
        setMessages(messagesData);
        setRequests(requestsData);
        setInitialLoading(false);
        // Scroll vers le bas après le chargement initial
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          setHasScrolledToBottom(true);
        });
      } else {
        // Rafraîchissement : ajouter seulement les nouveaux messages
        setMessages(prev => {
          const existingMessageIds = new Set(prev.map(m => m.id));
          const newMessages = messagesData.filter(m => !existingMessageIds.has(m.id));
          
          if (newMessages.length > 0) {
            return [...prev, ...newMessages].sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          }
          return prev;
        });
        
        setRequests(prev => {
          const existingRequestIds = new Set(prev.map(r => r.id));
          const newRequests = requestsData.filter(r => !existingRequestIds.has(r.id));
          
          if (newRequests.length > 0) {
            return [...prev, ...newRequests].sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          }
          return prev;
        });
        
        // Scroll vers le bas seulement si l'utilisateur est déjà en bas
        if (hasScrolledToBottom) {
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          });
        }
        setRefreshing(false);
      }
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de charger les messages",
      });
      if (isInitial) {
        setInitialLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [open, bailId, userClientId, hasScrolledToBottom]);

  // Charger userClientId et profilType dès l'ouverture du chat
  useEffect(() => {
    if (open && session?.user && !userClientId) {
      getBailMessagesAndRequests(bailId).then(({ userClientId: clientId }) => {
        if (clientId) {
          setUserClientId(clientId);
          userClientIdRef.current = clientId;
          
          // Récupérer le profilType du client
          fetch(`/api/bail/${bailId}/party/${clientId}/profil-type`)
            .then(res => res.json())
            .then(data => {
              if (data.profilType) {
                setUserProfilType(data.profilType);
                userProfilTypeRef.current = data.profilType;
              }
            })
            .catch(() => {
              // Ignorer les erreurs silencieusement
            });
        }
      }).catch(() => {
        // Ignorer les erreurs silencieusement
      });
    }
  }, [open, session?.user, bailId, userClientId]);
  
  // Mettre à jour les refs quand les valeurs changent
  useEffect(() => {
    userClientIdRef.current = userClientId;
  }, [userClientId]);
  
  useEffect(() => {
    userProfilTypeRef.current = userProfilType;
  }, [userProfilType]);

  // Connexion Pusher pour les mises à jour en temps réel
  useEffect(() => {
    if (!open || !session?.user) return;

    let pusher: ReturnType<typeof getPusherClient> | null = null;
    let channel: Channel | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const setupPusher = () => {
      try {
        pusher = getPusherClient();
        // Utiliser un presence channel pour tracker automatiquement qui est en ligne
        const channelName = `presence-bail-${bailId}`;
        channel = pusher.subscribe(channelName) as Channel;

        pusherChannelRef.current = channel;

        // Fonction pour bind les événements une fois le channel authentifié
        const bindEvents = () => {
          // Utiliser les refs pour avoir toujours la valeur la plus récente
          const getCurrentClientId = () => userClientIdRef.current;
          const getCurrentProfilType = () => userProfilTypeRef.current;
          // Utiliser les événements natifs de Pusher Presence Channel
          // Vérifier si l'autre utilisateur est déjà présent
          const presenceChannel = channel as any;
          if (presenceChannel?.members && otherUser?.id) {
            const member = presenceChannel.members.get(otherUser.id);
            setIsOtherUserOnline(!!member);
          }

          // Écouter quand un membre rejoint le channel
          channel?.bind("pusher:member_added", (member: { id: string; info: any }) => {
            if (otherUser && member.id === otherUser.id) {
              setIsOtherUserOnline(true);
            }
          });

          // Écouter quand un membre quitte le channel
          channel?.bind("pusher:member_removed", (member: { id: string; info: any }) => {
            if (otherUser && member.id === otherUser.id) {
              setIsOtherUserOnline(false);
            }
          });

          // Écouter l'événement "typing"
          channel?.bind("client-typing", (data: { userId: string; isTyping: boolean }) => {
            if (data.userId !== session?.user?.id && otherUser && data.userId === otherUser.id) {
              setIsOtherUserTyping(data.isTyping);
              // Réinitialiser après 3 secondes
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              if (data.isTyping) {
                typingTimeoutRef.current = setTimeout(() => {
                  setIsOtherUserTyping(false);
                }, 3000);
              }
            }
          });

          // Écouter les nouveaux messages
          channel?.bind("new-message", (data: { message: any }) => {
            setMessages(prev => {
              const existingMessageIds = new Set(prev.map(m => m.id));
              if (existingMessageIds.has(data.message.id)) {
                // Si c'est un message optimiste qui vient d'être confirmé, mettre à jour son statut
                setOptimisticMessages(prev => {
                  const optimisticEntry = Array.from(prev.entries()).find(
                    ([_, value]) => value.realId === data.message.id || value.tempId === data.message.id
                  );
                  if (optimisticEntry) {
                    const newMap = new Map(prev);
                    newMap.delete(optimisticEntry[0]);
                    return newMap;
                  }
                  return prev;
                });
                return prev;
              }

              // Filtrer les messages selon les règles :
              // - Messages qu'il a envoyés (senderId === user.id)
              // - Messages du notaire qui lui sont destinés (recipientPartyId === userClientId)
              const message = data.message;
              
              // Utiliser les refs pour avoir toujours la valeur la plus récente
              const clientId = getCurrentClientId();
              
              // Toujours accepter les messages de l'utilisateur
              if (message.senderId === session?.user?.id) {
                // C'est un message de l'utilisateur, l'accepter
              } else if (clientId) {
                // Filtrer correctement avec userClientId
                const shouldShowMessage = message.recipientPartyId === clientId;
                if (!shouldShowMessage) {
                  return prev; // Ne pas ajouter le message s'il ne doit pas être affiché
                }
              } else {
                // Si userClientId n'est pas encore chargé, accepter temporairement les messages du notaire
                // Le filtrage correct sera fait lors du prochain loadMessages
                const isFromNotaire = message.sender?.role === Role.NOTAIRE;
                if (!isFromNotaire) {
                  return prev; // Ne pas accepter les messages d'autres clients
                }
              }

              // Vérifier si c'est la confirmation d'un message optimiste
              let updatedPrev = prev;
              setOptimisticMessages(prevOptimistic => {
                const optimisticEntry = Array.from(prevOptimistic.entries()).find(
                  ([_, value]) => value.status === 'sending' && message.senderId === session?.user?.id
                );
                if (optimisticEntry) {
                  // Remplacer le message optimiste par le vrai message
                  updatedPrev = prev.filter(m => m.id !== optimisticEntry[0]);
                  const newMap = new Map(prevOptimistic);
                  newMap.delete(optimisticEntry[0]);
                  return newMap;
                }
                return prevOptimistic;
              });

              // Convertir createdAt en Date si c'est une string
              const messageWithDate = {
                ...message,
                createdAt: typeof message.createdAt === 'string' 
                  ? new Date(message.createdAt) 
                  : message.createdAt,
              };
              const newMessages = [...updatedPrev, messageWithDate].sort((a, b) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
              
              // Scroll vers le bas si l'utilisateur est déjà en bas
              setTimeout(() => {
                const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
                if (scrollArea) {
                  const { scrollTop, scrollHeight, clientHeight } = scrollArea;
                  const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
                  if (isAtBottom) {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                  }
                }
              }, 50);
              
              return newMessages;
            });
          });

          // Écouter les suppressions de messages
          channel?.bind("message-deleted", (data: { messageId: string }) => {
            setMessages(prev => prev.filter(m => m.id !== data.messageId));
          });

          // Écouter les nouvelles demandes
          channel?.bind("new-request", (data: { request: any }) => {
            setRequests(prev => {
              const existingRequestIds = new Set(prev.map(r => r.id));
              if (existingRequestIds.has(data.request.id)) {
                return prev;
              }
              
              const request = data.request;
              const profilType = getCurrentProfilType();
              
              // Filtrer les demandes selon le profil du client
              // Un client ne voit que les demandes qui lui sont destinées
              if (profilType) {
                const shouldShowRequest = 
                  (profilType === "PROPRIETAIRE" && request.targetProprietaire) ||
                  (profilType === "LOCATAIRE" && request.targetLocataire) ||
                  (request.targetPartyIds && request.targetPartyIds.length > 0);
                
                // Si la demande cible des parties spécifiques, vérifier si le client est concerné
                if (request.targetPartyIds && request.targetPartyIds.length > 0) {
                  const clientId = getCurrentClientId();
                  if (clientId && !request.targetPartyIds.includes(clientId)) {
                    return prev; // La demande ne cible pas ce client
                  }
                } else if (!shouldShowRequest) {
                  return prev; // La demande ne cible pas ce type de profil
                }
              }
              
              // Accepter la demande (soit elle correspond aux critères, soit on laisse le filtrage côté serveur)
              return [...prev, request].sort((a, b) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            });
          });

          // Écouter les mises à jour de demandes
          channel?.bind("request-updated", async (data: { request?: any }) => {
            // Si les données complètes sont fournies, les utiliser directement
            if (data?.request) {
              setRequests(prev => {
                const existingRequestIds = new Set(prev.map(r => r.id));
                const updatedRequests = prev.map(req => 
                  req.id === data.request.id ? { ...req, ...data.request } : req
                );
                if (!existingRequestIds.has(data.request.id)) {
                  updatedRequests.push(data.request);
                }
                return updatedRequests.sort((a, b) => 
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
              });
            } else {
              // Sinon, recharger les demandes pour avoir les données à jour
              try {
                const { requests: requestsData } = await getBailMessagesAndRequests(bailId);
                setRequests(prev => {
                  const existingRequestIds = new Set(prev.map(r => r.id));
                  const updatedRequests = requestsData.map(req => {
                    const existing = prev.find(r => r.id === req.id);
                    return existing ? { ...existing, ...req } : req;
                  });
                  const newRequests = requestsData.filter(r => !existingRequestIds.has(r.id));
                  return [...updatedRequests, ...newRequests].sort((a, b) => 
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  );
                });
              } catch (error) {
                console.error("Erreur lors du rechargement des demandes:", error);
              }
            }
          });
        };

        // Gérer les erreurs de connexion
        channel.bind("pusher:subscription_error", (error: any) => {
          console.error("Erreur d'abonnement Pusher:", error);
          // Retry après 3 secondes
          retryTimeout = setTimeout(() => {
            if (channel) {
              channel.unbind_all();
              pusher?.unsubscribe(channelName);
            }
            setupPusher();
          }, 3000);
        });

        // Attendre que le channel soit authentifié avant de bind les événements
        channel.bind("pusher:subscription_succeeded", () => {
          bindEvents();
        });

        // Bind les événements immédiatement si le channel est déjà authentifié
        if (channel.subscribed) {
          bindEvents();
        }
      } catch (error) {
        console.error("Erreur lors de la connexion Pusher:", error);
        // Retry après 3 secondes en cas d'erreur
        retryTimeout = setTimeout(() => {
          setupPusher();
        }, 3000);
      }
    };

    setupPusher();

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
      if (channel) {
        // Avec les presence channels, Pusher gère automatiquement la déconnexion
        channel.unbind_all();
        pusher?.unsubscribe(`presence-bail-${bailId}`);
      }
      pusherChannelRef.current = null;
    };
  }, [open, bailId, session?.user, otherUser]);

  // Charger les informations de l'autre utilisateur
  useEffect(() => {
    if (open && session?.user) {
      getChatOtherUser(bailId).then((user) => {
        setOtherUser(user);
      }).catch((error) => {
        console.error("Erreur lors du chargement de l'autre utilisateur:", error);
      });
    }
  }, [bailId, open, session?.user]);

  useEffect(() => {
    if (open) {
      // Réinitialiser l'état de scroll lors de l'ouverture
      setHasScrolledToBottom(false);
      loadMessages(true);
    } else {
      // Réinitialiser les messages quand le sheet se ferme
      setMessages([]);
      setRequests([]);
      setIsOtherUserOnline(false);
      setIsOtherUserTyping(false);
    }
  }, [bailId, open]);

  // Détecter si l'utilisateur est en bas de la liste
  useEffect(() => {
    if (!open || initialLoading) return;
    
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!scrollArea) {
      // Essayer avec un délai si le viewport n'est pas encore disponible
      const timeout = setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (viewport) {
          const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = viewport;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            setHasScrolledToBottom(isAtBottom);
          };
          viewport.addEventListener('scroll', handleScroll);
          handleScroll();
        }
      }, 200);
      return () => clearTimeout(timeout);
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setHasScrolledToBottom(isAtBottom);
    };

    scrollArea.addEventListener('scroll', handleScroll);
    // Vérifier la position initiale après un court délai
    setTimeout(handleScroll, 100);
    
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, [open, initialLoading, messages, requests]);

  const onSubmit = async (data: MessageFormData) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const messageContent = data.content?.trim() || "";
    const filesToSend = [...selectedFiles];
    
    // Créer un message optimiste immédiatement
    const optimisticMessage: any = {
      id: tempId,
      bailId,
      senderId: session?.user?.id,
      messageType: "MESSAGE",
      content: messageContent || (filesToSend.length === 1 
        ? `Fichier: ${filesToSend[0].name}` 
        : filesToSend.length > 1 
          ? `${filesToSend.length} fichiers: ${filesToSend.map(f => f.name).join(", ")}`
          : ""),
      recipientPartyId: null,
      createdAt: new Date(),
      sender: {
        id: session?.user?.id,
        name: session?.user?.name,
        email: session?.user?.email,
        role: Role.UTILISATEUR,
      },
      document: filesToSend.length > 0 ? {
        id: `temp-doc-${tempId}`,
        label: filesToSend.length === 1 ? filesToSend[0].name : `${filesToSend.length} fichiers`,
        fileKey: "#",
        mimeType: filesToSend[0]?.type || "application/octet-stream",
        size: filesToSend.reduce((sum, f) => sum + f.size, 0),
      } : null,
    };

    // Ajouter le message optimiste immédiatement
    setMessages(prev => [...prev, optimisticMessage].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ));
    setOptimisticMessages(prev => {
      const newMap = new Map(prev);
      newMap.set(tempId, { tempId, status: 'sending' });
      return newMap;
    });
    
    // Scroll vers le bas immédiatement
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasScrolledToBottom(true);
    }, 50);

    try {
      setSending(true);
      
      if (filesToSend.length > 0) {
        // Uploader chaque fichier vers S3 puis créer le message
        const uploadedFiles: Array<{ publicUrl: string; fileName: string; mimeType: string; size: number }> = [];
        
        // Calculer la progression totale (chaque fichier = 100%)
        const progressPerFile = 100 / filesToSend.length;
        let currentProgress = 0;

        // Uploader chaque fichier vers S3
        for (let i = 0; i < filesToSend.length; i++) {
          const file = filesToSend[i];
          const fileProgress = (progress: number) => {
            const fileProgressValue = (i * progressPerFile) + (progress * progressPerFile / 100);
            // Mettre à jour la progression globale (on peut utiliser un état si nécessaire)
          };

          // 1. Récupérer l'URL signée S3
          const tokenResponse = await fetch("/api/blob/generate-upload-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bailId: bailId,
              fileName: file.name,
              contentType: file.type || "application/octet-stream",
            }),
          });

          if (!tokenResponse.ok) {
            const error = await tokenResponse.json();
            throw new Error(error.error || "Erreur lors de la récupération de l'URL signée");
          }

          const { signedUrl, publicUrl } = await tokenResponse.json();

          // 2. Uploader directement vers S3
          await uploadFileToS3(file, signedUrl, fileProgress);

          uploadedFiles.push({
            publicUrl,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
          });
        }

        // 3. Créer le message avec les fichiers uploadés via l'API
        const sendResponse = await fetch("/api/bail-messages/send-with-s3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bailId,
            files: uploadedFiles,
            content: messageContent,
          }),
        });

        if (!sendResponse.ok) {
          const error = await sendResponse.json();
          throw new Error(error.error || "Erreur lors de l'envoi du message");
        }

        const { message: sentMessage } = await sendResponse.json();
        
        // Mettre à jour le message optimiste avec le vrai ID
        setOptimisticMessages(prev => {
          const newMap = new Map(prev);
          const entry = newMap.get(tempId);
          if (entry) {
            newMap.set(tempId, { ...entry, realId: sentMessage.id, status: 'sent' });
          }
          return newMap;
        });
        
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else if (messageContent) {
        // Envoyer message texte uniquement
        const sentMessage = await sendBailMessage(bailId, messageContent);
        
        // Mettre à jour le message optimiste avec le vrai ID
        setOptimisticMessages(prev => {
          const newMap = new Map(prev);
          const entry = newMap.get(tempId);
          if (entry) {
            newMap.set(tempId, { ...entry, realId: sentMessage.id, status: 'sent' });
          }
          return newMap;
        });
      } else {
        // Ne devrait pas arriver ici grâce à la validation
        throw new Error("Veuillez saisir un message ou sélectionner un fichier");
      }
      
      reset();
      // Le message sera remplacé par le vrai message via Pusher
      // toast.success("Message envoyé"); // Pas besoin, le message apparaît déjà
    } catch (error: any) {
      // Retirer le message optimiste en cas d'erreur
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setOptimisticMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      
      toast.error("Erreur", {
        description: error.message || "Impossible d'envoyer le message",
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Vérifier la taille de chaque fichier (max 10MB chacun)
      const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        toast.error("Fichier(s) trop volumineux", {
          description: `La taille maximale est de 10MB par fichier. ${invalidFiles.length} fichier(s) dépassent cette limite.`,
        });
        return;
      }
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isNotaire = (session?.user as any)?.role === Role.NOTAIRE;
  const currentUserId = session?.user?.id;

  // Mémoriser la combinaison des messages et demandes triés par date
  const allItems = useMemo(() => {
    const items: Array<{
      type: "message" | "request";
      id: string;
      createdAt: Date;
      data: any;
    }> = [
      ...messages.map((m) => ({
        type: "message" as const,
        id: m.id,
        createdAt: m.createdAt,
        data: m,
      })),
      ...requests.map((r) => ({
        type: "request" as const,
        id: r.id,
        createdAt: r.createdAt,
        data: r,
      })),
    ];
    return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, requests]);

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <MessageSquare className="mr-2 h-4 w-4" />
      Discussion
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            {/* Skeleton pour le header pendant le chargement */}
            {initialLoading && !otherUser ? (
              <>
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <SheetTitle className="sr-only">Chargement de la discussion</SheetTitle>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </>
            ) : (
              <>
                {otherUser && (
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className={otherUser.role === Role.NOTAIRE ? "bg-blue-500 text-white" : "bg-muted"}>
                      {otherUser.role === Role.NOTAIRE ? (
                        <Scale className="h-5 w-5" />
                      ) : (
                        (otherUser.name || otherUser.email || "U")
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      )}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg">
                    {otherUser ? (`Maître ${otherUser.name}` || otherUser.email || "Utilisateur") : "Discussion sur le bail"} 
                    {otherUser && <Badge variant="outline" className="text-xs font-light text-muted-foreground ml-2">Notaire</Badge>}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {isOtherUserTyping ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                        </div>
                        <span className="text-xs">en train d'écrire...</span>
                      </div>
                    ) : isOtherUserOnline ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs">en ligne</span>
                      </div>
                    ) : (
                      <SheetDescription className="text-xs mt-0">
                        {isNotaire ? "Communiquez avec les clients" : "Communiquez avec le notaire"}
                      </SheetDescription>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Zone de messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-6">
            {/* Indicateur de rafraîchissement discret en haut */}
            {refreshing && messages.length > 0 && (
              <div className="flex justify-center py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Mise à jour...</span>
                </div>
              </div>
            )}
            
            <div className="space-y-6">
              {initialLoading ? (
                /* Skeletons de messages pendant le chargement */
                <div className="space-y-6">
                  {/* Message entrant skeleton */}
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex flex-col gap-1 max-w-[75%]">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-16 w-64 rounded-2xl rounded-bl-md" />
                    </div>
                  </div>
                  {/* Message sortant skeleton */}
                  <div className="flex gap-3 flex-row-reverse">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex flex-col gap-1 items-end max-w-[75%]">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-12 w-48 rounded-2xl rounded-br-md" />
                    </div>
                  </div>
                  {/* Message entrant skeleton */}
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex flex-col gap-1 max-w-[75%]">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-20 w-72 rounded-2xl rounded-bl-md" />
                    </div>
                  </div>
                  {/* Demande skeleton */}
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 max-w-[75%]">
                      <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-32 w-full rounded-lg" />
                    </div>
                  </div>
                </div>
              ) : allItems.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Aucun message pour le moment. Commencez la conversation !
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {allItems.map((item) => {
                      if (item.type === "message") {
                        const message = item.data;
                        const isOwnMessage = message.senderId === currentUserId;
                        const isNotaireMessage = message.sender.role === Role.NOTAIRE;
                        const senderInitials = (message.sender.name || message.sender.email || "U")
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2);
                        
                        // Vérifier si c'est un message optimiste
                        const optimisticStatus = optimisticMessages.get(message.id);
                        const isOptimistic = optimisticStatus !== undefined;
                        const isSending = optimisticStatus?.status === 'sending';

                        return (
                          <div
                            key={`message-${message.id}`}
                            className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : "flex-row"} ${isSending ? "opacity-70" : ""}`}
                          >
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={isNotaireMessage ? "bg-blue-500 text-white" : "bg-muted"}>
                                {isNotaireMessage ? (
                                  <Scale className="h-4 w-4" />
                                ) : (
                                  senderInitials
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`flex flex-col gap-1 ${isOwnMessage ? "items-end" : "items-start"} max-w-[75%] group`}>
                              <div className="flex items-center gap-2 px-1">
                                <span className="text-xs font-medium text-foreground">
                                  {isOwnMessage ? "Moi" : (message.sender.name || message.sender.email)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(message.createdAt)}
                                </span>
                                {isSending && (
                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                )}
                                {isOwnMessage && !isOptimistic && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setMessageToDelete(message.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                              <div
                                className={`rounded-2xl px-4 py-2.5 relative ${
                                  isOwnMessage
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted rounded-bl-md"
                                }`}
                              >
                                {message.content && (
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                )}
                                {message.document && (
                                  <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 ${
                                    isOwnMessage ? "bg-white/10" : "bg-background"
                                  }`}>
                                    <FileText className="h-4 w-4 shrink-0" />
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const signedUrl = await getSignedUrlForDownload(message.document.fileKey);
                                        window.open(signedUrl, "_blank", "noopener,noreferrer");
                                      }}
                                      className="text-sm underline hover:no-underline flex-1 truncate text-left"
                                    >
                                      {message.document.label || "Document"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadDocument(
                                        message.document.fileKey,
                                        message.document.label || "Document"
                                      )}
                                      className="shrink-0 hover:opacity-70 transition-opacity"
                                      title="Télécharger le document"
                                    >
                                      <Download className="h-4 w-4" />
                                    </button>
                                    {isNotaire && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs shrink-0"
                                        onClick={async () => {
                                          try {
                                            await addChatDocumentToBail(bailId, message.document.id);
                                            toast.success("Document ajouté aux pièces annexes du bail");
                                            // Pas besoin de recharger - le document est déjà dans le message
                                          } catch (error: any) {
                                            toast.error("Erreur", {
                                              description: error.message || "Impossible d'ajouter le document",
                                            });
                                          }
                                        }}
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Ajouter
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const request = item.data;

                        return (
                          <div key={`request-${request.id}`} className="flex gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-orange-500 text-white">
                                <FileText className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1 max-w-[75%] flex-1">
                              <div className="flex items-center gap-2 px-1">
                                <span className="text-xs font-medium text-foreground">
                                  {request.createdBy.name || request.createdBy.email}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(request.createdAt)}
                                </span>
                              </div>
                              <Card className={`${
                                  request.status === NotaireRequestStatus.COMPLETED 
                                    ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" 
                                    : "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20"
                                }`}>
                                <CardContent>
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                                  {/* Afficher les documents déjà fournis pour cette demande */}
                                  {request.documents && request.documents.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">Documents fournis :</p>
                                      {request.documents.map((doc: any) => {
                                        // Déterminer le nom de l'expéditeur
                                        const isOwnDocument = doc.uploadedBy?.id === currentUserId;
                                        const senderName = isOwnDocument 
                                          ? "Moi"
                                          : doc.client?.entreprise 
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
                                          <div key={doc.id} className="flex flex-col gap-1 text-xs bg-background p-2 rounded">
                                            <div className="flex items-center gap-2">
                                              <FileText className="h-3 w-3 shrink-0" />
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  const signedUrl = await getSignedUrlForDownload(doc.fileKey);
                                                  window.open(signedUrl, "_blank", "noopener,noreferrer");
                                                }}
                                                className="underline hover:no-underline flex-1 truncate text-blue-600 hover:text-blue-800 text-left"
                                              >
                                                {doc.label || "Document"}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDownloadDocument(
                                                  doc.fileKey,
                                                  doc.label || "Document"
                                                )}
                                                className="shrink-0 hover:opacity-70 transition-opacity"
                                                title="Télécharger le document"
                                              >
                                                <Download className="h-3 w-3 shrink-0 text-muted-foreground" />
                                              </button>
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground pl-5">
                                              <User className="h-3 w-3" />
                                              <span>{senderName}</span>
                                              {profilType && (
                                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                                  {profilType}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {/* Formulaire de réponse pour les demandes de document */}
                                  {request.status === NotaireRequestStatus.PENDING && (
                                    <RequestResponseForm requestId={request.id} bailId={bailId} />
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        );
                      }
                  })}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Zone de fichiers sélectionnés */}
          {selectedFiles.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/50">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {selectedFiles.length} fichier{selectedFiles.length > 1 ? "s" : ""} sélectionné{selectedFiles.length > 1 ? "s" : ""}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => removeFile(index)}
                        disabled={sending || uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Formulaire d'envoi */}
          <form onSubmit={handleSubmit(onSubmit)} className="border-t p-4">
            <InputGroup className="max-w-none">
              <InputGroupButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || uploading}
                className="shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </InputGroupButton>
              <InputGroupTextarea
                placeholder="Tapez votre message..."
                {...register("content")}
                disabled={sending || uploading}
                rows={1}
                className="max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!sending && !uploading && (watch("content")?.trim() || selectedFiles.length > 0)) {
                      // Arrêter l'indicateur de saisie avant d'envoyer
                      if (pusherChannelRef.current && session?.user?.id) {
                        try {
                          pusherChannelRef.current.trigger("client-typing", {
                            userId: session.user.id,
                            isTyping: false,
                          });
                        } catch (error) {
                          // Ignorer les erreurs
                        }
                      }
                      handleSubmit(onSubmit)();
                    }
                  } else {
                    // Émettre l'événement "typing" quand l'utilisateur tape
                    if (pusherChannelRef.current && session?.user?.id) {
                      if (typingDebounceRef.current) {
                        clearTimeout(typingDebounceRef.current);
                      }
                      try {
                        pusherChannelRef.current.trigger("client-typing", {
                          userId: session.user.id,
                          isTyping: true,
                        });
                      } catch (error) {
                        // Ignorer les erreurs
                      }
                      // Arrêter l'indicateur après 3 secondes d'inactivité
                      typingDebounceRef.current = setTimeout(() => {
                        if (pusherChannelRef.current && session?.user?.id) {
                          try {
                            pusherChannelRef.current.trigger("client-typing", {
                              userId: session.user.id,
                              isTyping: false,
                            });
                          } catch (error) {
                            // Ignorer les erreurs
                          }
                        }
                      }, 3000);
                    }
                  }
                }}
              />
              <InputGroupButton
                type="submit"
                variant="ghost"
                size="sm"
                disabled={sending || uploading || (selectedFiles.length === 0 && !watch("content")?.trim())}
                className="shrink-0"
              >
                {sending || uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </InputGroupButton>
            </InputGroup>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={sending || uploading}
              className="hidden"
              multiple
            />
            {errors.content && (
              <p className="text-sm text-destructive mt-2 px-1">{errors.content.message}</p>
            )}
          </form>
        </div>

        {/* Dialog de confirmation de suppression */}
        <Dialog open={messageToDelete !== null} onOpenChange={(open) => !open && setMessageToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer le message</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.
                {messages.find(m => m.id === messageToDelete)?.document && (
                  <span className="block mt-2 text-destructive font-medium">
                    Le document associé sera également supprimé.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMessageToDelete(null)}
                disabled={isDeleting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!messageToDelete) return;
                  try {
                    setIsDeleting(true);
                    await deleteBailMessage(messageToDelete);
                    toast.success("Message supprimé");
                    setMessageToDelete(null);
                    // Ne pas recharger - Pusher mettra à jour automatiquement via message-deleted
                  } catch (error: any) {
                    toast.error("Erreur", {
                      description: error.message || "Impossible de supprimer le message",
                    });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  "Supprimer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

