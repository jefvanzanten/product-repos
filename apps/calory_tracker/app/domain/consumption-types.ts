import type { ConsumptionTypeFilter } from "@product-repos/contracts/calorie-tracker";
import { isLocalDate } from "./dates-and-timezones";

/** Canonical date and filter state represented in Calorie Tracker URLs. */
export type TrackerUrlState = {
  readonly date: string;
  readonly type: ConsumptionTypeFilter;
};

/** Result of URL-state canonicalization. */
export type CanonicalUrlState = {
  readonly state: TrackerUrlState;
  readonly requiresReplace: boolean;
};

/** Product-search request mode. */
export type ProductSearchMode =
  | { readonly _tag: "Recent" }
  | { readonly _tag: "TooShort" }
  | { readonly _tag: "Search"; readonly query: string };

const filters: ReadonlyArray<ConsumptionTypeFilter> = ["all", "food", "drink", "supplement"];

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
export function parseConsumptionFilter(value: string | null): ConsumptionTypeFilter {
  return filters.find((filter) => filter === value) ?? "all";
}

/** Select recent, idle, or searched package behavior from raw search input. */
export function getProductSearchMode(input: string): ProductSearchMode {
  const query = input.trim();
  if (query.length === 0) return { _tag: "Recent" };
  if (query.length < 2) return { _tag: "TooShort" };
  return { _tag: "Search", query };
}

/** Return an exhaustive Dutch label for a protocol consumption type. */
export function getConsumptionTypeLabel(type: "FOOD" | "DRINK" | "SUPPLEMENT"): string {
  if (type === "FOOD") return "Voeding";
  if (type === "DRINK") return "Drinken";
  return "Supplement";
}
