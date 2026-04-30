"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { getCachedProposals } from "@/components/proposals/localProposalCache";

type ChatMessage = {
  id: string;
  content: string;
  messageType: string;
  createdAt: string;
  proposalId: string | null;
  proposalTitle: string | null;
  senderName: string;
};

type Props = {
  roomId: string;
  currentUserName: string;
  initialMessages: ChatMessage[];
  proposalOptions: Array<{ id: string; title: string }>;
};

export function ChatMessageSection({ roomId, currentUserName, initialMessages, proposalOptions }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const mergedProposalOptions = useMemo(() => {
    const byId = new Map<string, { id: string; title: string }>();
    for (const proposal of proposalOptions) {
      byId.set(proposal.id, proposal);
    }

    for (const cached of getCachedProposals(roomId)) {
      if (!byId.has(cached.id)) {
        byId.set(cached.id, { id: cached.id, title: cached.title });
      }
    }

    return Array.from(byId.values());
  }, [roomId, proposalOptions]);

  function handleMessageSent(message: {
    content: string;
    messageType: "user" | "image";
    proposalId: string | null;
    proposalTitle: string | null;
  }) {
    setMessages((previous) => [
      ...previous,
      {
        id: `local-${Date.now()}`,
        content: message.content,
        messageType: message.messageType,
        createdAt: new Date().toISOString(),
        proposalId: message.proposalId,
        proposalTitle: message.proposalTitle,
        senderName: currentUserName,
      },
    ]);
  }

  return (
    <>
      <div className="mb-4 max-h-[65vh] space-y-3 overflow-y-auto pr-2">
        {messages.map((m) => (
          <article key={m.id} className="rounded-lg border border-slate-200 bg-white/80 p-3">
            <p className="text-sm text-slate-500">{m.messageType === "system" ? "System" : m.senderName}</p>
            {m.messageType === "image" ? (
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
            {m.proposalId && (
              <Link className="mt-2 inline-block text-xs text-sky-800 underline" href={`/app/room/${roomId}/proposals/${m.proposalId}`}>
                Open linked proposal{m.proposalTitle ? `: ${m.proposalTitle}` : ""}
              </Link>
            )}
            <p className="mt-2 text-xs text-slate-500">{new Date(m.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>

      <MessageComposer
        roomId={roomId}
        proposalOptions={mergedProposalOptions}
        onMessageSent={handleMessageSent}
        autoRefresh={false}
      />
    </>
  );
}
