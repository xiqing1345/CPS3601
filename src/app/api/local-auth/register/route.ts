import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getLocalDb } from "@/lib/localdb/db";

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const displayName = String(body.displayName ?? "").trim();
  const password = String(body.password ?? "");
  const hasInviteCode = Boolean(body.hasInviteCode);
  const inviteCode = String(body.inviteCode ?? "").trim().toUpperCase();
  const roomNumber = String(body.roomNumber ?? "").trim();

  if (!email || !displayName || password.length < 6) {
    return NextResponse.json({ error: "Invalid register payload" }, { status: 400 });
  }

  if (hasInviteCode && !inviteCode) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  if (!hasInviteCode && !roomNumber) {
    return NextResponse.json({ error: "Room number is required" }, { status: 400 });
  }

  const db = getLocalDb();
  const existed = db.prepare("select id from users where email = ?").get(email);
  if (existed) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }

  const invitedRoom = hasInviteCode
    ? (db.prepare("select id from rooms where invite_code = ?").get(inviteCode) as { id: string } | undefined)
    : undefined;
  if (hasInviteCode && !invitedRoom?.id) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare(
    "insert into users (id, email, display_name, password_hash, created_at) values (?, ?, ?, ?, ?)",
  ).run(userId, email, displayName, passwordHash, now);

  let roomId: string | null = null;
  if (hasInviteCode) {
    roomId = invitedRoom?.id ?? null;
    db.prepare(
      "insert or ignore into room_members (id, room_id, user_id, role, joined_at) values (?, ?, ?, ?, ?)",
    ).run(randomUUID(), roomId, userId, "member", now);
  } else {
    let generatedCode = makeInviteCode();
    for (let i = 0; i < 5; i += 1) {
      const existedCode = db
        .prepare("select id from rooms where invite_code = ?")
        .get(generatedCode) as { id: string } | undefined;
      if (!existedCode) {
        break;
      }
      generatedCode = makeInviteCode();
    }

    roomId = randomUUID();
    db.prepare(
      "insert into rooms (id, room_name, dorm_name, invite_code, created_by, created_at) values (?, ?, ?, ?, ?, ?)",
    ).run(roomId, roomNumber, "", generatedCode, userId, now);

    db.prepare(
      "insert into room_members (id, room_id, user_id, role, joined_at) values (?, ?, ?, ?, ?)",
    ).run(randomUUID(), roomId, userId, "admin", now);
  }

  const response = NextResponse.json({ ok: true, userId, roomId });
  response.cookies.set("local_user_id", userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.set("local_user_email", email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
