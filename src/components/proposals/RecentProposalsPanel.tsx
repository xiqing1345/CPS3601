"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getCachedProposals } from "@/components/proposals/localProposalCache";

type ProposalItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
};

type Props = {
  roomId: string;
  initialProposals: ProposalItem[];
};

export function RecentProposalsPanel({ roomId, initialProposals }: Props) {
  const proposals = useMemo(() => {
    const merged = new Map<string, ProposalItem>();
    for (const p of initialProposals) {
      merged.set(p.id, p);
    }

    const cached = getCachedProposals(roomId);
    for (const p of cached) {
      const existing = merged.get(p.id);
      merged.set(p.id, {
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        createdAt: existing?.createdAt ?? p.createdAt,
      });
    }

    return Array.from(merged.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);
  }, [roomId, initialProposals]);

  return (
    <aside className="campus-paper-card space-y-4 rounded-xl p-4">
      <h2 className="campus-heading text-lg font-semibold">Recent Proposals</h2>
      <div className="space-y-3">
        {proposals.map((p) => (
          <article key={p.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <h3 className="text-sm font-medium">{p.title}</h3>
            <p className="mt-1 text-xs text-slate-600">{p.description}</p>
            <p className="mt-2 text-xs">Status: <span className="font-medium">{p.status}</span></p>
            <Link className="mt-2 inline-block text-xs text-sky-800 underline" href={`/app/room/${roomId}/proposals/${p.id}`}>
              View details
            </Link>
          </article>
        ))}
      </div>
    </aside>
  );
}
