import { getNotifications, markAllNotificationsAsRead } from "@/lib/actions/notifications";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { Button } from "@/components/ui/button";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; unreadOnly?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const unreadOnly = params.unreadOnly === "true";

  const result = await getNotifications({
    page,
    pageSize: 20,
    unreadOnly,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {result.unreadCount > 0
              ? `${result.unreadCount} notification${result.unreadCount > 1 ? "s" : ""} non lue${result.unreadCount > 1 ? "s" : ""}`
              : "Toutes les notifications sont lues"}
          </p>
        </div>
        {result.unreadCount > 0 && (
          <form action={markAllNotificationsAsRead}>
            <Button type="submit" variant="outline">
              Tout marquer comme lu
            </Button>
          </form>
        )}
      </div>

      <NotificationsList
        initialNotifications={result.notifications}
        initialTotal={result.total}
        initialPage={result.page}
        initialTotalPages={result.totalPages}
        initialUnreadCount={result.unreadCount}
        unreadOnly={unreadOnly}
      />
    </div>
  );
}

