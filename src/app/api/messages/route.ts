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
    const roomId = String(body.roomId ?? "");
    const content = String(body.content ?? "").trim();
    const messageType = String(body.messageType ?? "") === "image" ? "image" : "user";
    const proposalId = body.proposalId ? String(body.proposalId) : null;

    if (!roomId || !content) {
      return NextResponse.json({ error: "roomId and content are required" }, { status: 400 });
    }

    const db = getLocalDb();
    const member = db
      .prepare("select id from room_members where room_id = ? and user_id = ?")
      .get(roomId, userId);
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (proposalId) {
      const linkedProposal = db
        .prepare("select id from proposals where id = ? and room_id = ?")
        .get(proposalId, roomId);
      if (!linkedProposal) {
        return NextResponse.json({ error: "Linked proposal is invalid for this room" }, { status: 400 });
      }
    }

    db.prepare(
      "insert into messages (id, room_id, sender_id, content, message_type, proposal_id, created_at) values (?, ?, ?, ?, ?, ?, ?)",
    ).run(randomUUID(), roomId, userId, content, messageType, proposalId, new Date().toISOString());

    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const roomId = String(body.roomId ?? "");
  const content = String(body.content ?? "").trim();
  const messageType = String(body.messageType ?? "") === "image" ? "image" : "user";
  const proposalId = body.proposalId ? String(body.proposalId) : null;

  if (!roomId || !content) {
    return NextResponse.json({ error: "roomId and content are required" }, { status: 400 });
  }

  if (proposalId) {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("id")
      .eq("id", proposalId)
      .eq("room_id", roomId)
      .maybeSingle();
    if (!proposal) {
      return NextResponse.json({ error: "Linked proposal is invalid for this room" }, { status: 400 });
    }
  }

  const { error } = await supabase.from("messages").insert({
    room_id: roomId,
    sender_id: user.id,
    content,
    message_type: messageType,
    proposal_id: proposalId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
