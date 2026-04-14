import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalDb } from "@/lib/localdb/db";
import { getLocalSessionUser } from "@/lib/localdb/session";

export default async function AgreementsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

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

    const agreements = db
      .prepare(
        `select a.id, a.category, a.title, a.details, a.active_since, a.approval_status, a.is_active, u.display_name as proposer_name
         from agreements a
         left join users u on u.id = a.proposer_id
         where a.room_id = ? and a.is_active = 1
         order by a.active_since desc`,
      )
      .all(roomId) as Array<{
      id: string;
      category: string;
      title: string;
      details: string;
      active_since: string;
      approval_status: string;
      is_active: number;
      proposer_name: string | null;
    }>;

    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="campus-heading text-2xl font-semibold">Active Agreements</h1>
          <Link className="text-sm text-sky-800 underline" href={`/app/room/${roomId}/chat`}>
            Back to chat
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {agreements.map((ag) => (
            <article key={ag.id} className="campus-paper-card rounded-xl p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{ag.category}</p>
              <h2 className="campus-heading mt-1 text-lg font-semibold">{ag.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{ag.details}</p>
              <div className="mt-4 space-y-1 text-xs text-slate-600">
                <p>Proposer: {ag.proposer_name ?? "Unknown"}</p>
                <p>Active since: {new Date(ag.active_since).toLocaleString()}</p>
                <p>Approval: {ag.approval_status}</p>
                <p>Status: {ag.is_active ? "active" : "inactive"}</p>
              </div>
            </article>
          ))}
        </div>
      </main>
    );
  }

  const supabase = await createClient();

  const { data: agreements } = await supabase
    .from("agreements")
    .select("id,category,title,details,active_since,approval_status,proposer:profiles(display_name),is_active")
    .eq("room_id", roomId)
    .eq("is_active", true)
    .order("active_since", { ascending: false });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="campus-heading text-2xl font-semibold">Active Agreements</h1>
        <Link className="text-sm text-sky-800 underline" href={`/app/room/${roomId}/chat`}>
          Back to chat
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(agreements ?? []).map((ag) => (
          <article key={ag.id} className="campus-paper-card rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{ag.category}</p>
            <h2 className="campus-heading mt-1 text-lg font-semibold">{ag.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{ag.details}</p>
            <div className="mt-4 space-y-1 text-xs text-slate-600">
              <p>Proposer: {(ag.proposer as { display_name?: string } | null)?.display_name ?? "Unknown"}</p>
              <p>Active since: {new Date(ag.active_since).toLocaleString()}</p>
              <p>Approval: {ag.approval_status}</p>
              <p>Status: {ag.is_active ? "active" : "inactive"}</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
