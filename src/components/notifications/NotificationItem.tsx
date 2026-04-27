"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { withMinDelay } from "@/lib/ui/withMinDelay";

type Props = {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  roomId: string | null;
  isRead: boolean;
  onMarkedRead?: (id: string) => void;
  autoRefresh?: boolean;
};

export function NotificationItem({ id, type, content, createdAt, roomId, isRead, onMarkedRead, autoRefresh = true }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [read, setRead] = useState(isRead);

  async function markOneRead() {
    if (read || busy) return;

    setBusy(true);
    const res = await withMinDelay(fetch(`/api/notifications/${id}/read`, { method: "POST" }), 320);
    setBusy(false);

    if (!res.ok) {
      return;
    }

    setRead(true);
    onMarkedRead?.(id);
    if (autoRefresh) {
      router.refresh();
    }
  }

  return (
    <article className="campus-card rounded-lg p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{type}</p>
      <button
        className="mt-1 block w-full text-left text-sm text-slate-900 hover:underline disabled:opacity-60"
        onClick={markOneRead}
        disabled={busy}
        type="button"
      >
        {content}
      </button>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{new Date(createdAt).toLocaleString()}</span>
        <span>{read ? "read" : "unread"}</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        {!read && (
          <button className="text-slate-700 underline" onClick={markOneRead} disabled={busy} type="button">
            {busy ? "Updating..." : "Mark this as read"}
          </button>
        )}
        {roomId && (
          <Link className="text-sky-800 underline" href={`/app/room/${roomId}/chat`} onClick={markOneRead}>
            Open room
          </Link>
        )}
      </div>
    </article>
  );
}
