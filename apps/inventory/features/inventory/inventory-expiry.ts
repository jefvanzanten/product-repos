/** Visual tones available for inventory expiry labels. */
export type ExpiryTone = "expired" | "today" | "soon" | "ok" | "none";

/** Display-ready expiry status for one inventory batch or group. */
export type ExpiryStatus = {
  readonly tone: ExpiryTone;
  readonly label: string;
};

const dayInMilliseconds = 86_400_000;

/**
 * Derive the Dutch expiry label against the current local calendar date.
 *
 * @param expiryDate - ISO local expiry date or null when no date is known.
 * @returns The display label and visual tone for the expiry date.
 */
export function expiryStatus(expiryDate: string | null): ExpiryStatus {
  if (expiryDate === null) return { tone: "none", label: "Geen datum" };
  const year = Number(expiryDate.slice(0, 4));
  const month = Number(expiryDate.slice(5, 7));
  const day = Number(expiryDate.slice(8, 10));
  const today = new Date();
  const todayEpoch = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const expiryEpoch = Date.UTC(year, month - 1, day);
  const difference = Math.round((expiryEpoch - todayEpoch) / dayInMilliseconds);

  if (difference < 0) {
    const daysExpired = Math.abs(difference);
    return { tone: "expired", label: `${daysExpired} ${daysExpired === 1 ? "dag" : "dagen"} verlopen` };
  }
  if (difference === 0) return { tone: "today", label: "Verloopt vandaag" };
  if (difference <= 7) return { tone: "soon", label: `Nog ${difference} ${difference === 1 ? "dag" : "dagen"}` };
  return {
    tone: "ok",
    label: new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(year, month - 1, day)),
  };
}
