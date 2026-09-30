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
import { Send, FileText, MessageSquare, User, Scale, Plus, Upload, X, Download, Check, Loader2, Paperclip, Trash2 } from "lucide-react";
import { getBailMessagesAndRequests, sendBailMessage, sendBailMessageWithFile, addChatDocumentToBail, addDocumentToNotaireRequest, updateNotaireRequestStatus, deleteBailMessage, getChatOtherUser, getChatOtherUserByParty } from "@/lib/actions/bail-messages";
import { createNotaireRequest, deleteNotaireRequest } from "@/lib/actions/notaires";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getPusherClient } from "@/lib/pusher-client";
import { ChatPanel } from "@/components/chat-v2/chat-panel";
import { ChatDock } from "@/components/chat-v2/chat-dock";
import {
  ConfirmDialog,
  RequestStatusControl,
  type RequestStatus,
} from "@/components/chat-v2/chat-ui";
import { toTimeline } from "@/components/chat-v2/adapters";
import type { Channel } from "pusher-js";

const messageSchema = z.object({
  content: z.string().optional(),
});

const requestSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  content: z.string().min(1, "Le contenu est requis"),
  targetProprietaire: z.boolean(),
  targetLocataire: z.boolean(),
  targetPartyIds: z.array(z.string()),
}).refine(
  (data) => data.targetProprietaire || data.targetLocataire || (data.targetPartyIds && data.targetPartyIds.length > 0),
  {
    message: "Au moins un destinataire doit être sélectionné",
    path: ["targetProprietaire"],
  }
);

