export type ProposalStatus = "pending" | "approved" | "rejected" | "active";
export type VoteType = "approve" | "reject" | "suggest_edit";
export type MessageType = "user" | "system" | "proposal_ref";

export const CATEGORIES = [
  "quiet_hours",
  "guests",
  "chores",
  "temperature",
  "rules",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];
