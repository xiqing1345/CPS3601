import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/types/domain";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalDb } from "@/lib/localdb/db";
import { getLocalSessionUser } from "@/lib/localdb/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const { proposalId } = await params;
  const body = await request.json();
  const category = String(body.category ?? "");
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const fullDetails = String(body.fullDetails ?? "").trim();

  if (!title || !description || !fullDetails || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "Invalid proposal payload" }, { status: 400 });
  }

  if (isLocalMode()) {
    const localUser = await getLocalSessionUser();
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = localUser.id;

    const db = getLocalDb();
    const proposal = db
      .prepare("select id, room_id, proposer_id, category, title, description, full_details, status from proposals where id = ?")
      .get(proposalId) as
      | {
          id: string;
          room_id: string;
          proposer_id: string;
          category: string;
          title: string;
          description: string;
          full_details: string;
          status: string;
        }
      | undefined;

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.proposer_id !== userId) {
      return NextResponse.json({ error: "Only proposer can edit this proposal" }, { status: 403 });
    }

    if (proposal.status === "active") {
      return NextResponse.json({ error: "Cannot edit an active proposal" }, { status: 403 });
    }

    const changed =
      proposal.category !== category ||
      proposal.title !== title ||
      proposal.description !== description ||
      proposal.full_details !== fullDetails;

    if (!changed) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    db.prepare(
      "insert into proposal_edit_history (id, proposal_id, editor_id, previous_category, previous_title, previous_description, previous_full_details, edited_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      randomUUID(),
      proposalId,
      userId,
      proposal.category,
      proposal.title,
      proposal.description,
      proposal.full_details,
      new Date().toISOString(),
    );

    // If rejected, reset status back to pending so members can re-vote
    const newStatus = proposal.status === "rejected" ? "pending" : proposal.status;
    db.prepare(
      "update proposals set category = ?, title = ?, description = ?, full_details = ?, status = ?, activated_at = null where id = ?",
    ).run(category, title, description, fullDetails, newStatus, proposalId);

    // Reset all votes so members can re-vote on the updated proposal
    db.prepare("delete from proposal_votes where proposal_id = ?").run(proposalId);

    db.prepare(
      "update agreements set category = ?, title = ?, details = ? where proposal_id = ?",
    ).run(category, title, fullDetails, proposalId);

    db.prepare(
      "insert into messages (id, room_id, sender_id, content, message_type, proposal_id, created_at) values (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      randomUUID(),
      proposal.room_id,
      null,
      `System: proposal updated - ${title}. All votes have been reset.`,
      "system",
      proposalId,
      new Date().toISOString(),
    );

    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("id, room_id, proposer_id, category, title, description, full_details, status")
    .eq("id", proposalId)
    .maybeSingle();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  if (proposal.proposer_id !== user.id) {
    return NextResponse.json({ error: "Only proposer can edit this proposal" }, { status: 403 });
  }

  if (proposal.status === "active") {
    return NextResponse.json({ error: "Cannot edit an active proposal" }, { status: 403 });
  }

  const changed =
    proposal.category !== category ||
    proposal.title !== title ||
    proposal.description !== description ||
    proposal.full_details !== fullDetails;

  if (!changed) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const { error: historyError } = await supabase.from("proposal_edit_history").insert({
    proposal_id: proposalId,
    editor_id: user.id,
    previous_category: proposal.category,
    previous_title: proposal.title,
    previous_description: proposal.description,
    previous_full_details: proposal.full_details,
  });

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 400 });
  }

  // If rejected, reset status back to pending so members can re-vote
  const newStatus = proposal.status === "rejected" ? "pending" : proposal.status;
  const { error: updateError } = await supabase
    .from("proposals")
    .update({
      category,
      title,
      description,
      full_details: fullDetails,
      status: newStatus,
      activated_at: null,
    })
    .eq("id", proposalId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // Reset all votes so members can re-vote on the updated proposal
  await supabase.from("proposal_votes").delete().eq("proposal_id", proposalId);

  await supabase
    .from("agreements")
    .update({
      category,
      title,
      details: fullDetails,
    })
    .eq("proposal_id", proposalId);

  await supabase.from("messages").insert({
    room_id: proposal.room_id,
    sender_id: null,
    content: `System: proposal updated - ${title}. All votes have been reset.`,
    message_type: "system",
    proposal_id: proposalId,
  });

  return NextResponse.json({ ok: true });
}
