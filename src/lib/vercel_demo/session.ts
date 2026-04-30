import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getLocalDb } from "@/lib/vercel_demo/db";

type LocalSessionUser = { id: string; email: string; display_name: string };

function guessDisplayName(email: string) {
  const local = email.split("@")[0] ?? "student";
  const cleaned = local.replace(/[^a-zA-Z0-9]+/g, " ").trim() || "student";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getLocalSessionUser() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get("local_user_email")?.value?.trim().toLowerCase();
  const userId = cookieStore.get("local_user_id")?.value;
  if (!userEmail && !userId) return null;

  const db = getLocalDb();
  if (userEmail) {
    const byEmail = db
      .prepare("select id, email, display_name from users where email = ?")
      .get(userEmail) as LocalSessionUser | undefined;
    if (byEmail) return byEmail;
  }

  if (!userId) return null;

  const byId = db
    .prepare("select id, email, display_name from users where id = ?")
    .get(userId) as LocalSessionUser | undefined;

  if (byId) return byId;

  if (process.env.VERCEL === "1" && userEmail) {
    const recoveredUser: LocalSessionUser = {
      id: userId ?? randomUUID(),
      email: userEmail,
      display_name: guessDisplayName(userEmail),
    };

    db.prepare(
      "insert or ignore into users (id, email, display_name, password_hash, created_at) values (?, ?, ?, ?, ?)",
    ).run(recoveredUser.id, recoveredUser.email, recoveredUser.display_name, "vercel-demo-cookie-session", new Date().toISOString());

    const recreated = db
      .prepare("select id, email, display_name from users where email = ?")
      .get(userEmail) as LocalSessionUser | undefined;

    return recreated ?? recoveredUser;
  }

  return null;
}
