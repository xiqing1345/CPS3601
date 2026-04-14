import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalSessionUser } from "@/lib/localdb/session";
import { getLocalDb } from "@/lib/localdb/db";
import { AppTopBar } from "@/components/navigation/AppTopBar";
import { AIAssistantPanel } from "@/components/ai/AIAssistantPanel";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isLocalMode()) {
    const user = await getLocalSessionUser();
    if (!user) {
      redirect("/auth/login");
    }

    const db = getLocalDb();
    const unreadRow = db
      .prepare("select count(*) as count from notifications where user_id = ? and is_read = 0")
      .get(user.id) as { count: number };

    return (
      <div className="relative min-h-screen">
        <AppTopBar
          unreadCount={unreadRow.count ?? 0}
          userId={user.id}
          email={user.email}
          displayName={user.display_name}
        />
        {children}
        <AIAssistantPanel />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ data: profile }, unreadResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  return (
    <div className="relative min-h-screen">
      <AppTopBar
        unreadCount={unreadResult.count ?? 0}
        userId={user.id}
        email={user.email ?? ""}
        displayName={profile?.display_name ?? user.user_metadata?.display_name ?? "Student"}
      />
      {children}
      <AIAssistantPanel />
    </div>
  );
}