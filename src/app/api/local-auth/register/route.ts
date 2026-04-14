import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getLocalDb } from "@/lib/localdb/db";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const displayName = String(body.displayName ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !displayName || password.length < 6) {
    return NextResponse.json({ error: "Invalid register payload" }, { status: 400 });
  }

  const db = getLocalDb();
  const existed = db.prepare("select id from users where email = ?").get(email);
  if (existed) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare(
    "insert into users (id, email, display_name, password_hash, created_at) values (?, ?, ?, ?, ?)",
  ).run(userId, email, displayName, passwordHash, now);

  const response = NextResponse.json({ ok: true, userId });
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
