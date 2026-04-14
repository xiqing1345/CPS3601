export function isLocalMode() {
  return process.env.USE_LOCAL_DB === "true" || process.env.NEXT_PUBLIC_USE_LOCAL_DB === "true";
}
