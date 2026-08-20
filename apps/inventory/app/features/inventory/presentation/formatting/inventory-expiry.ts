import { classifyInventoryExpiry } from "../../domain/inventory-expiry";
import type { PhysicalInventoryProductGroup } from "../../domain/inventory";

/** Visual tones available for expiry labels. */
export type ExpiryTone = "expired" | "today" | "soon" | "ok" | "none";

/** Display-ready expiry status. */
export type ExpiryStatus = { readonly tone: ExpiryTone; readonly label: string };

/**
 * Present one package expiry date against the current local calendar date.
 *
 * @param expiryDate - ISO local expiry date or null.
 * @param now - Current clock value, injectable for deterministic tests.
 * @returns Dutch expiry label and visual tone.
 */
export function presentExpiryDate(expiryDate: string | null, now: Date = new Date()): ExpiryStatus {
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((value, index) => index === 0 ? String(value).padStart(4, "0") : String(value).padStart(2, "0"))
    .join("-");
  const classification = classifyInventoryExpiry(expiryDate, today);
  switch (classification.tag) {
    case "None": return { tone: "none", label: "Geen datum" };
    case "Expired": return { tone: "expired", label: `${classification.days} ${classification.days === 1 ? "dag" : "dagen"} verlopen` };
    case "Today": return { tone: "today", label: "Verloopt vandaag" };
    case "Urgent": return { tone: "soon", label: `Urgent · nog ${classification.days} ${classification.days === 1 ? "dag" : "dagen"}` };
    case "Soon": return { tone: "soon", label: `Binnenkort · nog ${classification.days} dagen` };
    case "Later": return { tone: "ok", label: formatLocalDate(classification.date) };
  }
}

/**
 * Present a backend-derived group expiry classification.
 *
 * @param code - Group-level expiry code.
 * @returns Dutch expiry label and tone.
 */
export function presentGroupExpiry(code: PhysicalInventoryProductGroup["earliestExpiryStatus"]): ExpiryStatus {
  const values = {
    EXPIRED: { tone: "expired", label: "Verlopen" },
    TODAY: { tone: "today", label: "Verloopt vandaag" },
    URGENT: { tone: "soon", label: "Urgent" },
    SOON: { tone: "soon", label: "Binnenkort" },
    LATER: { tone: "ok", label: "Later" },
    NONE: { tone: "none", label: "Geen datum" },
  } satisfies Record<typeof code, ExpiryStatus>;
  return values[code];
}

/** Format one ISO expiry date for compact detail-row presentation. */
export function formatInventoryExpiryDate(value: string): string {
  const [year = "1970", month = "01", day = "01"] = value.split("-");
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(Number(year), Number(month) - 1, Number(day)));
}

/** Format one ISO local date without shifting it through UTC. */
function formatLocalDate(value: string): string {
  const [year = "1970", month = "01", day = "01"] = value.split("-");
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(Number(year), Number(month) - 1, Number(day)));
}