type MessageFormData = z.infer<typeof messageSchema>;
type RequestFormData = z.infer<typeof requestSchema>;

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
    console.error("[NotaireBailChatSheet] Erreur lors de la génération de l'URL signée:", error);
    // Fallback : générer l'URL publique depuis la clé S3
    const { getS3PublicUrl } = await import("@/hooks/use-s3-public-url");
    return getS3PublicUrl(fileKey) || fileKey;
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
    // Toujours essayer d'obtenir une URL signée (fonctionne avec clé S3 ou URL complète)
    let downloadUrl = fileKey;
    
    try {
      downloadUrl = await getSignedUrlForDownload(fileKey);
    } catch (error) {
      // Fallback : si c'est une URL complète (ancien format), utiliser directement
      if (fileKey?.startsWith("http")) {
        downloadUrl = fileKey;
      } else {
        // Sinon, générer l'URL publique depuis la clé S3
        const { getS3PublicUrl } = await import("@/hooks/use-s3-public-url");
        downloadUrl = getS3PublicUrl(fileKey) || fileKey;
      }
        console.warn("[NotaireBailChatSheet] Impossible d'obtenir une URL signée, utilisation de l'URL publique");
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

interface NotaireBailChatSheetProps {
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function NotaireBailChatSheet({ bailId, dossierId, bailParties, selectedPartyId: externalSelectedPartyId, open: controlledOpen, onOpenChange, trigger }: NotaireBailChatSheetProps) {
  const { data: session } = useSession(); 
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [internalSelectedPartyId, setInternalSelectedPartyId] = useState<string | null>(null);
  // Utiliser la partie sélectionnée externe si fournie, sinon utiliser l'état interne
  const selectedPartyId = externalSelectedPartyId !== undefined ? externalSelectedPartyId : internalSelectedPartyId;
  const [messages, setMessages] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [isDeletingRequest, setIsDeletingRequest] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [otherUser, setOtherUser] = useState<{ id: string | null; name: string | null; email: string | null; role: Role; partyId?: string; partyName?: string; profilType?: string } | null>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [selectedPartyUserIds, setSelectedPartyUserIds] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, { tempId: string; realId?: string; status: 'sending' | 'sent' | 'error' }>>(new Map());
  const [optimisticRequests, setOptimisticRequests] = useState<Map<string, { tempId: string; realId?: string; status: 'sending' | 'sent' | 'error' }>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pusherChannelRef = useRef<Channel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasScrolledToBottomRef = useRef(false);

  const {
    register: registerMessage,
    handleSubmit: handleSubmitMessage,
    reset: resetMessage,
    watch: watchMessage,
    setValue: setValueMessage,
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
      title: "",
      content: "",
      targetProprietaire: false,
      targetLocataire: false,
      targetPartyIds: [],
    },
  });

  const targetProprietaire = watch("targetProprietaire");
  const targetLocataire = watch("targetLocataire");
  const targetPartyIds = watch("targetPartyIds") || [];

  const loadMessages = useCallback(async (isInitial = false) => {
    if (!open) return;
    try {
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const { messages: messagesData, requests: requestsData } = await getBailMessagesAndRequests(bailId, selectedPartyId);
      
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
        if (hasScrolledToBottomRef.current) {
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
  }, [open, bailId, selectedPartyId]);

  useEffect(() => {
    hasScrolledToBottomRef.current = hasScrolledToBottom;
  }, [hasScrolledToBottom]);

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
          // Utiliser les événements natifs de Pusher Presence Channel
          // Vérifier si l'autre utilisateur est déjà présent
          const presenceChannel = channel as any;
          if (presenceChannel?.members && otherUser?.id) {
            const member = presenceChannel.members.get(otherUser.id);
            setIsOtherUserOnline(!!member);
          }

          // Écouter quand un membre rejoint le channel
          channel?.bind("pusher:member_added", (member: { id: string; info: any }) => {
            if (otherUser && otherUser.id && member.id === otherUser.id) {
              setIsOtherUserOnline(true);
            }
          });

          // Écouter quand un membre quitte le channel
          channel?.bind("pusher:member_removed", (member: { id: string; info: any }) => {
            if (otherUser && otherUser.id && member.id === otherUser.id) {
              setIsOtherUserOnline(false);
            }
          });

          // Écouter l'événement "typing"
          channel?.bind("client-typing", (data: { userId: string; isTyping: boolean }) => {
            if (data.userId !== session?.user?.id && otherUser && otherUser.id && data.userId === otherUser.id) {
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
                setOptimisticMessages(prevOptimistic => {
                  const optimisticEntry = Array.from(prevOptimistic.entries()).find(
                    ([_, value]) => value.realId === data.message.id || value.tempId === data.message.id
                  );
                  if (optimisticEntry) {
                    const newMap = new Map(prevOptimistic);
                    newMap.delete(optimisticEntry[0]);
                    return newMap;
                  }
                  return prevOptimistic;
                });
                return prev;
              }

              // Filtrer les messages selon les règles :
              // Si une partie est sélectionnée : uniquement les messages avec cette partie
              // Sinon : tous les messages
              const message = data.message;
              let shouldShowMessage = true;

              if (selectedPartyId && selectedPartyId !== "all") {
                // Vérifier si le message concerne la partie sélectionnée
                const isMessageFromNotaireToParty = 
                  message.senderId === session?.user?.id && 
                  message.recipientPartyId === selectedPartyId;
                
                // Vérifier si le message est envoyé par un utilisateur de cette partie
                // (les messages des clients n'ont pas de recipientPartyId, ils sont automatiquement visibles par le notaire)
                const isMessageFromParty = 
                  message.recipientPartyId === selectedPartyId ||
                  (selectedPartyUserIds.length > 0 && selectedPartyUserIds.includes(message.senderId));

                shouldShowMessage = isMessageFromNotaireToParty || isMessageFromParty;
              }
              // Si aucune partie n'est sélectionnée ou "all" est sélectionné, le notaire voit tous les messages

              if (!shouldShowMessage) {
                return prev; // Ne pas ajouter le message s'il ne doit pas être affiché
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

          // Écouter les suppressions de demandes
          channel?.bind("request-deleted", (data: { requestId: string }) => {
            setRequests(prev => prev.filter(r => r.id !== data.requestId));
          });

          // Écouter les nouvelles demandes
          channel?.bind("new-request", (data: { request: any }) => {
            setRequests(prev => {
              const existingRequestIds = new Set(prev.map(r => r.id));
              if (existingRequestIds.has(data.request.id)) {
                // Si c'est une demande optimiste qui vient d'être confirmée, mettre à jour son statut
                setOptimisticRequests(prevOptimistic => {
                  const optimisticEntry = Array.from(prevOptimistic.entries()).find(
                    ([_, value]) => value.realId === data.request.id || value.tempId === data.request.id
                  );
                  if (optimisticEntry) {
                    const newMap = new Map(prevOptimistic);
                    newMap.delete(optimisticEntry[0]);
                    return newMap;
                  }
                  return prevOptimistic;
                });
                return prev;
              }
              
              // Vérifier si c'est la confirmation d'une demande optimiste
              let updatedPrev = prev;
              setOptimisticRequests(prevOptimistic => {
                const optimisticEntry = Array.from(prevOptimistic.entries()).find(
                  ([_, value]) => value.status === 'sending' && data.request.createdById === session?.user?.id
                );
                if (optimisticEntry) {
                  // Remplacer la demande optimiste par la vraie demande
                  updatedPrev = prev.filter(r => r.id !== optimisticEntry[0]);
                  const newMap = new Map(prevOptimistic);
                  newMap.delete(optimisticEntry[0]);
                  return newMap;
                }
                return prevOptimistic;
              });
              
              return [...updatedPrev, data.request].sort((a, b) => 
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
                const { requests: requestsData } = await getBailMessagesAndRequests(bailId, selectedPartyId);
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
  }, [open, bailId, session?.user, otherUser, selectedPartyId, selectedPartyUserIds]);

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

  // Charger les informations de l'autre utilisateur et les IDs des utilisateurs de la partie
  useEffect(() => {
    if (open && session?.user) {
      if (selectedPartyId && selectedPartyId !== "all") {
        // Si une partie spécifique est sélectionnée, charger l'utilisateur de cette partie
        getChatOtherUserByParty(bailId, selectedPartyId).then((user) => {
          setOtherUser(user);
        }).catch((error) => {
          console.error("Erreur lors du chargement de l'autre utilisateur:", error);
        });

        // Charger les IDs des utilisateurs de cette partie
        fetch(`/api/bail/${bailId}/party/${selectedPartyId}/user-ids`)
          .then(res => res.json())
          .then(data => {
            if (data.userIds) {
              setSelectedPartyUserIds(data.userIds);
            }
          })
          .catch(error => {
            console.error("Erreur lors de la récupération des IDs utilisateurs:", error);
          });
      } else {
        // Sinon, utiliser la fonction par défaut
        getChatOtherUser(bailId).then((user) => {
          setOtherUser(user);
        }).catch((error) => {
          console.error("Erreur lors du chargement de l'autre utilisateur:", error);
        });
        setSelectedPartyUserIds([]);
      }
    }
  }, [bailId, open, session?.user, selectedPartyId]);

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
  }, [bailId, open, loadMessages]);

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

  const onSubmitMessage = async (data: MessageFormData) => {
    // Le notaire doit avoir sélectionné une partie spécifique pour envoyer un message
    if (!selectedPartyId || selectedPartyId === "all") {
      toast.error("Destinataire requis", {
        description: "Veuillez sélectionner un propriétaire ou locataire pour envoyer un message",
      });
      return;
    }
    
    const recipientPartyId = selectedPartyId;
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
      recipientPartyId,
      createdAt: new Date(),
      sender: {
        id: session?.user?.id,
        name: session?.user?.name,
        email: session?.user?.email,
        role: Role.NOTAIRE,
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
        // Envoyer avec fichiers
        const formData = new FormData();
        filesToSend.forEach((file) => {
          formData.append("files", file);
        });
        if (messageContent) {
          formData.append("content", messageContent);
        }
        if (recipientPartyId) {
          formData.append("recipientPartyId", recipientPartyId);
        }
        
        const sentMessage = await sendBailMessageWithFile(bailId, formData, recipientPartyId);
        
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
        const sentMessage = await sendBailMessage(bailId, messageContent, recipientPartyId);
        
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
        throw new Error("Veuillez saisir un message ou sélectionner un fichier");
      }
      
      resetMessage();
      // Le message sera remplacé par le vrai message via Pusher
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

  const onSubmitRequest = async (data: RequestFormData) => {
    if (!selectedPartyId) {
      toast.error("Erreur", {
        description: "Veuillez sélectionner un destinataire",
      });
      return;
    }
    
    const tempId = `temp-request-${Date.now()}-${Math.random()}`;
    
    // Créer une demande optimiste immédiatement
    const optimisticRequest: any = {
      id: tempId,
      dossierId,
      title: data.title,
      content: data.content,
      targetProprietaire: data.targetProprietaire,
      targetLocataire: data.targetLocataire,
      targetPartyIds: data.targetPartyIds || [],
      status: "PENDING",
      createdAt: new Date(),
      createdById: session?.user?.id,
      createdBy: {
        id: session?.user?.id,
        name: session?.user?.name,
        email: session?.user?.email,
      },
      documents: [],
    };

    // Ajouter la demande optimiste immédiatement
    setRequests(prev => [optimisticRequest, ...prev].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    setOptimisticRequests(prev => {
      const newMap = new Map(prev);
      newMap.set(tempId, { tempId, status: 'sending' });
      return newMap;
    });

    try {
      setSending(true);
      
      const newRequest = await createNotaireRequest({
        dossierId,
        ...data,
      });
      
      // Mettre à jour la demande optimiste avec le vrai ID
      setOptimisticRequests(prev => {
        const newMap = new Map(prev);
        const entry = newMap.get(tempId);
        if (entry) {
          newMap.set(tempId, { ...entry, realId: newRequest.id, status: 'sent' });
        }
        return newMap;
      });
      
      resetRequest();
      setIsRequestDialogOpen(false);
      // La demande sera remplacée par la vraie demande via Pusher
    } catch (error: any) {
      // Retirer la demande optimiste en cas d'erreur
      setRequests(prev => prev.filter(r => r.id !== tempId));
      setOptimisticRequests(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      
      toast.error("Erreur", {
        description: error.message || "Impossible de créer la demande",
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const currentUserId = session?.user?.id;
  const isNotaire = userRole === Role.NOTAIRE;

  // Mémoriser les propriétaires et locataires
  const proprietaires = useMemo(() => 
    bailParties.filter((p) => p.profilType === "PROPRIETAIRE"), 
    [bailParties]
  );
  const locataires = useMemo(() => 
    bailParties.filter((p) => p.profilType === "LOCATAIRE"), 
    [bailParties]
  );

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

  // Trouver la partie sélectionnée pour pré-remplir le formulaire de demande
  const selectedParty = selectedPartyId ? bailParties.find((p) => p.id === selectedPartyId) : null;
  const isProprietaireSelected = selectedParty?.profilType === "PROPRIETAIRE";
  const isLocataireSelected = selectedParty?.profilType === "LOCATAIRE";

  // Pré-remplir le formulaire de demande quand le dialog s'ouvre avec une partie sélectionnée
  useEffect(() => {
    if (isRequestDialogOpen && selectedPartyId && selectedParty) {
      setValue("targetProprietaire", isProprietaireSelected);
      setValue("targetLocataire", isLocataireSelected);
      setValue("targetPartyIds", [selectedPartyId]);
    }
  }, [isRequestDialogOpen, selectedPartyId, selectedParty, isProprietaireSelected, isLocataireSelected, setValue]);

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

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <MessageSquare className="mr-2 h-4 w-4" />
      Discussion
    </Button>
  );

  return (
    <ChatDock
      open={open}
      onOpenChange={setOpen}
      /* Ne pas afficher le trigger si le composant est contrôlé depuis l'extérieur */
      trigger={controlledOpen === undefined ? trigger || defaultTrigger : undefined}
      label={
        otherUser
          ? `Discussion avec ${otherUser.partyName || otherUser.name || otherUser.email}`
          : "Discussion avec les clients"
      }
    >

        <ChatPanel
          interlocutor={{
            name: otherUser
              ? otherUser.partyName || otherUser.name || otherUser.email || "Utilisateur"
              : "Discussion avec les clients",
            role: otherUser?.role === Role.NOTAIRE ? "notaire" : "client",
            badge: otherUser?.profilType || undefined,
            online: isOtherUserOnline && !!otherUser?.id,
            typing: isOtherUserTyping,
            subtitle: otherUser?.profilType
              ? `Communiquez avec le ${otherUser.profilType.toLowerCase()}`
              : "Communiquez avec les parties du bail et créez des demandes",
          }}
          items={toTimeline(allItems, {
            currentUserId,
            // Le notaire ne dépose pas de réponse : il suit le statut.
            canRespond: false,
            showTargets: true,
            optimisticMessages,
            optimisticRequests,
          })}
          loading={initialLoading}
          refreshing={refreshing && messages.length > 0}
          emptyTitle="Aucun message pour le moment"
          emptyHint="Commencez la conversation !"
          composer={{
            value: watchMessage("content") || "",
            onChange: (value) => setValueMessage("content", value),
            // Entrée va à la ligne : l'envoi se fait uniquement par le bouton.
            enterToSend: false,
            onSubmit: () => {
              if (sending || uploading) return;
              if (!watchMessage("content")?.trim() && selectedFiles.length === 0) return;
              handleSubmitMessage(onSubmitMessage)();
            },
            actions: [
              {
                id: "request",
                label: "Demande de document",
                icon: FileText,
                onSelect: () => {
                  if (!selectedPartyId || selectedPartyId === "all") {
                    toast.error("Destinataire requis", {
                      description:
                        "Veuillez sélectionner un propriétaire ou locataire pour créer une demande",
                    });
                    return;
                  }
                  setIsRequestDialogOpen(true);
                },
              },
              {
                id: "attach",
                label: "Ajouter photo / fichiers",
                icon: Paperclip,
                onSelect: () => fileInputRef.current?.click(),
              },
            ],
            files: selectedFiles.map((file) => ({ name: file.name, size: file.size })),
            onRemoveFile: removeFile,
            sending: sending || uploading,
            placeholder: "Tapez votre message...",
            error: messageErrors.content?.message,
            onTyping: () => {
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
            },
          }}
          onOpenAttachment={async (attachment) => {
            const signedUrl = await getSignedUrlForDownload(attachment.fileKey || "");
            window.open(signedUrl, "_blank", "noopener,noreferrer");
          }}
          onDownloadAttachment={(attachment) =>
            handleDownloadDocument(attachment.fileKey || "", attachment.name)
          }
          onAddAttachmentToBail={
            isNotaire
              ? async (attachment) => {
                  try {
                    await addChatDocumentToBail(bailId, attachment.id);
                    toast.success("Document ajouté aux pièces annexes du bail");
                    // Pas besoin de recharger - le document est déjà dans le message
                  } catch (error: any) {
                    toast.error("Erreur", {
                      description: error.message || "Impossible d'ajouter le document",
                    });
                  }
                }
              : undefined
          }
          onDeleteMessage={setMessageToDelete}
          renderRequestFooter={
            isNotaire
              ? (request) => (
                  <NotaireRequestControls
                    requestId={request.id}
                    currentStatus={request.status}
                    onDelete={() => setRequestToDelete(request.id)}
                  />
                )
              : undefined
          }
          onClose={() => setOpen(false)}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          disabled={sending || uploading}
          className="hidden"
          multiple
        />

        {/* Dialog pour créer une demande (ouvert depuis la barre d'écriture) */}
        {isNotaire && (
          <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-[17px] font-semibold tracking-tight">
                  Créer une demande de document
                </DialogTitle>
                <DialogDescription className="text-[12.5px]">
                  {selectedParty && otherUser?.partyName
                    ? `Demander un document à ${otherUser.partyName} (${otherUser.profilType})`
                    : "Demander des documents aux parties du dossier"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitRequest(onSubmitRequest)} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="title"
                    className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400"
                  >
                    Nom du document *
                  </label>
                  <input
                    id="title"
                    placeholder="Ex. Pièce d'identité"
                    {...registerRequest("title")}
                    className="w-full rounded-xl bg-slate-50 px-3.5 py-2.5 text-base text-slate-800 outline-none ring-1 ring-slate-200/80 transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-[#4373f5]/40"
                  />
                  {requestErrors.title && (
                    <p className="text-[12px] font-medium text-red-600">
                      {requestErrors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="content"
                    className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400"
                  >
                    Contenu de la demande *
                  </label>
                  <textarea
                    id="content"
                    rows={5}
                    placeholder="Décrivez en détail ce que vous demandez..."
                    {...registerRequest("content")}
                    className="w-full resize-none rounded-xl bg-slate-50 px-3.5 py-2.5 text-base leading-relaxed text-slate-800 outline-none ring-1 ring-slate-200/80 transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-[#4373f5]/40"
                  />
                  {requestErrors.content && (
                    <p className="text-[12px] font-medium text-red-600">
                      {requestErrors.content.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Destinataire
                  </p>

                  {/* Si une partie précise est sélectionnée, elle s'impose */}
                  {selectedParty && otherUser ? (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200/80">
                      <User className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-[13px] font-semibold text-slate-800">
                        {otherUser.partyName || otherUser.name}
                      </span>
                      {otherUser.profilType && (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-slate-500 ring-1 ring-slate-200/70">
                          {otherUser.profilType}
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      {proprietaires.length > 0 && (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => setValue("targetProprietaire", !targetProprietaire)}
                            className={cn(
                              "w-full rounded-xl px-3.5 py-2.5 text-left text-[12.5px] font-semibold transition-colors",
                              targetProprietaire
                                ? "bg-[#4373f5]/10 text-[#3563e9] ring-1 ring-[#4373f5]/30"
                                : "bg-slate-50 text-slate-500 ring-1 ring-slate-200/80 hover:text-slate-800",
                            )}
                          >
                            Propriétaire{proprietaires.length > 1 ? "s" : ""}
                          </button>
                          {targetProprietaire && (
                            <ul className="space-y-0.5 pl-3.5">
                              {proprietaires.map((prop) => (
                                <li key={prop.id} className="text-[12px] text-slate-500">
                                  • {getPartyName(prop)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {locataires.length > 0 && (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => setValue("targetLocataire", !targetLocataire)}
                            className={cn(
                              "w-full rounded-xl px-3.5 py-2.5 text-left text-[12.5px] font-semibold transition-colors",
                              targetLocataire
                                ? "bg-[#4373f5]/10 text-[#3563e9] ring-1 ring-[#4373f5]/30"
                                : "bg-slate-50 text-slate-500 ring-1 ring-slate-200/80 hover:text-slate-800",
                            )}
                          >
                            Locataire{locataires.length > 1 ? "s" : ""}
                          </button>
                          {targetLocataire && (
                            <ul className="space-y-0.5 pl-3.5">
                              {locataires.map((loc) => (
                                <li key={loc.id} className="text-[12px] text-slate-500">
                                  • {getPartyName(loc)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {proprietaires.length === 0 && locataires.length === 0 && (
                        <p className="text-[12.5px] text-slate-500">
                          Aucune partie disponible dans ce dossier
                        </p>
                      )}
                    </>
                  )}

                  {requestErrors.targetProprietaire && !selectedParty && (
                    <p className="text-[12px] font-medium text-red-600">
                      {requestErrors.targetProprietaire.message}
                    </p>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRequestDialogOpen(false);
                      resetRequest();
                    }}
                    disabled={sending}
                    className="rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(53,99,233,0.9)] transition-opacity disabled:opacity-50"
                  >
                    {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Créer la demande
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog de confirmation de suppression */}
        <ConfirmDialog
          open={messageToDelete !== null}
          onOpenChange={(value) => !value && setMessageToDelete(null)}
          title="Supprimer le message"
          description="Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible."
          warning={
            messages.find((m) => m.id === messageToDelete)?.document
              ? "Le document associé sera également supprimé."
              : undefined
          }
          busy={isDeleting}
          confirmLabel={isDeleting ? "Suppression..." : "Supprimer"}
          onConfirm={async () => {
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
        />

        {/* Dialog de confirmation de suppression de demande */}
        <ConfirmDialog
          open={requestToDelete !== null}
          onOpenChange={(value) => !value && setRequestToDelete(null)}
          title="Supprimer la demande"
          description="Êtes-vous sûr de vouloir supprimer cette demande de document ? Cette action est irréversible."
          warning={
            requests.find((r) => r.id === requestToDelete)?.bailMessages &&
            requests.find((r) => r.id === requestToDelete)!.bailMessages.length > 0
              ? `Les documents associés (${requests.find((r) => r.id === requestToDelete)!.bailMessages.length}) seront également supprimés.`
              : undefined
          }
          busy={isDeletingRequest}
          confirmLabel={isDeletingRequest ? "Suppression..." : "Supprimer"}
          onConfirm={async () => {
            if (!requestToDelete) return;
            try {
              setIsDeletingRequest(true);
              await deleteNotaireRequest(requestToDelete);
              toast.success("Demande supprimée");
              setRequestToDelete(null);
              // Recharger les messages pour mettre à jour la liste
              await loadMessages(true);
            } catch (error: any) {
              toast.error("Erreur", {
                description: error.message || "Impossible de supprimer la demande",
              });
            } finally {
              setIsDeletingRequest(false);
            }
          }}
        />
    </ChatDock>
  );
}

/* -------------------------------------------------------------------------
   Le statut d'une demande, côté notaire.

   Repris tel quel du composant d'origine : même appel serveur, même message
   de succès, même remontée d'erreur. Seul l'habillage change.
   ------------------------------------------------------------------------- */

function NotaireRequestControls({
  requestId,
  currentStatus,
  onDelete,
}: {
  requestId: string;
  currentStatus: RequestStatus;
  onDelete: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: RequestStatus) => {
    try {
      setIsUpdating(true);
      await updateNotaireRequestStatus(
        requestId,
        newStatus === "completed"
          ? NotaireRequestStatus.COMPLETED
          : newStatus === "cancelled"
            ? NotaireRequestStatus.CANCELLED
            : NotaireRequestStatus.PENDING,
      );
      toast.success("Statut mis à jour");
      // Pusher mettra à jour automatiquement via request-updated
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de mettre à jour le statut",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <RequestStatusControl
      status={currentStatus}
      onChange={handleStatusChange}
      onDelete={onDelete}
      busy={isUpdating}
    />
  );
}
