import type { NutritionGoal } from "../../../domain/statistics";
import { useEffect, useState, type ReactNode } from "react";
import { useRevalidator, useSearchParams } from "react-router";
import { Icon } from "../../../../../core/presentation/components/icon/icon";
import { StatusPanel } from "../../../../../core/presentation/components/status-panel/status-panel";
import { getTodayDate } from "../../../../../core/domain/dates-and-timezones";
import type { StatisticsLoaderData } from "../../types/statistics.types";
import { GoalsDialog } from "../../components/goals-dialog";
import type { GoalDraft } from "../../view-models/goals-draft";
import { StatisticsGrid } from "../../components/statistic-card";
import styles from "./statistics-page.module.css";

/**
 * Render timezone-aware calorie and macro statistics from route loader data.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function StatisticsPage({ loaderData }: { readonly loaderData: StatisticsLoaderData }): ReactNode {
  const revalidator = useRevalidator();
  const [parameters] = useSearchParams();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [lastSavedGoalDraft, setLastSavedGoalDraft] = useState<GoalDraft | null>(null);
  const { timezone, routeState, statistics, loadFailed } = loaderData;

  const isCurrentDate = !parameters.has("date");

  // Revalidate when the local date changes in the current timezone, if the route is following the current date.
  useEffect(() => {
    if (timezone === null || routeState === null || !isCurrentDate) return;
    const today = getTodayDate(timezone);
    if (routeState.date !== today) return;
    const delay = millisecondsUntilLocalDateChanges(timezone, today, new Date());
    const timer = window.setTimeout(() => void revalidator.revalidate(), delay);
    return () => window.clearTimeout(timer);
  }, [isCurrentDate, revalidator, routeState, timezone]);

  if (timezone === null || routeState === null) {
    return <main className={styles.page}><section className={styles.panel}><StatisticsSkeleton /></section></main>;
  }

  const emptyDay = statistics !== null
    && Object.values(statistics.totals).every((value) => value === null || Number(value) === 0);
  const goalActionLabel = statistics !== null && hasActiveGoals(statistics.goals)
    ? "Doelen wijzigen"
    : "Doelen instellen";

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-live="polite">
        <div className={styles.panelActions}>
          <button
            type="button"
            aria-label={goalActionLabel}
            title={goalActionLabel}
            disabled={statistics === null}
            onClick={() => setGoalsOpen(true)}
          >
            <Icon name="settings" />
          </button>
        </div>
        {loadFailed && (
          <StatusPanel
            title="Statistieken laden lukt niet"
            message="Controleer je verbinding en probeer opnieuw."
            action={<button type="button" className="ct-secondary" onClick={() => void revalidator.revalidate()}>Opnieuw proberen</button>}
          />
        )}
        {!loadFailed && statistics === null && <StatisticsSkeleton />}
        {emptyDay && <p>Nog geen consumpties op deze dag</p>}
        {statistics !== null && <StatisticsGrid data={statistics} />}
      </section>
      {goalsOpen && statistics !== null && (
        <GoalsDialog
          goals={statistics.goals}
          lastSavedDraft={lastSavedGoalDraft}
          onSaved={setLastSavedGoalDraft}
          onClose={() => setGoalsOpen(false)}
        />
      )}
    </main>
  );
}

/**
 * Determine whether at least one optional nutrition goal is active.
 *
 * @param goals - The goals value.
 * @returns The function result.
 */
function hasActiveGoals(goals: NutritionGoal | null): boolean {
  return goals !== null && Object.entries(goals).some(([key, value]) => key !== "updatedAt" && value !== null);
}

/**
 * Render stable loading geometry while timezone or route data is pending.
 *
 * @returns The function result.
 */
function StatisticsSkeleton(): ReactNode {
  return <div className={styles.skeleton} aria-label="Statistieken laden">Statistieken laden…</div>;
}

/**
 * Calculate a bounded delay until the calendar date changes in an explicit timezone.
 *
 * @param timezone - The timezone value.
 * @param currentDate - The currentDate value.
 * @param now - The now value.
 * @returns The function result.
 */
function millisecondsUntilLocalDateChanges(timezone: string, currentDate: string, now: Date): number {
  let low = now.getTime() + 1;
  let high = now.getTime() + 36 * 60 * 60 * 1_000;
  while (high - low > 1_000) {
    const middle = Math.floor((low + high) / 2);
    if (getTodayDate(timezone, new Date(middle)) === currentDate) low = middle + 1;
    else high = middle;
  }
  return Math.max(1_000, high - now.getTime() + 1_000);
}
