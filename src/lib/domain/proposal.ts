import type { VoteType } from "@/types/domain";

export function shouldActivateProposal(input: {
  memberCount: number;
  votes: Array<{ vote_type: VoteType }>;
}) {
  const { memberCount, votes } = input;
  const approved = votes.filter((v) => v.vote_type === "approve").length;
  const rejected = votes.some((v) => v.vote_type === "reject");

  if (rejected) {
    return { nextStatus: "rejected" as const, approvalStatus: `${approved}/${memberCount} approved` };
  }

  if (memberCount > 0 && approved >= memberCount) {
    return { nextStatus: "active" as const, approvalStatus: `${approved}/${memberCount} approved` };
  }

  return { nextStatus: "pending" as const, approvalStatus: `${approved}/${memberCount} approved` };
}
