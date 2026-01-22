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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InputGroup, InputGroupTextarea, InputGroupButton } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { getPusherClient } from "@/lib/pusher-client";
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

  const {
    register: registerMessage,
    handleSubmit: handleSubmitMessage,
    reset: resetMessage,
    watch: watchMessage,
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
  }, [open, bailId, selectedPartyId, hasScrolledToBottom]);

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
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Ne pas afficher le trigger si le composant est contrôlé depuis l'extérieur */}
      {controlledOpen === undefined && (
        <SheetTrigger asChild>
          {trigger || defaultTrigger}
        </SheetTrigger>
      )}
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
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
                      {otherUser 
                        ? (otherUser.partyName || otherUser.name || otherUser.email || "Utilisateur")
                        : "Discussion avec les clients"}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {otherUser?.profilType && (
                        <Badge variant="outline" className="text-xs">
                          {otherUser.profilType}
                        </Badge>
                      )}
                      {isOtherUserTyping ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <div className="flex gap-1">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                          </div>
                          <span className="text-xs">en train d'écrire...</span>
                        </div>
                      ) : isOtherUserOnline && otherUser?.id ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs">en ligne</span>
                        </div>
                      ) : (
                        <SheetDescription className="text-xs mt-0">
                          {otherUser?.profilType 
                            ? `Communiquez avec le ${otherUser.profilType.toLowerCase()}`
                            : "Communiquez avec les parties du bail et créez des demandes"}
                        </SheetDescription>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Dialog pour créer une demande (ouvert depuis l'InputGroup) */}
            {isNotaire && (
              <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Créer une demande de document</DialogTitle>
                    <DialogDescription>
                      {selectedParty && otherUser?.partyName 
                        ? `Demander un document à ${otherUser.partyName} (${otherUser.profilType})`
                        : "Demander des documents aux parties du dossier"
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitRequest(onSubmitRequest)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Nom du document *</Label>
                      <Input
                        id="title"
                        placeholder="Ex: Piéce d'identiter"
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
                      <Label>Destinataire</Label>
                      
                      {/* Si une partie spécifique est sélectionnée, afficher simplement le destinataire */}
                      {selectedParty && otherUser ? (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{otherUser.partyName || otherUser.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {otherUser.profilType}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Sinon, afficher les options de sélection */}
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
                        </>
                      )}

                      {requestErrors.targetProprietaire && !selectedParty && (
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
                          .map((n: string) => n.charAt(0))
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
                                    <a
                                      href={message.document.fileKey}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm underline hover:no-underline flex-1 truncate"
                                    >
                                      {message.document.label || "Document"}
                                    </a>
                                    <a
                                      href={message.document.fileKey}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 hover:opacity-70 transition-opacity"
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
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
                        
                        // Vérifier si c'est une demande optimiste
                        const optimisticRequestStatus = optimisticRequests.get(request.id);
                        const isRequestOptimistic = optimisticRequestStatus !== undefined;
                        const isRequestSending = optimisticRequestStatus?.status === 'sending';
                        
                        const RequestStatusControl = ({ requestId, currentStatus }: { requestId: string; currentStatus: NotaireRequestStatus }) => {
                          const [isUpdating, setIsUpdating] = useState(false);

                          const handleStatusChange = async (newStatus: NotaireRequestStatus) => {
                            try {
                              setIsUpdating(true);
                              await updateNotaireRequestStatus(requestId, newStatus);
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
                            <div className="flex gap-2 mt-2">
                              <Select
                                value={currentStatus}
                                onValueChange={(value) => handleStatusChange(value as NotaireRequestStatus)}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NotaireRequestStatus.PENDING}>En attente</SelectItem>
                                  <SelectItem value={NotaireRequestStatus.COMPLETED}>Complétée</SelectItem>
                                  <SelectItem value={NotaireRequestStatus.CANCELLED}>Annulée</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        };

                        return (
                          <div key={`request-${request.id}`} className={`flex gap-3 flex-row-reverse ${isRequestSending ? "opacity-70" : ""}`}>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-blue-500 text-white">
                                <Scale className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1 items-end max-w-[75%]">
                              <div className="flex items-center gap-2 px-1">
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(request.createdAt)}
                                </span>
                                <span className="text-xs font-medium text-foreground">
                                  {request.createdById === currentUserId ? "Moi" : (request.createdBy.name || request.createdBy.email)}
                                </span>
                                {isRequestSending && (
                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                )}
                              </div>
                              <Card className={`${
                                  request.status === NotaireRequestStatus.COMPLETED 
                                    ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" 
                                    : request.status === NotaireRequestStatus.CANCELLED
                                      ? "border-gray-200 bg-gray-50/50 dark:bg-gray-950/20"
                                      : "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20"
                                }`}>
                                <CardContent >
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                                  <div className="flex gap-2 mt-2">
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
                                  {/* Contrôle du statut pour le notaire */}
                                  {isNotaire && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <RequestStatusControl requestId={request.id} currentStatus={request.status} />
                                      {/* Bouton de suppression */}
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => setRequestToDelete(request.id)}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Supprimer
                                      </Button>
                                    </div>
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
            <div className="px-4 py-2 border-t bg-muted/50 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
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
          )}

          {/* Formulaire d'envoi de message */}
          <form onSubmit={handleSubmitMessage(onSubmitMessage)} className="border-t p-4">
            <InputGroup className="max-w-none">
              {/* Bouton pour créer une demande de document */}
              <InputGroupButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!selectedPartyId || selectedPartyId === "all") {
                    toast.error("Destinataire requis", {
                      description: "Veuillez sélectionner un propriétaire ou locataire pour créer une demande",
                    });
                    return;
                  }
                  setIsRequestDialogOpen(true);
                }}
                disabled={sending || uploading}
                className="shrink-0"
                title="Créer une demande de document"
              >
                <FileText className="h-4 w-4" />
              </InputGroupButton>
              {/* Bouton pour ajouter un fichier */}
              <InputGroupButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || uploading}
                className="shrink-0"
                title="Joindre un fichier"
              >
                <Paperclip className="h-4 w-4" />
              </InputGroupButton>
              <InputGroupTextarea
                placeholder="Tapez votre message..."
                {...registerMessage("content")}
                disabled={sending || uploading}
                rows={1}
                className="max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!sending && !uploading && (watchMessage("content")?.trim() || selectedFiles.length > 0)) {
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
                      handleSubmitMessage(onSubmitMessage)();
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
                disabled={sending || uploading || (selectedFiles.length === 0 && !watchMessage("content")?.trim())}
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
            {messageErrors.content && (
              <p className="text-sm text-destructive mt-2 px-1">{messageErrors.content.message}</p>
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

        {/* Dialog de confirmation de suppression de demande */}
        <Dialog open={requestToDelete !== null} onOpenChange={(open) => !open && setRequestToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer la demande</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer cette demande de document ? Cette action est irréversible.
                {requests.find(r => r.id === requestToDelete)?.bailMessages && requests.find(r => r.id === requestToDelete)!.bailMessages.length > 0 && (
                  <span className="block mt-2 text-destructive font-medium">
                    Les documents associés ({requests.find(r => r.id === requestToDelete)!.bailMessages.length}) seront également supprimés.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRequestToDelete(null)}
                disabled={isDeletingRequest}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
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
                disabled={isDeletingRequest}
              >
                {isDeletingRequest ? (
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

