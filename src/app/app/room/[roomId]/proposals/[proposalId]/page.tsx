import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VotePanel } from "@/components/proposals/VotePanel";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalSessionUser } from "@/lib/localdb/session";
import { getLocalDb } from "@/lib/localdb/db";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ roomId: string; proposalId: string }>;
}) {
  const { roomId, proposalId } = await params;

  if (isLocalMode()) {
    const user = await getLocalSessionUser();
    if (!user) {
      notFound();
    }

    const db = getLocalDb();
    const member = db
      .prepare("select id from room_members where room_id = ? and user_id = ?")
      .get(roomId, user.id);
    if (!member) {
      notFound();
    }

    const proposal = db
      .prepare(
        `select p.id, p.proposer_id, p.category, p.title, p.description, p.full_details, p.status, p.created_at, p.activated_at, u.display_name as proposer_name
         from proposals p
         left join users u on u.id = p.proposer_id
         where p.id = ? and p.room_id = ?`,
      )
      .get(proposalId, roomId) as
      | {
          id: string;
          proposer_id: string;
          category: string;
          title: string;
          description: string;
          full_details: string;
          status: string;
          created_at: string;
          activated_at: string | null;
          proposer_name: string | null;
        }
      | undefined;

    if (!proposal) {
      notFound();
    }

    const votes = db
      .prepare(
        `select pv.vote_type, pv.comment, u.display_name as voter_name
         from proposal_votes pv
         left join users u on u.id = pv.voter_id
         where pv.proposal_id = ?`,
      )
      .all(proposalId) as Array<{ vote_type: string; comment: string | null; voter_name: string | null }>;

    const editHistory = db
      .prepare(
        `select h.id, h.previous_category, h.previous_title, h.previous_description, h.edited_at, u.display_name as editor_name
         from proposal_edit_history h
         left join users u on u.id = h.editor_id
         where h.proposal_id = ?
         order by h.edited_at desc`,
      )
      .all(proposalId) as Array<{
      id: string;
      previous_category: string;
      previous_title: string;
      previous_description: string;
      edited_at: string;
      editor_name: string | null;
    }>;

    const memberCount = db
      .prepare("select count(*) as count from room_members where room_id = ?")
      .get(roomId) as { count: number };

    const approved = votes.filter((v) => v.vote_type === "approve").length;

    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between gap-3">
          <Link className="text-sm text-sky-800 underline" href={`/app/room/${roomId}/chat`}>
            Back to chat
          </Link>
          {proposal.proposer_id === user.id && proposal.status !== "active" && (
            <Link className="campus-btn-secondary rounded-md px-3 py-2 text-sm" href={`/app/room/${roomId}/proposals/${proposalId}/edit`}>
              Edit Proposal
            </Link>
          )}
        </div>

        <section className="campus-paper-card mt-4 rounded-xl p-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">{proposal.category}</p>
          <h1 className="campus-heading mt-1 text-2xl font-semibold">{proposal.title}</h1>
          <p className="mt-2 text-sm text-slate-700">{proposal.description}</p>
          <p className="mt-3 whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-sm">{proposal.full_details}</p>

          <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <p>Status: <span className="font-medium">{proposal.status}</span></p>
            <p>Approval: <span className="font-medium">{approved}/{memberCount.count} approved</span></p>
            <p>Proposer: {proposal.proposer_name ?? "Unknown"}</p>
            <p>Activated at: {proposal.activated_at ? new Date(proposal.activated_at).toLocaleString() : "-"}</p>
          </div>
        </section>

        <section className="mt-4">
          <VotePanel proposalId={proposalId} />
        </section>

        <section className="campus-card mt-4 rounded-xl p-6">
          <h2 className="campus-heading text-lg font-semibold">Votes</h2>
          <div className="mt-3 space-y-2">
            {votes.map((vote, idx) => (
              <article key={idx} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                <p className="font-medium">{vote.voter_name ?? "Member"} · {vote.vote_type}</p>
                {vote.comment && <p className="mt-1 text-slate-600">{vote.comment}</p>}
              </article>
            ))}
          </div>
        </section>

        <section className="campus-card mt-4 rounded-xl p-6">
          <h2 className="campus-heading text-lg font-semibold">Edit History</h2>
          {editHistory.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No edits yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {editHistory.map((item) => (
                <article key={item.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                  <p className="font-medium">Edited by {item.editor_name ?? "Member"} at {new Date(item.edited_at).toLocaleString()}</p>
                  <p className="mt-1 text-slate-700">Previous title: {item.previous_title}</p>
                  <p className="text-slate-600">Previous category: {item.previous_category}</p>
                  <p className="mt-1 text-slate-600">{item.previous_description}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const [{ data: proposal }, { data: votes }, { count: memberCount }, { data: editHistory }] = await Promise.all([
    supabase
      .from("proposals")
      .select("id,proposer_id,category,title,description,full_details,status,created_at,activated_at,proposer:profiles(display_name)")
      .eq("id", proposalId)
      .eq("room_id", roomId)
      .maybeSingle(),
    supabase
      .from("proposal_votes")
      .select("vote_type,comment,voter:profiles(display_name)")
      .eq("proposal_id", proposalId),
    supabase
      .from("room_members")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId),
    supabase
      .from("proposal_edit_history")
      .select("id,previous_category,previous_title,previous_description,edited_at,editor:profiles(display_name)")
      .eq("proposal_id", proposalId)
      .order("edited_at", { ascending: false }),
  ]);

  if (!proposal) {
    notFound();
  }

  const approved = (votes ?? []).filter((v) => v.vote_type === "approve").length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link className="text-sm text-sky-800 underline" href={`/app/room/${roomId}/chat`}>
          Back to chat
        </Link>
        {proposal.proposer_id === user.id && proposal.status !== "active" && (
          <Link className="campus-btn-secondary rounded-md px-3 py-2 text-sm" href={`/app/room/${roomId}/proposals/${proposalId}/edit`}>
            Edit Proposal
          </Link>
        )}
      </div>

      <section className="campus-paper-card mt-4 rounded-xl p-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">{proposal.category}</p>
        <h1 className="campus-heading mt-1 text-2xl font-semibold">{proposal.title}</h1>
        <p className="mt-2 text-sm text-slate-700">{proposal.description}</p>
        <p className="mt-3 whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-sm">{proposal.full_details}</p>

        <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p>Status: <span className="font-medium">{proposal.status}</span></p>
          <p>Approval: <span className="font-medium">{approved}/{memberCount ?? 0} approved</span></p>
          <p>Proposer: {(proposal.proposer as { display_name?: string } | null)?.display_name ?? "Unknown"}</p>
          <p>Activated at: {proposal.activated_at ? new Date(proposal.activated_at).toLocaleString() : "-"}</p>
        </div>
      </section>

      <section className="mt-4">
        <VotePanel proposalId={proposalId} />
      </section>

      <section className="campus-card mt-4 rounded-xl p-6">
        <h2 className="campus-heading text-lg font-semibold">Votes</h2>
        <div className="mt-3 space-y-2">
          {(votes ?? []).map((vote, idx) => (
            <article key={idx} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <p className="font-medium">{(vote.voter as { display_name?: string } | null)?.display_name ?? "Member"} · {vote.vote_type}</p>
              {vote.comment && <p className="mt-1 text-slate-600">{vote.comment}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="campus-card mt-4 rounded-xl p-6">
        <h2 className="campus-heading text-lg font-semibold">Edit History</h2>
        {(editHistory ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No edits yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {(editHistory ?? []).map((item) => (
              <article key={item.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                <p className="font-medium">Edited by {(item.editor as { display_name?: string } | null)?.display_name ?? "Member"} at {new Date(item.edited_at).toLocaleString()}</p>
                <p className="mt-1 text-slate-700">Previous title: {item.previous_title}</p>
                <p className="text-slate-600">Previous category: {item.previous_category}</p>
                <p className="mt-1 text-slate-600">{item.previous_description}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
