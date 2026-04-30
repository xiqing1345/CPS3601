import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getLocalDb } from "@/lib/localdb/db";

function guessDisplayName(email: string) {
  const local = email.split("@")[0] ?? "student";
  const cleaned = local.replace(/[^a-zA-Z0-9]+/g, " ").trim() || "student";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const db = getLocalDb();
  const user = db
    .prepare("select id, email, password_hash from users where email = ?")
    .get(email) as { id: string; email: string; password_hash: string } | undefined;

  let resolvedUser = user;
  if (!resolvedUser && process.env.VERCEL === "1") {
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare(
      "insert into users (id, email, display_name, password_hash, created_at) values (?, ?, ?, ?, ?)",
    ).run(userId, email, guessDisplayName(email), passwordHash, new Date().toISOString());

    resolvedUser = {
      id: userId,
      email,
      password_hash: passwordHash,
    };
  }

  if (!resolvedUser) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const passOk = await bcrypt.compare(password, resolvedUser.password_hash);
  if (!passOk) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, userId: resolvedUser.id });
  response.cookies.set("local_user_id", resolvedUser.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.set("local_user_email", resolvedUser.email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
