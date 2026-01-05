"use client";

import * as React from "react";
import { getNotifications, markNotificationAsRead } from "@/lib/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { BailStatus } from "@prisma/client";

interface Notification {
  id: string;
  type: string;
  isRead: boolean;
  targetType: string | null;
  targetId: string | null;
  metadata: any;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

function getNotificationMessage(notification: Notification): string {
  const metadata = notification.metadata || {};
  
  switch (notification.type) {
    case "COMMENT_CREATED": {
      const entityType = metadata.entityType || "élément";
      const entityName = metadata.entityName || "cet élément";
      return `Nouveau commentaire sur le ${entityType}: ${entityName}`;
    }
    case "CLIENT_CREATED":
      return metadata.createdByForm 
        ? "Nouveau client créé via formulaire" 
        : "Nouveau client créé";
    case "CLIENT_UPDATED":
      return "Client modifié";
    case "CLIENT_DELETED":
      return "Client supprimé";
    case "PROPERTY_CREATED":
      return metadata.createdByForm 
        ? "Nouveau bien créé via formulaire" 
        : "Nouveau bien créé";
    case "PROPERTY_UPDATED":
      return "Bien modifié";
    case "PROPERTY_DELETED":
      return "Bien supprimé";
    case "BAIL_CREATED":
      return metadata.createdByForm 
        ? "Nouveau bail créé via formulaire" 
        : "Nouveau bail créé";
    case "BAIL_UPDATED":
      return "Bail modifié";
    case "BAIL_DELETED":
      return "Bail supprimé";
      case "BAIL_STATUS_CHANGED": {
        if (metadata.oldStatus === BailStatus.DRAFT && metadata.newStatus === BailStatus.PENDING_VALIDATION) {
          return "Bail en attente de validation par bailnotarie";
        }
        if (metadata.oldStatus === BailStatus.PENDING_VALIDATION && metadata.newStatus === BailStatus.READY_FOR_NOTARY) {
          return "Bail prêt a être assigné au notaire";
        }
        if (metadata.oldStatus === BailStatus.READY_FOR_NOTARY && metadata.newStatus === BailStatus.SIGNED) {
          return "Bail signé";
        }
        if (metadata.oldStatus === BailStatus.SIGNED && metadata.newStatus === BailStatus.TERMINATED) {
          return "Bail terminé";
        }
        if (metadata.oldStatus === BailStatus.TERMINATED && metadata.newStatus === BailStatus.DRAFT) {
          return "Bail réinitialisé";
        }
        return "Statut du bail modifié";
      }
    case "INTAKE_SUBMITTED":
      return `Formulaire ${metadata.intakeTarget === "OWNER" ? "propriétaire" : "locataire"} soumis`;
    case "INTAKE_REVOKED":
      return "Lien d'intake révoqué";
    case "COMPLETION_STATUS_CHANGED": {
      const entityType = metadata.entityType === "CLIENT" ? "client" : "bien";
      return `Statut de complétion du ${entityType} changé: ${metadata.oldStatus} → ${metadata.newStatus}`;
    }
    case "LEAD_CREATED":
      return "Nouveau lead créé";
    case "LEAD_CONVERTED":
      return `Lead converti en ${metadata.newProfilType === "PROPRIETAIRE" ? "propriétaire" : "locataire"}`;
    default:
      return "Nouvelle notification";
  }
}

function getNotificationLink(notification: Notification): string | null {
  if (!notification.targetType || !notification.targetId) {
    return null;
  }

  switch (notification.targetType) {
    case "CLIENT":
      return `/interface/clients/${notification.targetId}`;
    case "PROPERTY":
      return `/interface/properties/${notification.targetId}`;
    case "BAIL":
      return `/interface/baux/${notification.targetId}`;
    case "INTAKE":
      return `/interface/intakes`;
    case "COMMENT":
      return null;
    default:
      return null;
  }
}

interface NotificationsListProps {
  initialNotifications: Notification[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  initialUnreadCount: number;
  unreadOnly: boolean;
}

export function NotificationsList({
  initialNotifications,
  initialTotal,
  initialPage,
  initialTotalPages,
  initialUnreadCount,
  unreadOnly,
}: NotificationsListProps) {
  const [notifications, setNotifications] = React.useState(initialNotifications);
  const [page, setPage] = React.useState(initialPage);
  const [totalPages, setTotalPages] = React.useState(initialTotalPages);
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const loadNotifications = async (newPage: number) => {
    setIsLoading(true);
    try {
      const result = await getNotifications({
        page: newPage,
        pageSize: 20,
        unreadOnly,
      });
      setNotifications(result.notifications);
      setTotalPages(result.totalPages);
      setUnreadCount(result.unreadCount);
      setPage(newPage);
    } catch (error) {
      console.error("Erreur lors du chargement des notifications:", error);
      toast.error("Erreur lors du chargement des notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erreur lors du marquage de la notification:", error);
      toast.error("Erreur lors du marquage de la notification");
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }
    
    const link = getNotificationLink(notification);
    if (link) {
      router.push(link);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {unreadOnly ? "Aucune notification non lue" : "Aucune notification"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {notifications.map((notification) => {
          const link = getNotificationLink(notification);
          const message = getNotificationMessage(notification);
          const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
            locale: fr,
          });

          const content = (
            <div
              className={`p-4 border rounded-lg hover:bg-accent transition-colors ${
                !notification.isRead ? "bg-blue-50/50 border-blue-200" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {!notification.isRead && (
                      <Badge variant="default" className="text-xs">
                        Non lu
                      </Badge>
                    )}
                    <p className="font-medium">{message}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Par {notification.createdBy ? (notification.createdBy.name || notification.createdBy.email) : "via formulaire"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{timeAgo}</p>
                </div>
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );

          return link ? (
            <Link
              key={notification.id}
              href={link}
              onClick={() => handleNotificationClick(notification)}
            >
              {content}
            </Link>
          ) : (
            <div key={notification.id} onClick={() => handleNotificationClick(notification)}>
              {content}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => loadNotifications(page - 1)}
            disabled={page === 1 || isLoading}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => loadNotifications(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}

