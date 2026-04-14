function isFalse(value: string | undefined) {
  return value?.toLowerCase() === "false";
}

export function isLocalMode() {
  return !isFalse(process.env.USE_LOCAL_DB) && !isFalse(process.env.NEXT_PUBLIC_USE_LOCAL_DB);
}

export function isLocalModeClient() {
  return !isFalse(process.env.NEXT_PUBLIC_USE_LOCAL_DB);
}
