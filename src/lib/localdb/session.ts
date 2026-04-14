import { cookies } from "next/headers";
import { getLocalDb } from "@/lib/localdb/db";

export async function getLocalSessionUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("local_user_id")?.value;
  if (!userId) return null;

  const db = getLocalDb();
  const user = db
    .prepare("select id, email, display_name from users where id = ?")
    .get(userId) as { id: string; email: string; display_name: string } | undefined;

  return user ?? null;
}
