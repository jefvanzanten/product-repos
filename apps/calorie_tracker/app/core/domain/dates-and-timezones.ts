import type { ParseResult } from "./quantities";

/** Minimum timestamps required for deterministic chronological ordering. */
export type ChronologicalRecord = {
  readonly consumedAt: string;
  readonly createdAt: string;
};

/** Local date-time fields resolved through an explicit IANA timezone. */
type LocalMomentFields = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
};

/** Known failures while resolving a wall-clock moment. */
export type LocalConsumptionMomentError = {
  readonly tag: "InvalidMoment" | "AmbiguousMoment" | "FutureMoment";
};

/** Original edit values that may retain an instant with seconds and offset intact. */
export type OriginalConsumptionMoment = {
  readonly date: string;
  readonly time: string;
  readonly consumedAt: string;
};

/** Return today's local calendar date in the supplied IANA timezone. */
export function getTodayDate(timezone: string, now: Date = new Date()): string {
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

/** Add a whole number of days to a valid local calendar date. */
export function addCalendarDays(dateValue: string, days: number): string {
  const [yearText, monthText, dayText] = dateValue.split("-");
  if (yearText === undefined || monthText === undefined || dayText === undefined) return dateValue;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText) + days));
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((value, index) => index === 0 ? String(value).padStart(4, "0") : String(value).padStart(2, "0"))
    .join("-");
}

/** Sort records from early to late and by creation time when consumption instants match. */
export function sortChronologically<T extends ChronologicalRecord>(items: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...items].sort((left, right) => left.consumedAt.localeCompare(right.consumedAt) || left.createdAt.localeCompare(right.createdAt));
}

/** Convert a local date and time in an explicit IANA timezone to one unambiguous instant. */
export function parseLocalConsumptionMoment(
  dateValue: string,
  timeValue: string,
  timezone: string,
  now: Date = new Date(),
): ParseResult<string, LocalConsumptionMomentError> {
  const fields = parseLocalMomentFields(dateValue, timeValue);
  if (fields === null) return { tag: "Failure", error: { tag: "InvalidMoment" } };

  let candidates: ReadonlyArray<number>;
  try {
    candidates = findZonedMomentCandidates(fields, timezone);
  } catch {
    return { tag: "Failure", error: { tag: "InvalidMoment" } };
  }
  if (candidates.length === 0) return { tag: "Failure", error: { tag: "InvalidMoment" } };
  if (candidates.length > 1) return { tag: "Failure", error: { tag: "AmbiguousMoment" } };
  const instant = candidates[0];
  if (instant === undefined) return { tag: "Failure", error: { tag: "InvalidMoment" } };
  if (instant > now.getTime()) return { tag: "Failure", error: { tag: "FutureMoment" } };
  return { tag: "Success", value: new Date(instant).toISOString() };
}

/** Preserve an edited log's exact instant when its minute-level local fields are unchanged. */
export function parseEditedConsumptionMoment(
  dateValue: string,
  timeValue: string,
  timezone: string,
  original: OriginalConsumptionMoment | null,
  now: Date = new Date(),
): ParseResult<string, LocalConsumptionMomentError> {
  if (original !== null && dateValue === original.date && timeValue === original.time) {
    return Date.parse(original.consumedAt) <= now.getTime()
      ? { tag: "Success", value: original.consumedAt }
      : { tag: "Failure", error: { tag: "FutureMoment" } };
  }
  return parseLocalConsumptionMoment(dateValue, timeValue, timezone, now);
}

/** Parse and range-check local date and time text without using the ambient runtime timezone. */
function parseLocalMomentFields(dateValue: string, timeValue: string): LocalMomentFields | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);
  const year = Number(dateMatch?.[1]);
  const month = Number(dateMatch?.[2]);
  const day = Number(dateMatch?.[3]);
  const hour = Number(timeMatch?.[1]);
  const minute = Number(timeMatch?.[2]);
  if (![year, month, day, hour, minute].every(Number.isInteger) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return null;
  return { year, month, day, hour, minute };
}

/** Find all instants matching local fields so DST gaps and folds remain explicit. */
function findZonedMomentCandidates(fields: LocalMomentFields, timezone: string): ReadonlyArray<number> {
  const localAsUtc = Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute);
  const probeDeltas = [-36, -12, 0, 12, 36].map((hours) => hours * 60 * 60 * 1_000);
  const offsets = new Set(probeDeltas.map((delta) => zonedOffsetMilliseconds(localAsUtc + delta, timezone)));
  const candidates = [...offsets]
    .map((offset) => localAsUtc - offset)
    .filter((instant) => sameLocalMoment(zonedMomentFields(instant, timezone), fields));
  return [...new Set(candidates)].sort((left, right) => left - right);
}

/** Calculate the timezone offset represented at one probe instant. */
function zonedOffsetMilliseconds(instant: number, timezone: string): number {
  const fields = zonedMomentFields(instant, timezone);
  const representedAsUtc = Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute);
  return representedAsUtc - instant;
}

/** Project an instant into minute-level local fields in an explicit IANA timezone. */
function zonedMomentFields(instant: number, timezone: string): LocalMomentFields {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const value = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") };
}

/** Compare two local minute-level field sets. */
function sameLocalMoment(left: LocalMomentFields, right: LocalMomentFields): boolean {
  return left.year === right.year
    && left.month === right.month
    && left.day === right.day
    && left.hour === right.hour
    && left.minute === right.minute;
}
