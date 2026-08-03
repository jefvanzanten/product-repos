import type { ConsumptionLog, ConsumptionTypeFilter } from "@product-repos/contracts/calorie-tracker";
import { getConsumptionLogs } from "../../api/calorie-tracker-api/calorie-tracker-api";
import { sortChronologically } from "../../domain/dates-and-timezones";

/** Explicit states rendered by the date-scoped logbook. */
export type LogsViewState =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "LoadFailed" }
  | { readonly _tag: "EmptyDate" }
  | { readonly _tag: "EmptyFilter" }
  | { readonly _tag: "Ready"; readonly items: ReadonlyArray<ConsumptionLog> };

/** Derive loading, failure, and semantically distinct empty logbook states. */
export function deriveLogsViewState(
  outcome: Awaited<ReturnType<typeof getConsumptionLogs>> | undefined,
  filter: ConsumptionTypeFilter,
  unfilteredOutcome: Awaited<ReturnType<typeof getConsumptionLogs>> | undefined,
): LogsViewState {
  if (outcome === undefined) return { _tag: "Loading" };
  if (outcome._tag === "Failure") return { _tag: "LoadFailed" };
  if (outcome.value.items.length > 0) return { _tag: "Ready", items: outcome.value.items };
  if (filter === "all") return { _tag: "EmptyDate" };
  if (unfilteredOutcome === undefined) return { _tag: "Loading" };
  if (unfilteredOutcome._tag === "Failure") return { _tag: "LoadFailed" };
  return unfilteredOutcome.value.items.length === 0 ? { _tag: "EmptyDate" } : { _tag: "EmptyFilter" };
}

/** Merge a successfully restored log into the active view while its refetch completes. */
export function withRestoredLog(
  state: LogsViewState,
  restoredLog: ConsumptionLog | null,
  date: string,
  filter: ConsumptionTypeFilter,
): LogsViewState {
  if (restoredLog === null || restoredLog.localDate !== date) return state;
  const restoredType = restoredLog.package.consumptionType.toLowerCase();
  if (filter !== "all" && filter !== restoredType) return state;
  if (state._tag === "Loading" || state._tag === "LoadFailed") return state;
  const currentItems = state._tag === "Ready" ? state.items : [];
  return {
    _tag: "Ready",
    items: sortChronologically([
      ...currentItems.filter((item) => item.id !== restoredLog.id),
      restoredLog,
    ]),
  };
}
