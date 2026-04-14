import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalSessionUser } from "@/lib/localdb/session";
import { getLocalDb } from "@/lib/localdb/db";

export default async function ChatPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  if (isLocalMode()) {
    const user = await getLocalSessionUser();
    if (!user) {
      redirect("/auth/login");
    }

    const db = getLocalDb();
    const member = db
      .prepare("select id from room_members where room_id = ? and user_id = ?")
      .get(roomId, user.id);
    if (!member) {
      notFound();
    }

    const room = db
      .prepare("select room_name, dorm_name, invite_code from rooms where id = ?")
      .get(roomId) as { room_name: string; dorm_name: string; invite_code: string } | undefined;

    const messages = db
      .prepare(
        `select m.id, m.content, m.message_type, m.created_at, m.proposal_id, u.display_name as sender_name
         from messages m
         left join users u on u.id = m.sender_id
         where m.room_id = ?
         order by m.created_at asc
         limit 120`,
      )
      .all(roomId) as Array<{
      id: string;
      content: string;
      message_type: string;
      created_at: string;
      proposal_id: string | null;
      sender_name: string | null;
    }>;

    const proposals = db
      .prepare(
        "select id, title, description, status, created_at from proposals where room_id = ? order by created_at desc limit 20",
      )
      .all(roomId) as Array<{ id: string; title: string; description: string; status: string; created_at: string }>;

    const unreadRow = db
      .prepare("select count(*) as count from notifications where user_id = ? and room_id = ? and is_read = 0")
      .get(user.id, roomId) as { count: number };

    return (
      <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[2fr_1fr]">
        <section className="campus-card rounded-xl p-4">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h1 className="campus-heading text-2xl font-semibold">{room?.dorm_name} · {room?.room_name}</h1>
              <p className="text-sm text-slate-600">Invite code: {room?.invite_code}</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="campus-btn-secondary rounded-md px-3 py-2" href={`/app/room/${roomId}/proposals/new`}>
                New Proposal
              </Link>
              <Link className="campus-btn-secondary rounded-md px-3 py-2" href={`/app/room/${roomId}/agreements`}>
                Agreements
              </Link>
              <Link className="campus-btn-secondary rounded-md px-3 py-2" href="/app/notifications">
                Notifications ({unreadRow.count ?? 0})
              </Link>
            </div>
          </header>

          <div className="mb-4 max-h-[65vh] space-y-3 overflow-y-auto pr-2">
            {messages.map((m) => (
              <article key={m.id} className="rounded-lg border border-slate-200 bg-white/80 p-3">
                <p className="text-sm text-slate-500">{m.message_type === "system" ? "System" : m.sender_name ?? "Unknown"}</p>
                {m.message_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.content}
                    alt="Shared image"
                    className="mt-1 max-w-xs rounded-lg border border-slate-200"
                    loading="lazy"
                  />
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm">{m.content}</p>
                )}
                {m.proposal_id && (
                  <Link className="mt-2 inline-block text-xs text-sky-800 underline" href={`/app/room/${roomId}/proposals/${m.proposal_id}`}>
                    Open linked proposal
                  </Link>
                )}
              </article>
            ))}
          </div>

          <MessageComposer roomId={roomId} />
        </section>

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
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: member } = await supabase
    .from("room_members")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    notFound();
  }

  const [{ data: room }, { data: messages }, { data: proposals }, unreadResult] = await Promise.all([
    supabase.from("rooms").select("room_name,dorm_name,invite_code").eq("id", roomId).maybeSingle(),
    supabase
      .from("messages")
      .select("id,content,message_type,created_at,proposal_id,sender:profiles(display_name)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(120),
    supabase
      .from("proposals")
      .select("id,title,description,status,created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("room_id", roomId)
      .eq("is_read", false),
  ]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[2fr_1fr]">
      <section className="campus-card rounded-xl p-4">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h1 className="campus-heading text-2xl font-semibold">{room?.dorm_name} · {room?.room_name}</h1>
            <p className="text-sm text-slate-600">Invite code: {room?.invite_code}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link className="campus-btn-secondary rounded-md px-3 py-2" href={`/app/room/${roomId}/proposals/new`}>
              New Proposal
            </Link>
            <Link className="campus-btn-secondary rounded-md px-3 py-2" href={`/app/room/${roomId}/agreements`}>
              Agreements
            </Link>
            <Link className="campus-btn-secondary rounded-md px-3 py-2" href="/app/notifications">
              Notifications ({unreadResult.count ?? 0})
            </Link>
          </div>
        </header>

        <div className="mb-4 max-h-[65vh] space-y-3 overflow-y-auto pr-2">
          {(messages ?? []).map((m) => (
            <article key={m.id} className="rounded-lg border border-slate-200 bg-white/80 p-3">
              <p className="text-sm text-slate-500">{m.message_type === "system" ? "System" : (m.sender as { display_name?: string } | null)?.display_name ?? "Unknown"}</p>
              {m.message_type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.content}
                  alt="Shared image"
                  className="mt-1 max-w-xs rounded-lg border border-slate-200"
                  loading="lazy"
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm">{m.content}</p>
              )}
              {m.proposal_id && (
                <Link className="mt-2 inline-block text-xs text-sky-800 underline" href={`/app/room/${roomId}/proposals/${m.proposal_id}`}>
                  Open linked proposal
                </Link>
              )}
            </article>
          ))}
        </div>

        <MessageComposer roomId={roomId} />
      </section>

      <aside className="campus-paper-card space-y-4 rounded-xl p-4">
        <h2 className="campus-heading text-lg font-semibold">Recent Proposals</h2>
        <div className="space-y-3">
          {(proposals ?? []).map((p) => (
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
    </main>
  );
}
