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

export const CUSTOM_CATEGORY_PREFIX = "custom:";

export function isBuiltInCategory(value: string): value is Category {
  return CATEGORIES.includes(value as Category);
}

export function decodeCustomCategoryLabel(value: string) {
  if (!value.startsWith(CUSTOM_CATEGORY_PREFIX)) {
    return "";
  }
  return value.slice(CUSTOM_CATEGORY_PREFIX.length).trim();
}

export function encodeCustomCategory(rawLabel: string) {
  const normalized = rawLabel.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }
  return `${CUSTOM_CATEGORY_PREFIX}${normalized}`;
}

export function isValidProposalCategory(value: string) {
  if (isBuiltInCategory(value)) {
    return true;
  }
  return decodeCustomCategoryLabel(value).length > 0;
}

export function formatProposalCategory(value: string) {
  const custom = decodeCustomCategoryLabel(value);
  const raw = custom || value;
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
