"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";

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
    case "BAIL_STATUS_CHANGED":
      return `Statut du bail changé: ${metadata.oldStatus} → ${metadata.newStatus}`;
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
      // Les commentaires sont sur la page de l'entité concernée
      return null;
    default:
      return null;
  }
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();

  const loadNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getNotifications({ pageSize: 10, unreadOnly: false });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error("Erreur lors du chargement des notifications:", error);
      toast.error("Erreur lors du chargement des notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
    // Recharger toutes les 30 secondes
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

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

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (error) {
      console.error("Erreur lors du marquage des notifications:", error);
      toast.error("Erreur lors du marquage des notifications");
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }
    
    const link = getNotificationLink(notification);
    if (link) {
      setIsOpen(false);
      router.push(link);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4">
              <LoadingScreen 
                message="Chargement..." 
                variant="inline" 
                showLogo={false}
                spinnerSize="sm"
              />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification);
                const message = getNotificationMessage(notification);
                const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                  locale: fr,
                });

                const content = (
                  <div
                    className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                      !notification.isRead ? "bg-blue-50/50" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 h-2 w-2 rounded-full ${
                          !notification.isRead ? "bg-blue-600" : "bg-transparent"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Par {notification.createdBy ? (notification.createdBy.name || notification.createdBy.email) : "via formulaire"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {timeAgo}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                return link ? (
                  <Link key={notification.id} href={link}>
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Link
              href="/interface/notifications"
              className="block text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              Voir toutes les notifications
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

