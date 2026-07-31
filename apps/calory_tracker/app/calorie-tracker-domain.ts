/** A successful or failed parse outcome. */
export type ParseResult<T, E> =
  | { readonly _tag: "Success"; readonly value: T }
  | { readonly _tag: "Failure"; readonly error: E };

/** Canonical date and filter state represented in Calorie Tracker URLs. */
export type TrackerUrlState = {
  readonly date: string;
  readonly type: ConsumptionFilter;
};

/** Supported logbook filters. */
export type ConsumptionFilter = "all" | "food" | "drink" | "supplement";

/** Result of URL-state canonicalization. */
export type CanonicalUrlState = {
  readonly state: TrackerUrlState;
  readonly requiresReplace: boolean;
};

/** Parsed positive decimal quantity. */
export type PositiveDecimal = { readonly canonical: string };

/** Known quantity parse failures. */
export type QuantityParseError =
  | { readonly _tag: "Required" }
  | { readonly _tag: "NotNumeric" }
  | { readonly _tag: "NotPositive" };

/** Minimum timestamps required for deterministic chronological ordering. */
export type ChronologicalRecord = {
  readonly consumedAt: string;
  readonly createdAt: string;
};

/** Product-search request mode. */
export type ProductSearchMode =
  | { readonly _tag: "Recent" }
  | { readonly _tag: "TooShort" }
  | { readonly _tag: "Search"; readonly query: string };

/** Goal-progress presentation model. */
export type GoalProgress =
  | { readonly _tag: "NoGoal"; readonly current: number }
  | {
      readonly _tag: "WithinGoal";
      readonly current: number;
      readonly goal: number;
      readonly percentage: number;
      readonly remaining: number;
    }
  | {
      readonly _tag: "AboveGoal";
      readonly current: number;
      readonly goal: number;
      readonly percentage: number;
      readonly excess: number;
      readonly goalSegmentPercentage: number;
    };

const FILTERS: ReadonlyArray<ConsumptionFilter> = ["all", "food", "drink", "supplement"];

/** Return the browser's resolved IANA timezone, with UTC as a deterministic fallback. */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Return today's local calendar date in the supplied IANA timezone. */
export function getTodayInTimezone(timezone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (year === undefined || month === undefined || day === undefined) return "1970-01-01";
  return `${year}-${month}-${day}`;
}

/** Determine whether a string is a real ISO local calendar date. */
export function isLocalDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;
  const yearText = match[1];
  const monthText = match[2];
  const dayText = match[3];
  if (yearText === undefined || monthText === undefined || dayText === undefined) return false;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Canonicalize date and optional filter values against the supplied local day. */
export function canonicalizeTrackerUrl(
  dateValue: string | null,
  typeValue: string | null,
  today: string,
): CanonicalUrlState {
  const date = dateValue !== null && isLocalDate(dateValue) && dateValue <= today ? dateValue : today;
  const type = parseConsumptionFilter(typeValue);
  return {
    state: { date, type },
    requiresReplace: dateValue !== date || typeValue !== type,
  };
}

/** Parse a logbook filter, defaulting unknown values to `all`. */
export function parseConsumptionFilter(value: string | null): ConsumptionFilter {
  return FILTERS.find((filter) => filter === value) ?? "all";
}

/** Add a whole number of days to a valid local calendar date. */
export function addCalendarDays(dateValue: string, days: number): string {
  const [yearText, monthText, dayText] = dateValue.split("-");
  if (yearText === undefined || monthText === undefined || dayText === undefined) return dateValue;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText) + days));
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((value, index) => index === 0 ? String(value).padStart(4, "0") : String(value).padStart(2, "0"))
    .join("-");
}

