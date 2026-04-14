"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { withMinDelay } from "@/lib/ui/withMinDelay";

export function LogoutButton() {
  const router = useRouter();
  const isLocal = process.env.NEXT_PUBLIC_USE_LOCAL_DB === "true";
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    if (isLocal) {
      await withMinDelay(fetch("/api/local-auth/logout", { method: "POST" }), 420);
    } else {
      const supabase = createClient();
      await withMinDelay(supabase.auth.signOut(), 420);
    }

    router.push("/auth/login");
    router.refresh();
    setLoading(false);
  }

  return (
    <>
      <LoadingOverlay visible={loading} label="Logging out" />
      <button className="campus-btn-secondary rounded-md px-3 py-2 text-sm" onClick={onLogout} disabled={loading}>
        {loading ? "Logging out..." : "Log out"}
      </button>
    </>
  );
}
