import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalDb } from "@/lib/localdb/db";
import { getLocalSessionUser } from "@/lib/localdb/session";

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(request: Request) {
  if (isLocalMode()) {
    const localUser = await getLocalSessionUser();
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = localUser.id;

    const body = await request.json();
    const roomName = String(body.roomName ?? "").trim();
    const dormName = String(body.dormName ?? "").trim();

    if (!roomName || !dormName) {
      return NextResponse.json({ error: "roomName and dormName are required" }, { status: 400 });
    }

    const db = getLocalDb();
    const inviteCode = makeInviteCode();
    const roomId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      "insert into rooms (id, room_name, dorm_name, invite_code, created_by, created_at) values (?, ?, ?, ?, ?, ?)",
    ).run(roomId, roomName, dormName, inviteCode, userId, now);

    db.prepare(
      "insert or ignore into room_members (id, room_id, user_id, role, joined_at) values (?, ?, ?, ?, ?)",
    ).run(randomUUID(), roomId, userId, "admin", now);

    return NextResponse.json({ roomId, inviteCode });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const roomName = String(body.roomName ?? "").trim();
  const dormName = String(body.dormName ?? "").trim();

  if (!roomName || !dormName) {
    return NextResponse.json({ error: "roomName and dormName are required" }, { status: 400 });
  }

  const inviteCode = makeInviteCode();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({ room_name: roomName, dorm_name: dormName, invite_code: inviteCode, created_by: user.id })
    .select("id")
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: roomError?.message ?? "Could not create room" }, { status: 400 });
  }

  const { error: memberError } = await supabase
    .from("room_members")
    .insert({ room_id: room.id, user_id: user.id, role: "admin" });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({ roomId: room.id, inviteCode });
}
