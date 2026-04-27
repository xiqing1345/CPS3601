import { createClient } from "@/lib/supabase/server";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
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

    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
        <NotificationsPanel
          initialNotifications={notifications.map((item) => ({
            id: item.id,
            type: item.type,
            content: item.content,
            isRead: item.is_read === 1,
            createdAt: item.created_at,
            roomId: item.room_id,
          }))}
        />
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
      <NotificationsPanel
        initialNotifications={(notifications ?? []).map((item) => ({
          id: item.id,
          type: item.type,
          content: item.content,
          isRead: item.is_read,
          createdAt: item.created_at,
          roomId: item.room_id,
        }))}
      />
    </main>
  );
}
