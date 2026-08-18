import type { CalorieTrackerErrorResponse } from "@product-repos/contracts/calorie-tracker";
import { err, ok, type Result } from "../../../result.ts";

/** Typed result returned by Calorie Tracker application operations. */
export type CalorieTrackerResult<T> = Result<T, CalorieTrackerErrorResponse>;

/** Clock capability used to make time-dependent behavior deterministic. */
export type Clock = {
  /** Return the current instant. */
  now(): Date;
};

/** System clock used by production Calorie Tracker services. */
export const systemClock: Clock = {
  /** Return the current system time. */
  now: () => new Date(),
};

/** Construct a successful Calorie Tracker result. */
export function success<T>(value: T): CalorieTrackerResult<T> {
  return ok(value);
}

/** Construct a typed expected Calorie Tracker failure. */
export function failure(
  code: CalorieTrackerErrorResponse["code"],
  message: string,
  fields?: CalorieTrackerErrorResponse["fields"],
): CalorieTrackerResult<never> {
  return fields === undefined ? err({ code, message }) : err({ code, message, fields });
}

/** Classify an incompatible persisted projection as an internal invariant failure. */
export function projectionFailure(): CalorieTrackerResult<never> {
  return failure("INTERNAL_ERROR", "A stored consumption log could not be projected");
}

/** Bounded UTC window covering every real-world local offset for one date. */
export type UtcSearchWindow = { readonly startInclusive: string; readonly endExclusive: string };

/** Build a bounded UTC window that covers every real-world local offset for one date. */
export function utcSearchWindow(date: string): UtcSearchWindow {
  const dateStart = Date.parse(`${date}T00:00:00.000Z`);
  return {
    startInclusive: new Date(dateStart - 24 * 60 * 60 * 1_000).toISOString(),
    endExclusive: new Date(dateStart + 48 * 60 * 60 * 1_000).toISOString(),
  };
}

/** Return an ISO timestamp strictly later than a prior concurrency token when needed. */
export function nextTimestamp(now: Date, previous: string | undefined): string {
  if (previous === undefined || now.getTime() > Date.parse(previous)) return now.toISOString();
  return new Date(Date.parse(previous) + 1).toISOString();
}
