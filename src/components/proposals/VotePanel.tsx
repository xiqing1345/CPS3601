"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VoteType } from "@/types/domain";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { withMinDelay } from "@/lib/ui/withMinDelay";

export function VotePanel({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState<VoteType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function vote(voteType: VoteType) {
    setLoading(voteType);
    setError(null);

    const res = await withMinDelay(fetch(`/api/proposals/${proposalId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voteType, comment: voteType === "suggest_edit" ? comment : "" }),
    }));

    const result = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(result.error ?? "Vote failed");
      return;
    }

    if (voteType === "suggest_edit") {
      setComment("");
    }

    router.refresh();
  }

  return (
    <>
      <LoadingOverlay visible={loading !== null} label="Submitting vote" />
      <div className="campus-card space-y-3 rounded-lg p-4">
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border border-emerald-800 bg-emerald-700 px-3 py-2 text-sm text-white" onClick={() => vote("approve")} disabled={loading !== null}>
            {loading === "approve" ? "Submitting..." : "Approve"}
          </button>
          <button className="rounded-md border border-rose-800 bg-rose-700 px-3 py-2 text-sm text-white" onClick={() => vote("reject")} disabled={loading !== null}>
            {loading === "reject" ? "Submitting..." : "Reject"}
          </button>
        </div>
        <div className="space-y-2">
          <textarea
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="Suggest edit (optional comment)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <button className="campus-btn-secondary rounded-md px-3 py-2 text-sm" onClick={() => vote("suggest_edit")} disabled={loading !== null}>
            {loading === "suggest_edit" ? "Submitting..." : "Suggest Edit"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </>
  );
}
