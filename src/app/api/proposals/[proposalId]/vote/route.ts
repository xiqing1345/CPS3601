import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shouldActivateProposal } from "@/lib/domain/proposal";
import type { VoteType } from "@/types/domain";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalDb } from "@/lib/localdb/db";
import { getLocalSessionUser } from "@/lib/localdb/session";

const VALID_VOTES: VoteType[] = ["approve", "reject", "suggest_edit"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const { proposalId } = await params;

  if (isLocalMode()) {
    const localUser = await getLocalSessionUser();
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = localUser.id;

    const body = await request.json();
    const voteType = String(body.voteType ?? "") as VoteType;
    const comment = String(body.comment ?? "").trim();
    if (!VALID_VOTES.includes(voteType)) {
      return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
    }

    const db = getLocalDb();
    const proposal = db
      .prepare("select id, room_id, title, category, full_details, proposer_id, status from proposals where id = ?")
      .get(proposalId) as
      | {
          id: string;
          room_id: string;
          title: string;
          category: string;
          full_details: string;
          proposer_id: string;
          status: string;
        }
      | undefined;

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const member = db
      .prepare("select id from room_members where room_id = ? and user_id = ?")
      .get(proposal.room_id, userId);
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();
    db.prepare(
      `insert into proposal_votes (id, proposal_id, voter_id, vote_type, comment, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?)
       on conflict(proposal_id, voter_id)
       do update set vote_type = excluded.vote_type, comment = excluded.comment, updated_at = excluded.updated_at`,
    ).run(randomUUID(), proposalId, userId, voteType, comment || null, now, now);

    const memberCountRow = db
      .prepare("select count(*) as count from room_members where room_id = ?")
      .get(proposal.room_id) as { count: number };
    const votes = db
      .prepare("select vote_type from proposal_votes where proposal_id = ?")
      .all(proposalId) as Array<{ vote_type: VoteType }>;

    const evaluation = shouldActivateProposal({
      memberCount: memberCountRow.count,
      votes,
    });

    db.prepare("update proposals set status = ?, activated_at = ? where id = ?").run(
      evaluation.nextStatus,
      evaluation.nextStatus === "active" ? now : null,
      proposalId,
    );

    if (evaluation.nextStatus === "active") {
      db.prepare(
        `insert into agreements (id, proposal_id, room_id, category, title, details, proposer_id, active_since, is_active, approval_status, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(proposal_id)
         do update set approval_status = excluded.approval_status, is_active = excluded.is_active`,
      ).run(
        randomUUID(),
        proposalId,
        proposal.room_id,
        proposal.category,
        proposal.title,
        proposal.full_details,
        proposal.proposer_id,
        now,
        1,
        evaluation.approvalStatus,
        now,
      );

      db.prepare(
        "insert into messages (id, room_id, sender_id, content, message_type, proposal_id, created_at) values (?, ?, ?, ?, ?, ?, ?)",
      ).run(
        randomUUID(),
        proposal.room_id,
        null,
        `System: agreement activated - ${proposal.title}`,
        "system",
        proposalId,
        now,
      );

      const members = db
        .prepare("select user_id from room_members where room_id = ?")
        .all(proposal.room_id) as Array<{ user_id: string }>;

      const notifyStmt = db.prepare(
        "insert into notifications (id, user_id, room_id, type, content, ref_type, ref_id, is_read, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      for (const m of members) {
        notifyStmt.run(
          randomUUID(),
          m.user_id,
          proposal.room_id,
          "agreement_activated",
          `Agreement activated: ${proposal.title}`,
          "agreement",
          proposalId,
          0,
          now,
        );
      }
    }

    return NextResponse.json({ status: evaluation.nextStatus, approvalStatus: evaluation.approvalStatus });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const voteType = String(body.voteType ?? "") as VoteType;
  const comment = String(body.comment ?? "").trim();

  if (!VALID_VOTES.includes(voteType)) {
    return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("id,room_id,title,category,full_details,proposer_id,status")
    .eq("id", proposalId)
    .maybeSingle();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const { error: upsertError } = await supabase.from("proposal_votes").upsert(
    {
      proposal_id: proposalId,
      voter_id: user.id,
      vote_type: voteType,
      comment: comment || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "proposal_id,voter_id" },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  const [{ count: memberCount }, { data: votes }] = await Promise.all([
    supabase
      .from("room_members")
      .select("id", { count: "exact", head: true })
      .eq("room_id", proposal.room_id),
    supabase.from("proposal_votes").select("vote_type").eq("proposal_id", proposalId),
  ]);

  const evaluation = shouldActivateProposal({
    memberCount: memberCount ?? 0,
    votes: (votes ?? []) as Array<{ vote_type: VoteType }>,
  });

  if (evaluation.nextStatus !== proposal.status) {
    await supabase
      .from("proposals")
      .update({
        status: evaluation.nextStatus,
        activated_at: evaluation.nextStatus === "active" ? new Date().toISOString() : null,
      })
      .eq("id", proposalId);
  }

  if (evaluation.nextStatus === "active") {
    await supabase.from("agreements").upsert(
      {
        proposal_id: proposalId,
        room_id: proposal.room_id,
        category: proposal.category,
        title: proposal.title,
        details: proposal.full_details,
        proposer_id: proposal.proposer_id,
        approval_status: evaluation.approvalStatus,
        is_active: true,
      },
      { onConflict: "proposal_id" },
    );

    await supabase.from("messages").insert({
      room_id: proposal.room_id,
      sender_id: null,
      content: `System: agreement activated - ${proposal.title}`,
      message_type: "system",
      proposal_id: proposalId,
    });

    const { data: members } = await supabase
      .from("room_members")
      .select("user_id")
      .eq("room_id", proposal.room_id);

    if (members && members.length > 0) {
      await supabase.from("notifications").insert(
        members.map((m) => ({
          user_id: m.user_id,
          room_id: proposal.room_id,
          type: "agreement_activated",
          content: `Agreement activated: ${proposal.title}`,
          ref_type: "agreement",
          ref_id: proposalId,
        })),
      );
    }
  }

  return NextResponse.json({ status: evaluation.nextStatus, approvalStatus: evaluation.approvalStatus });
}
