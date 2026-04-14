import { cookies } from "next/headers";
import { getLocalDb } from "@/lib/localdb/db";

type LocalSessionUser = { id: string; email: string; display_name: string };

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

    if (byEmail) {
      return byEmail;
    }
  }

  if (!userId) {
    return null;
  }

  const byId = db
    .prepare("select id, email, display_name from users where id = ?")
    .get(userId) as LocalSessionUser | undefined;

  return byId ?? null;
}
