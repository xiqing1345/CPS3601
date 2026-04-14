import { createClient } from "@/lib/supabase/server";
import { MarkReadButton } from "@/components/notifications/MarkReadButton";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalSessionUser } from "@/lib/localdb/session";
import { getLocalDb } from "@/lib/localdb/db";

export default async function NotificationsPage() {
  if (isLocalMode()) {
    const user = await getLocalSessionUser();
    const db = getLocalDb();
    const notifications = user
      ? (db
          .prepare(
            "select id, type, content, is_read, created_at, room_id from notifications where user_id = ? order by created_at desc limit 80",
          )
          .all(user.id) as Array<{
            id: string;
            type: string;
            content: string;
            is_read: number;
            created_at: string;
            room_id: string | null;
          }>)
      : [];

    const unreadCount = notifications.filter((n) => n.is_read === 0).length;

    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="campus-heading text-2xl font-semibold">Notifications</h1>
          <MarkReadButton />
        </div>

        {unreadCount > 0 && (
          <div className="campus-badge mt-4 rounded-lg px-4 py-3 text-sm">
            You have {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}.
          </div>
        )}

        <div className="mt-6 space-y-3">
          {notifications.map((item) => (
            <NotificationItem
              key={item.id}
              id={item.id}
              type={item.type}
              content={item.content}
              isRead={item.is_read === 1}
              createdAt={item.created_at}
              roomId={item.room_id}
            />
          ))}
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id,type,content,is_read,created_at,room_id")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(80);

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="campus-heading text-2xl font-semibold">Notifications</h1>
        <MarkReadButton />
      </div>

      {unreadCount > 0 && (
        <div className="campus-badge mt-4 rounded-lg px-4 py-3 text-sm">
          You have {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {(notifications ?? []).map((item) => (
          <NotificationItem
            key={item.id}
            id={item.id}
            type={item.type}
            content={item.content}
            isRead={item.is_read}
            createdAt={item.created_at}
            roomId={item.room_id}
          />
        ))}
      </div>
    </main>
  );
}
