import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatMessageSection } from "@/components/chat/ChatMessageSection";
import { RecentProposalsPanel } from "@/components/proposals/RecentProposalsPanel";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalSessionUser } from "@/lib/localdb/session";
import { getLocalDb } from "@/lib/localdb/db";

function normalizeMessageContent(content: string) {
  return content.replace(/^(System|[A-Za-z][A-Za-z0-9_-]{1,24}):\s+/, "");
}

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ proposalCreated?: string }>;
}) {
  const { roomId } = await params;
  const { proposalCreated } = await searchParams;

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
        `select m.id, m.content, m.message_type, m.created_at, m.proposal_id, p.title as proposal_title, u.display_name as sender_name
         from messages m
         left join users u on u.id = m.sender_id
         left join proposals p on p.id = m.proposal_id
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
      proposal_title: string | null;
      sender_name: string | null;
    }>;

    const proposals = db
      .prepare(
        "select id, title, description, status, created_at from proposals where room_id = ? order by created_at desc limit 20",
      )
      .all(roomId) as Array<{ id: string; title: string; description: string; status: string; created_at: string }>;

    const roommateMessages = messages.filter((m) => m.message_type === "user" || m.message_type === "image");
    const systemNotices = messages
      .filter((m) => m.message_type !== "user" && m.message_type !== "image")
      .slice(-30)
      .reverse();

    const unreadRow = db
      .prepare("select count(*) as count from notifications where user_id = ? and room_id = ? and is_read = 0")
      .get(user.id, roomId) as { count: number };

    return (
      <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[2fr_1fr_1fr]">
        <section className="campus-card rounded-xl p-4">
          {proposalCreated === "1" && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Proposal created successfully.
            </div>
          )}
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

          <ChatMessageSection
            roomId={roomId}
            currentUserName={user.display_name}
            initialMessages={roommateMessages.map((m) => ({
              id: m.id,
              content: normalizeMessageContent(m.content),
              messageType: m.message_type,
              createdAt: m.created_at,
              proposalId: m.proposal_id,
              proposalTitle: m.proposal_title,
              senderName: m.sender_name ?? "Unknown",
            }))}
            proposalOptions={proposals.map((p) => ({ id: p.id, title: p.title }))}
          />
        </section>

        <RecentProposalsPanel
          roomId={roomId}
          initialProposals={proposals.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            status: p.status,
            createdAt: p.created_at,
          }))}
        />

        <aside className="campus-paper-card space-y-4 rounded-xl p-4">
          <h2 className="campus-heading text-lg font-semibold">System Notifications</h2>
          {systemNotices.length === 0 ? (
            <p className="text-sm text-slate-600">No system notifications in this room yet.</p>
          ) : (
            <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
              {systemNotices.map((m) => (
                <article key={m.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{m.message_type}</p>
                  <p className="mt-1 text-slate-800">{normalizeMessageContent(m.content)}</p>
                  {m.proposal_id && (
                    <Link className="mt-2 inline-block text-xs text-sky-800 underline" href={`/app/room/${roomId}/proposals/${m.proposal_id}`}>
                      Open related proposal
                    </Link>
                  )}
                  <p className="mt-2 text-xs text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
                </article>
              ))}
            </div>
          )}
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
      .select("id,content,message_type,created_at,proposal_id,proposal:proposals(title),sender:profiles(display_name)")
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

  const roommateMessages = (messages ?? []).filter((m) => m.message_type === "user" || m.message_type === "image");
  const systemNotices = (messages ?? [])
    .filter((m) => m.message_type !== "user" && m.message_type !== "image")
    .slice(-30)
    .reverse();

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[2fr_1fr_1fr]">
      <section className="campus-card rounded-xl p-4">
        {proposalCreated === "1" && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Proposal created successfully.
          </div>
        )}
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

        <ChatMessageSection
          roomId={roomId}
          currentUserName="You"
          initialMessages={roommateMessages.map((m) => ({
            id: m.id,
            content: normalizeMessageContent(m.content),
            messageType: m.message_type,
            createdAt: m.created_at,
            proposalId: m.proposal_id,
            proposalTitle: ((m.proposal as { title?: string } | null)?.title ?? null),
            senderName: (m.sender as { display_name?: string } | null)?.display_name ?? "Unknown",
          }))}
          proposalOptions={(proposals ?? []).map((p) => ({ id: p.id, title: p.title }))}
        />
      </section>

      <RecentProposalsPanel
        roomId={roomId}
        initialProposals={(proposals ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          createdAt: p.created_at,
        }))}
      />

      <aside className="campus-paper-card space-y-4 rounded-xl p-4">
        <h2 className="campus-heading text-lg font-semibold">System Notifications</h2>
        {systemNotices.length === 0 ? (
          <p className="text-sm text-slate-600">No system notifications in this room yet.</p>
        ) : (
          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {systemNotices.map((m) => (
              <article key={m.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">{m.message_type}</p>
                <p className="mt-1 text-slate-800">{normalizeMessageContent(m.content)}</p>
                {m.proposal_id && (
                  <Link className="mt-2 inline-block text-xs text-sky-800 underline" href={`/app/room/${roomId}/proposals/${m.proposal_id}`}>
                    Open related proposal
                  </Link>
                )}
                <p className="mt-2 text-xs text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
        )}
      </aside>
    </main>
  );
}
