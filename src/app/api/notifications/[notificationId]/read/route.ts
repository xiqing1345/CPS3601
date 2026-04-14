import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalDb } from "@/lib/localdb/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const { notificationId } = await params;

  if (isLocalMode()) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("local_user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getLocalDb();
    db.prepare("update notifications set is_read = 1 where id = ? and user_id = ?").run(notificationId, userId);
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
