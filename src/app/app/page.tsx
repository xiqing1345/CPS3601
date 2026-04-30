import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/domain/room";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalSessionUser } from "@/lib/localdb/session";
import { getLocalDb } from "@/lib/localdb/db";

type LocalRoomBootstrap = {
  roomId: string;
  roomName: string;
  dormName: string;
  inviteCode: string;
  role: "admin" | "member";
};

async function getBootstrapRoom() {
  const cookieStore = await cookies();
  const value = cookieStore.get("local_room_bootstrap")?.value;
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<LocalRoomBootstrap>;
    if (!parsed.roomId || !parsed.inviteCode || !parsed.role) {
      return null;
    }

    return {
      roomId: parsed.roomId,
      roomName: parsed.roomName ?? "",
      dormName: parsed.dormName ?? "",
      inviteCode: parsed.inviteCode,
      role: parsed.role,
    } satisfies LocalRoomBootstrap;
  } catch {
    return null;
  }
}

export default async function AppEntryPage() {
  if (isLocalMode()) {
    const user = await getLocalSessionUser();
    if (!user) {
      redirect("/auth/login");
    }

    const db = getLocalDb();
    const membership = db
      .prepare("select room_id from room_members where user_id = ? order by joined_at asc limit 1")
      .get(user.id) as { room_id: string } | undefined;

    if (!membership?.room_id) {
      const bootstrapRoom = await getBootstrapRoom();
      if (bootstrapRoom) {
        db.prepare(
          "insert or ignore into rooms (id, room_name, dorm_name, invite_code, created_by, created_at) values (?, ?, ?, ?, ?, ?)",
        ).run(
          bootstrapRoom.roomId,
          bootstrapRoom.roomName,
          bootstrapRoom.dormName,
          bootstrapRoom.inviteCode,
          user.id,
          new Date().toISOString(),
        );

        db.prepare(
          "insert or ignore into room_members (id, room_id, user_id, role, joined_at) values (?, ?, ?, ?, ?)",
        ).run(randomUUID(), bootstrapRoom.roomId, user.id, bootstrapRoom.role, new Date().toISOString());

        redirect(`/app/room/${bootstrapRoom.roomId}/chat`);
      }

      const demoRoom = db
        .prepare("select id from rooms where invite_code = ?")
        .get("DORM42") as { id: string } | undefined;

      if (demoRoom?.id) {
        db.prepare(
          "insert or ignore into room_members (id, room_id, user_id, role, joined_at) values (?, ?, ?, ?, ?)",
        ).run(randomUUID(), demoRoom.id, user.id, "member", new Date().toISOString());

        redirect(`/app/room/${demoRoom.id}/chat`);
      }

      redirect("/onboarding");
    }

    redirect(`/app/room/${membership.room_id}/chat`);
  }

  const { supabase, user } = await requireUser();

  const { data: membership } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.room_id) {
    redirect("/onboarding");
  }

  redirect(`/app/room/${membership.room_id}/chat`);
}