/** Format a valid local date for Dutch display. */
export function formatLocalDate(dateValue: string, format: "long" | "compact" = "long"): string {
  const [yearText, monthText, dayText] = dateValue.split("-");
  if (yearText === undefined || monthText === undefined || dayText === undefined) return dateValue;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  return new Intl.DateTimeFormat("nl-NL", format === "long"
    ? { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
    : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

/** Sort records from early to late and by creation time when consumption instants match. */
export function sortChronologically<T extends ChronologicalRecord>(items: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...items].sort((left, right) => left.consumedAt.localeCompare(right.consumedAt) || left.createdAt.localeCompare(right.createdAt));
}

/** Parse Dutch or canonical positive decimal input without losing the canonical retry value. */
export function parsePositiveDecimal(input: string): ParseResult<PositiveDecimal, QuantityParseError> {
  const normalized = input.trim().replace(",", ".");
  if (normalized.length === 0) return { _tag: "Failure", error: { _tag: "Required" } };
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return { _tag: "Failure", error: { _tag: "NotNumeric" } };
  }
  const [wholePart = "0", fractionPart] = normalized.split(".");
  const whole = wholePart.replace(/^0+(?=\d)/, "");
  const fraction = fractionPart?.replace(/0+$/, "");
  const canonical = fraction === undefined || fraction.length === 0 ? whole : `${whole}.${fraction}`;
  if (/^0(?:\.0*)?$/.test(canonical)) {
    return { _tag: "Failure", error: { _tag: "NotPositive" } };
  }
  return { _tag: "Success", value: { canonical } };
}

/** Select recent, idle, or searched package behavior from raw search input. */
export function getProductSearchMode(input: string): ProductSearchMode {
  const query = input.trim();
  if (query.length === 0) return { _tag: "Recent" };
  if (query.length < 2) return { _tag: "TooShort" };
  return { _tag: "Search", query };
}

/** Derive an explicit goal state for progress, remaining amount, and overflow segments. */
export function deriveGoalProgress(current: number, goal: number | null): GoalProgress {
  if (goal === null) return { _tag: "NoGoal", current };
  const percentage = Math.round((current / goal) * 100);
  if (current <= goal) {
    return { _tag: "WithinGoal", current, goal, percentage, remaining: goal - current };
  }
  const visibleTotal = current;
  return {
    _tag: "AboveGoal",
    current,
    goal,
    percentage,
    excess: current - goal,
    goalSegmentPercentage: (goal / visibleTotal) * 100,
  };
}

/** Convert a browser-local date and time to an offset-bearing instant while rejecting gaps and future values. */
export function parseLocalConsumptionMoment(
  dateValue: string,
  timeValue: string,
  now: Date = new Date(),
): ParseResult<string, { readonly _tag: "InvalidMoment" | "FutureMoment" }> {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);
  const yearText = dateMatch?.[1];
  const monthText = dateMatch?.[2];
  const dayText = dateMatch?.[3];
  const hourText = timeMatch?.[1];
  const minuteText = timeMatch?.[2];
  if (yearText === undefined || monthText === undefined || dayText === undefined || hourText === undefined || minuteText === undefined) {
    return { _tag: "Failure", error: { _tag: "InvalidMoment" } };
  }
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const local = new Date(year, month - 1, day, hour, minute, 0, 0);
  const matchesInput = local.getFullYear() === year
    && local.getMonth() === month - 1
    && local.getDate() === day
    && local.getHours() === hour
    && local.getMinutes() === minute;
  if (!matchesInput) return { _tag: "Failure", error: { _tag: "InvalidMoment" } };
  if (local.getTime() > now.getTime()) return { _tag: "Failure", error: { _tag: "FutureMoment" } };
  return { _tag: "Success", value: local.toISOString() };
}

/** Format a protocol decimal for Dutch UI, rounding only for presentation. */
export function formatDecimal(value: string | null, maximumFractionDigits: number): string {
  if (value === null) return "0";
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits }).format(Number(value));
}

/** Return an exhaustive Dutch label for a protocol consumption type. */
export function getConsumptionTypeLabel(type: "FOOD" | "DRINK" | "SUPPLEMENT"): string {
  if (type === "FOOD") return "Voeding";
  if (type === "DRINK") return "Drinken";
  return "Supplement";
}
