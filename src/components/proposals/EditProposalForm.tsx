"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type Category } from "@/types/domain";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { withMinDelay } from "@/lib/ui/withMinDelay";

type Props = {
  roomId: string;
  proposalId: string;
  initialCategory: Category;
  initialTitle: string;
  initialDescription: string;
  initialFullDetails: string;
};

export function EditProposalForm({
  roomId,
  proposalId,
  initialCategory,
  initialTitle,
  initialDescription,
  initialFullDetails,
}: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<Category>(initialCategory);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [fullDetails, setFullDetails] = useState(initialFullDetails);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await withMinDelay(fetch(`/api/proposals/${proposalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, title, description, fullDetails }),
    }));

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error ?? "Update proposal failed");
      return;
    }

    router.push(`/app/room/${roomId}/proposals/${proposalId}`);
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-8">
      <LoadingOverlay visible={loading} label="Updating proposal" />
      <h1 className="campus-heading text-2xl font-semibold">Edit Proposal</h1>
      <form className="campus-card mt-6 space-y-4 rounded-xl p-6" onSubmit={onSubmit}>
        <label className="block text-sm">
          Category
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Title
          <input className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label className="block text-sm">
          Description
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
          />
        </label>

        <label className="block text-sm">
          Full details
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            value={fullDetails}
            onChange={(e) => setFullDetails(e.target.value)}
            rows={8}
            required
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button className="campus-btn-primary rounded-md px-4 py-2" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="campus-btn-secondary rounded-md px-4 py-2"
            disabled={loading}
            type="button"
            onClick={() => router.push(`/app/room/${roomId}/proposals/${proposalId}`)}
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
