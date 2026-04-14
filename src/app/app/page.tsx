import { redirect } from "next/navigation";
import { requireUser } from "@/lib/domain/room";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalSessionUser } from "@/lib/localdb/session";
import { getLocalDb } from "@/lib/localdb/db";

export default async function AppEntryPage() {
  if (isLocalMode()) {
    const user = await getLocalSessionUser();
    if (!user) {
      redirect("/auth/login");
    }

    const db = getLocalDb();
    const membership = db
      .prepare("select room_id from room_members where user_id = ? order by joined_at asc limit 1")
      .get(user.id) as { room_id: string } | undefined;

    if (!membership?.room_id) {
      redirect("/onboarding");
    }

    redirect(`/app/room/${membership.room_id}/chat`);
  }

  const { supabase, user } = await requireUser();

  const { data: membership } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.room_id) {
    redirect("/onboarding");
  }

  redirect(`/app/room/${membership.room_id}/chat`);
}
