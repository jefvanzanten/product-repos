/** Return the browser's resolved IANA timezone, with UTC as a deterministic fallback. */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
