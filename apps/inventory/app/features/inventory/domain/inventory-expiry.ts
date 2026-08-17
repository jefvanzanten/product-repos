/** Domain classifications for a physical package's expiry date. */
export type InventoryExpiryClassification =
  | { readonly tag: "None" }
  | { readonly tag: "Expired"; readonly days: number }
  | { readonly tag: "Today" }
  | { readonly tag: "Urgent"; readonly days: number }
  | { readonly tag: "Soon"; readonly days: number }
  | { readonly tag: "Later"; readonly date: string };

const dayInMilliseconds = 86_400_000;

/**
 * Classify an ISO local expiry date against an explicit local calendar date.
 *
 * @param expiryDate - ISO local expiry date, or null when unknown.
 * @param today - Current ISO local calendar date.
 * @returns The feature-domain expiry classification.
 */
export function classifyInventoryExpiry(expiryDate: string | null, today: string): InventoryExpiryClassification {
  if (expiryDate === null) return { tag: "None" };
  const difference = Math.round((toUtcDate(expiryDate) - toUtcDate(today)) / dayInMilliseconds);
  if (difference < 0) return { tag: "Expired", days: Math.abs(difference) };
  if (difference === 0) return { tag: "Today" };
  if (difference <= 3) return { tag: "Urgent", days: difference };
  if (difference <= 7) return { tag: "Soon", days: difference };
  return { tag: "Later", date: expiryDate };
}

/**
 * Convert an ISO local date to a timezone-independent epoch.
 *
 * @param value - Valid ISO local calendar date.
 * @returns UTC epoch at the start of that represented date.
 */
function toUtcDate(value: string): number {
  const [year = "1970", month = "01", day = "01"] = value.split("-");
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}
