"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { withMinDelay } from "@/lib/ui/withMinDelay";

export default function OnboardingPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [dormName, setDormName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"create" | "join" | null>(null);

  async function createRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("create");
    setError(null);

    const res = await withMinDelay(fetch("/api/rooms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName, dormName }),
    }));

    const result = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(result.error ?? "Could not create room");
      return;
    }

    router.push(`/app/room/${result.roomId}/chat`);
    router.refresh();
  }

  async function joinRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("join");
    setError(null);

    const res = await withMinDelay(fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    }));

    const result = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(result.error ?? "Could not join room");
      return;
    }

    router.push(`/app/room/${result.roomId}/chat`);
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl gap-6 px-6 py-10 md:grid-cols-2">
      <LoadingOverlay visible={loading !== null} label={loading === "create" ? "Creating room" : "Joining room"} />
      <section className="campus-card rounded-xl p-6">
        <h1 className="campus-heading text-2xl font-semibold">Create a new room</h1>
        <p className="mt-2 text-sm text-slate-600">For the first roommate in a dorm room.</p>

        <form className="mt-6 space-y-4" onSubmit={createRoom}>
          <label className="block text-sm">
            Room name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              placeholder="Room 402"
            />
          </label>

          <label className="block text-sm">
            Dorm name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              value={dormName}
              onChange={(e) => setDormName(e.target.value)}
              required
              placeholder="Maple Hall"
            />
          </label>

          <button className="campus-btn-primary rounded-md px-4 py-2" disabled={loading === "create"}>
            {loading === "create" ? "Creating..." : "Create Room"}
          </button>
        </form>
      </section>

      <section className="campus-card rounded-xl p-6">
        <h2 className="campus-heading text-2xl font-semibold">Join with invite code</h2>
        <p className="mt-2 text-sm text-slate-600">Use the code shared by your roommate.</p>

        <form className="mt-6 space-y-4" onSubmit={joinRoom}>
          <label className="block text-sm">
            Invite code
            <input
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 uppercase"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              placeholder="ABC123"
            />
          </label>

          <button className="campus-btn-primary rounded-md px-4 py-2" disabled={loading === "join"}>
            {loading === "join" ? "Joining..." : "Join Room"}
          </button>
        </form>
      </section>

      {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
    </main>
  );
}
