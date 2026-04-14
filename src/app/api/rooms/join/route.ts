import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalDb } from "@/lib/localdb/db";
import { getLocalSessionUser } from "@/lib/localdb/session";

export async function POST(request: Request) {
  if (isLocalMode()) {
    const localUser = await getLocalSessionUser();
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = localUser.id;

    const body = await request.json();
    const inviteCode = String(body.inviteCode ?? "").trim().toUpperCase();

    if (!inviteCode) {
      return NextResponse.json({ error: "inviteCode is required" }, { status: 400 });
    }

    const db = getLocalDb();
    const room = db.prepare("select id from rooms where invite_code = ?").get(inviteCode) as { id: string } | undefined;
    if (!room) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    db.prepare(
      "insert or ignore into room_members (id, room_id, user_id, role, joined_at) values (?, ?, ?, ?, ?)",
    ).run(randomUUID(), room.id, userId, "member", new Date().toISOString());

    return NextResponse.json({ roomId: room.id });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const inviteCode = String(body.inviteCode ?? "").trim().toUpperCase();

  if (!inviteCode) {
    return NextResponse.json({ error: "inviteCode is required" }, { status: 400 });
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (roomError || !room) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const { error: memberError } = await supabase
    .from("room_members")
    .upsert({ room_id: room.id, user_id: user.id, role: "member" }, { onConflict: "room_id,user_id" });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({ roomId: room.id });
}
