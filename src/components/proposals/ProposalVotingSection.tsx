"use client";

import { useState } from "react";
import type { VoteType } from "@/types/domain";
import { VotePanel } from "@/components/proposals/VotePanel";

type VoteItem = {
  voteType: string;
  comment: string | null;
  voterName: string;
};

type Props = {
  proposalId: string;
  currentUserName: string;
  initialVotes: VoteItem[];
};

export function ProposalVotingSection({ proposalId, currentUserName, initialVotes }: Props) {
  const [votes, setVotes] = useState<VoteItem[]>(initialVotes);

  function handleVoteSubmitted(vote: { voteType: VoteType; comment: string | null }) {
    setVotes((previous) => {
      const next = previous.filter(
        (item) => item.voterName !== currentUserName && item.voterName !== "You",
      );

      return [
        {
          voteType: vote.voteType,
          comment: vote.comment,
          voterName: "You",
        },
        ...next,
      ];
    });
  }

  return (
    <>
      <section className="mt-4">
        <VotePanel proposalId={proposalId} onVoteSubmitted={handleVoteSubmitted} autoRefresh={false} />
      </section>

      <section className="campus-card mt-4 rounded-xl p-6">
        <h2 className="campus-heading text-lg font-semibold">Votes</h2>
        {votes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No votes yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {votes.map((vote, idx) => (
              <article key={`${vote.voterName}-${idx}`} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                <p className="font-medium">{vote.voterName} · {vote.voteType}</p>
                {vote.comment && <p className="mt-1 text-slate-600">{vote.comment}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
