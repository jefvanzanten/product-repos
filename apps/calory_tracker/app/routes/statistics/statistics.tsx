import type { ConsumptionTypeFilter, DailyStatistics, NutritionGoal } from "@product-repos/contracts/calorie-tracker";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { getDailyStatistics } from "../../api/calorie-tracker-api/calorie-tracker-api";
import { calorieTrackerQueryKeys } from "../../api/calorie-tracker-api/calorie-tracker-query-keys";
import { Icon } from "../../components/icon/icon";
import { StatusPanel } from "../../components/status-panel/status-panel";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import { getTodayInTimezone } from "../../domain/dates-and-timezones";
import { useBrowserTimezone } from "../../hooks/use-browser-timezone";
import type { CalorieTrackerRouteHandle } from "../../routing/calorie-tracker-routes";
import { GoalsDialog } from "./goals-dialog";
import type { GoalDraft } from "./goals-draft";
import { StatisticsGrid } from "./statistic-card";
import styles from "./statistics.module.css";

type StatisticsViewState =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "LoadFailed" }
  | { readonly _tag: "Ready"; readonly data: DailyStatistics }
  | { readonly _tag: "EmptyDay"; readonly data: DailyStatistics };

/** Route metadata enables the shared tracker date header without path matching. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: true,
  showsDateHeader: true,
};

/** Return metadata for the Calorie Tracker statistics route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Caloriestatistieken | Calorie Tracker" }];
}

/** Render date-scoped calorie and macro statistics with optional personal goals. */
export default function StatisticsRoute(): ReactNode {
  const resolvedTimezone = useBrowserTimezone();
  const timezone = resolvedTimezone ?? "UTC";
  const [parameters, setParameters] = useSearchParams();
  const today = getTodayInTimezone(timezone);
  const carriesLogFilter = parameters.has("type");
  const canonical = canonicalizeTrackerUrl(parameters.get("date"), parameters.get("type"), today);
  const { date, type } = canonical.state;
  const requiresStatisticsReplace = parameters.get("date") !== date
    || (carriesLogFilter && parameters.get("type") !== type);
  const statisticsParameters = useMemo(
    () => createStatisticsParameters(date, type, carriesLogFilter),
    [carriesLogFilter, date, type],
  );
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [lastSavedGoalDraft, setLastSavedGoalDraft] = useState<GoalDraft | null>(null);

  useEffect(() => {
    if (resolvedTimezone === null || !requiresStatisticsReplace) return;
    setParameters(statisticsParameters, { replace: true });
  }, [requiresStatisticsReplace, resolvedTimezone, setParameters, statisticsParameters]);

  useEffect(() => {
    if (resolvedTimezone === null || date !== today) return;
    const delay = millisecondsUntilLocalDateChanges(timezone, today, new Date());
    const timer = window.setTimeout(() => {
      setParameters(createStatisticsParameters(getTodayInTimezone(timezone), type, carriesLogFilter), { replace: true });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [carriesLogFilter, date, resolvedTimezone, setParameters, timezone, today, type]);

  const statisticsQuery = useQuery({
    queryKey: calorieTrackerQueryKeys.statistics(date, timezone),
    enabled: resolvedTimezone !== null,
    retry: false,
    queryFn: ({ signal }) => getDailyStatistics(date, { timezone, signal }),
  });
  const viewState = deriveStatisticsViewState(
    statisticsQuery.data,
    resolvedTimezone === null || statisticsQuery.isPending,
  );
  const goalActionLabel = (viewState._tag === "Ready" || viewState._tag === "EmptyDay")
    && hasActiveGoals(viewState.data.goals)
    ? "Doelen wijzigen"
    : "Doelen instellen";

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-live="polite">
        <div className={styles.panelActions}>
          <button type="button" aria-label={goalActionLabel} title={goalActionLabel} onClick={() => setGoalsOpen(true)}>
            <Icon name="settings" />
          </button>
        </div>
        {viewState._tag === "Loading" && <StatisticsSkeleton />}
        {viewState._tag === "LoadFailed" && (
          <StatusPanel
            title="Statistieken laden lukt niet"
            message="Controleer je verbinding en probeer opnieuw."
            action={<button type="button" className="ct-secondary" onClick={() => void statisticsQuery.refetch()}>Opnieuw proberen</button>}
          />
        )}
        {viewState._tag === "EmptyDay" && <p>Nog geen consumpties op deze dag</p>}
        {(viewState._tag === "Ready" || viewState._tag === "EmptyDay") && <StatisticsGrid data={viewState.data} />}
      </section>
      {goalsOpen && (viewState._tag === "Ready" || viewState._tag === "EmptyDay") && (
        <GoalsDialog
          goals={viewState.data.goals}
          lastSavedDraft={lastSavedGoalDraft}
          date={date}
          timezone={timezone}
          onSaved={setLastSavedGoalDraft}
          onClose={() => setGoalsOpen(false)}
        />
      )}
    </main>
  );
}

/** Build statistics URL state while retaining a filter from logbook context. */
function createStatisticsParameters(date: string, type: ConsumptionTypeFilter, includeType: boolean): URLSearchParams {
  const next = new URLSearchParams({ date });
  if (includeType) next.set("type", type);
  return next;
}

/** Determine whether at least one optional nutrition goal is active. */
function hasActiveGoals(goals: NutritionGoal | null): boolean {
  return goals !== null && Object.entries(goals).some(([key, value]) => key !== "updatedAt" && value !== null);
}

/** Derive the explicit route view state from one parsed API outcome. */
function deriveStatisticsViewState(
  outcome: Awaited<ReturnType<typeof getDailyStatistics>> | undefined,
  isPending: boolean,
): StatisticsViewState {
  if (isPending || outcome === undefined) return { _tag: "Loading" };
  if (outcome._tag === "Failure") return { _tag: "LoadFailed" };
  const isEmpty = Object.values(outcome.value.totals).every((value) => value === null || Number(value) === 0);
  return isEmpty ? { _tag: "EmptyDay", data: outcome.value } : { _tag: "Ready", data: outcome.value };
}

/** Render stable loading geometry for the final statistics cards. */
function StatisticsSkeleton(): ReactNode {
  return <div className={styles.skeleton} aria-label="Statistieken laden">Statistieken laden…</div>;
}

/** Calculate a bounded delay until the calendar date changes in an explicit timezone. */
function millisecondsUntilLocalDateChanges(timezone: string, currentDate: string, now: Date): number {
  let low = now.getTime() + 1;
  let high = now.getTime() + 36 * 60 * 60 * 1_000;
  while (high - low > 1_000) {
    const middle = Math.floor((low + high) / 2);
    if (getTodayInTimezone(timezone, new Date(middle)) === currentDate) low = middle + 1;
    else high = middle;
  }
  return Math.max(1_000, high - now.getTime() + 1_000);
}
