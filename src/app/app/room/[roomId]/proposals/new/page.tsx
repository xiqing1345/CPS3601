"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CATEGORIES, encodeCustomCategory } from "@/types/domain";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { withMinDelay } from "@/lib/ui/withMinDelay";
import { isLocalModeClient } from "@/lib/localdb/mode";

export default function NewProposalPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = typeof params?.roomId === "string" ? params.roomId : "";
  const router = useRouter();
  const [category, setCategory] = useState<string>("rules");
  const [customCategory, setCustomCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fullDetails, setFullDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!roomId) {
      setError("Room context is missing. Please reopen this page from the room chat.");
      return;
    }

    setLoading(true);
    setError(null);

    const resolvedCategory = category === "custom"
      ? encodeCustomCategory(customCategory)
      : category;

    if (!resolvedCategory) {
      setLoading(false);
      setError("Please enter a custom category name.");
      return;
    }

    const res = await withMinDelay(fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, category: resolvedCategory, title, description, fullDetails }),
    }));

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error ?? "Create proposal failed");
      return;
    }

    if (isLocalModeClient()) {
      router.push(`/app/room/${roomId}/chat?proposalCreated=1`);
    } else {
      router.push(`/app/room/${roomId}/proposals/${result.proposalId}`);
    }
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-8">
      <LoadingOverlay visible={loading} label="Submitting proposal" />
      <h1 className="campus-heading text-2xl font-semibold">Create Proposal</h1>
      <form className="campus-card mt-6 space-y-4 rounded-xl p-6" onSubmit={onSubmit}>
        <label className="block text-sm">
          Category
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
            <option value="custom">custom</option>
          </select>
        </label>

        {category === "custom" && (
          <label className="block text-sm">
            Custom category name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="e.g. study_time"
              required
            />
          </label>
        )}

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

        <button className="campus-btn-primary rounded-md px-4 py-2" disabled={loading}>
          {loading ? "Creating..." : "Create"}
        </button>
      </form>
    </main>
  );
}
