"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { withMinDelay } from "@/lib/ui/withMinDelay";

type Props = {
  onMarkedAllRead?: () => void;
  autoRefresh?: boolean;
};

export function MarkReadButton({ onMarkedAllRead, autoRefresh = true }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const res = await withMinDelay(fetch("/api/notifications/read", { method: "POST" }), 450);
    setLoading(false);

    if (!res.ok) {
      return;
    }

    onMarkedAllRead?.();
    if (autoRefresh) {
      router.refresh();
    }
  }

  return (
    <>
      <LoadingOverlay visible={loading} label="Updating notifications" />
      <button className="campus-btn-primary rounded-md px-3 py-2 text-sm" onClick={onClick} disabled={loading}>
        {loading ? "Updating..." : "Mark all as read"}
      </button>
    </>
  );
}
