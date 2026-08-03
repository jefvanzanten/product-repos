import type { ConsumptionTypeFilter } from "@product-repos/contracts/calorie-tracker";
import { isLocalDate } from "../domain/dates-and-timezones";
import type { LogbookRouteState } from "./calorie-tracker-routes";

const filters: ReadonlyArray<ConsumptionTypeFilter> = ["all", "food", "drink", "supplement"];

/** Result of canonicalizing Calorie Tracker URL state. */
export type CanonicalTrackerUrlState = {
  readonly state: LogbookRouteState;
  readonly requiresReplace: boolean;
};

/** Canonicalize an optional date and filter against the current local day. */
export function canonicalizeTrackerUrlState(
  dateValue: string | null,
  typeValue: string | null,
  today: string,
): CanonicalTrackerUrlState {
  const date = dateValue !== null && isLocalDate(dateValue) && dateValue <= today ? dateValue : today;
  const type = parseConsumptionTypeFilter(typeValue);
  return {
    state: { date, type },
    requiresReplace: dateValue !== date || typeValue !== type,
  };
}

/** Parse a shared consumption filter and default unsupported values to `all`. */
export function parseConsumptionTypeFilter(value: string | null): ConsumptionTypeFilter {
  return filters.find((filter) => filter === value) ?? "all";
}
