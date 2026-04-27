"use client";

import { useMemo, useState } from "react";
import { MarkReadButton } from "@/components/notifications/MarkReadButton";
import { NotificationItem } from "@/components/notifications/NotificationItem";

type NotificationRow = {
  id: string;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  roomId: string | null;
};

type Props = {
  initialNotifications: NotificationRow[];
};

export function NotificationsPanel({ initialNotifications }: Props) {
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  function handleMarkedAllRead() {
    setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));
  }

  function handleMarkedRead(id: string) {
    setNotifications((previous) =>
      previous.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="campus-heading text-2xl font-semibold">Notifications</h1>
        <MarkReadButton onMarkedAllRead={handleMarkedAllRead} autoRefresh={false} />
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
            isRead={item.isRead}
            createdAt={item.createdAt}
            roomId={item.roomId}
            onMarkedRead={handleMarkedRead}
            autoRefresh={false}
          />
        ))}
      </div>
    </>
  );
}
