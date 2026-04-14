import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalDb } from "@/lib/localdb/db";

export async function GET() {
  if (isLocalMode()) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("local_user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getLocalDb();
    const user = db
      .prepare("select id, email, display_name from users where id = ?")
      .get(userId) as { id: string; email: string; display_name: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    displayName: profile?.display_name ?? user.user_metadata?.display_name ?? "Student",
  });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const displayName = String(body.displayName ?? "").trim();

  if (!displayName || displayName.length > 60) {
    return NextResponse.json({ error: "Display name must be 1-60 characters" }, { status: 400 });
  }

  if (isLocalMode()) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("local_user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getLocalDb();
    db.prepare("update users set display_name = ? where id = ?").run(displayName, userId);

    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  return NextResponse.json({ ok: true });
}
