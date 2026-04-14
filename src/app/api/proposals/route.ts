import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/types/domain";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalDb } from "@/lib/localdb/db";

export async function POST(request: Request) {
  if (isLocalMode()) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("local_user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const roomId = String(body.roomId ?? "");
    const category = String(body.category ?? "");
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const fullDetails = String(body.fullDetails ?? "").trim();

    if (!roomId || !title || !description || !fullDetails || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return NextResponse.json({ error: "Invalid proposal payload" }, { status: 400 });
    }

    const db = getLocalDb();
    const member = db
      .prepare("select id from room_members where room_id = ? and user_id = ?")
      .get(roomId, userId);

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const proposalId = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      "insert into proposals (id, room_id, proposer_id, category, title, description, full_details, status, approval_rule, created_at, activated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(proposalId, roomId, userId, category, title, description, fullDetails, "pending", "all_members", now, null);

    db.prepare(
      "insert into proposal_votes (id, proposal_id, voter_id, vote_type, comment, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
    ).run(randomUUID(), proposalId, userId, "approve", null, now, now);

    db.prepare(
      "insert into messages (id, room_id, sender_id, content, message_type, proposal_id, created_at) values (?, ?, ?, ?, ?, ?, ?)",
    ).run(randomUUID(), roomId, userId, `New proposal created: ${title}`, "proposal_ref", proposalId, now);

    return NextResponse.json({ proposalId });
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
  const category = String(body.category ?? "");
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const fullDetails = String(body.fullDetails ?? "").trim();

  if (!roomId || !title || !description || !fullDetails || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "Invalid proposal payload" }, { status: 400 });
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .insert({
      room_id: roomId,
      proposer_id: user.id,
      category,
      title,
      description,
      full_details: fullDetails,
      status: "pending",
    })
    .select("id")
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: proposalError?.message ?? "Could not create proposal" }, { status: 400 });
  }

  await supabase.from("proposal_votes").insert({
    proposal_id: proposal.id,
    voter_id: user.id,
    vote_type: "approve",
  });

  await supabase.from("messages").insert({
    room_id: roomId,
    sender_id: user.id,
    content: `New proposal created: ${title}`,
    message_type: "proposal_ref",
    proposal_id: proposal.id,
  });

  return NextResponse.json({ proposalId: proposal.id });
}
