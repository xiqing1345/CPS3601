"use client";

type CachedProposal = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
};

type CachePayload = {
  roomId: string;
  proposals: CachedProposal[];
};

const KEY = "dorm_exchange_local_proposals";

function readPayload(): CachePayload[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CachePayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePayload(payload: CachePayload[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(payload));
}

export function getCachedProposals(roomId: string): CachedProposal[] {
  const payload = readPayload();
  return payload.find((item) => item.roomId === roomId)?.proposals ?? [];
}

export function saveOrUpdateCachedProposal(roomId: string, proposal: CachedProposal) {
  const payload = readPayload();
  const roomEntry = payload.find((item) => item.roomId === roomId);

  if (!roomEntry) {
    payload.push({ roomId, proposals: [proposal] });
    writePayload(payload);
    return;
  }

  const idx = roomEntry.proposals.findIndex((item) => item.id === proposal.id);
  if (idx >= 0) {
    roomEntry.proposals[idx] = { ...roomEntry.proposals[idx], ...proposal };
  } else {
    roomEntry.proposals.unshift(proposal);
  }

  roomEntry.proposals = roomEntry.proposals.slice(0, 30);
  writePayload(payload);
}
