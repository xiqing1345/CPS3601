function isFalse(value: string | undefined) {
  return value?.toLowerCase() === "false";
}

export function isLocalMode() {
  // Default to local demo mode unless explicitly turned off.
  return !isFalse(process.env.USE_LOCAL_DB) && !isFalse(process.env.NEXT_PUBLIC_USE_LOCAL_DB);
}

export function isLocalModeClient() {
  // Client bundles only expose NEXT_PUBLIC_* env variables.
  return !isFalse(process.env.NEXT_PUBLIC_USE_LOCAL_DB);
}
