import type { DailyStatistics } from "../../domain/statistics";
import type { ReactNode } from "react";
import { deriveGoalProgress } from "../../domain/goal-progress";
import { formatDecimal } from "../../../../core/presentation/formatting/numbers";
import { STATISTICS, type StatisticDefinition } from "../statistics";
import styles from "../pages/statistics-page/statistics-page.module.css";

/**
 * Render the calorie card and three macro cards in responsive composition.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function StatisticsGrid({ data }: { readonly data: DailyStatistics }): ReactNode {
  return (
    <div className={styles.statisticsGrid}>
      <StatisticCard definition={STATISTICS[0]} data={data} featured />
      <div className={styles.macros}>
        {STATISTICS.slice(1).map((definition) => (
          <StatisticCard key={definition.key} definition={definition} data={data} />
        ))}
      </div>
    </div>
  );
}

/**
 * Render a total-only or goal-progress statistic card.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
function StatisticCard({
  definition,
  data,
  featured = false,
}: {
  readonly definition: StatisticDefinition | undefined;
  readonly data: DailyStatistics;
  readonly featured?: boolean;
}): ReactNode {
  if (definition === undefined) return null;
  const currentRaw = data.totals[definition.key];
  const current = currentRaw === null ? 0 : Number(currentRaw);
  const goalRaw = data.goals?.[definition.key] ?? null;
  const goal = goalRaw === null ? null : Number(goalRaw);
  const progress = deriveGoalProgress(current, goal);
  const formattedCurrent = formatDecimal(currentRaw, definition.fractions);
  const formattedGoal = goalRaw === null
    ? null
    : formatDecimal(String(goalRaw), definition.fractions);

  if (progress.tag === "NoGoal") {
    return (
      <article className={`${styles.statCard} ${featured ? styles.featured : ""}`}>
        <h2>{definition.label}</h2>
        <strong>{formattedCurrent} {definition.unit}</strong>
        <p>op deze dag</p>
      </article>
    );
  }

  const withinWidth = progress.tag === "AboveGoal"
    ? progress.goalSegmentPercentage
    : Math.min(100, progress.percentage);
  const excessWidth = progress.tag === "AboveGoal" ? 100 - progress.goalSegmentPercentage : 0;
  return (
    <article className={`${styles.statCard} ${featured ? styles.featured : ""}`}>
      <div className={styles.statHeader}>
        <h2>{definition.label}</h2>
        <span className={progress.tag === "AboveGoal" ? styles.dangerText : ""}>
          {formattedCurrent} / {formattedGoal} {definition.unit}
        </span>
      </div>
      {featured && <strong>{formattedCurrent} {definition.unit}</strong>}
      <div
        className={styles.progress}
        role="progressbar"
        aria-label={`${definition.label}: ${progress.percentage}% van het dagdoel`}
        aria-valuemin={0}
        aria-valuenow={Math.min(current, progress.goal)}
        aria-valuemax={progress.goal}
        aria-valuetext={progress.tag === "AboveGoal"
          ? `${formattedCurrent} ${definition.unit}; ${formatNumber(progress.excess, definition.fractions)} ${definition.unit} boven doel`
          : `${progress.percentage}% van het dagdoel`}
      >
        <span className={styles.progressWithin} style={{ width: `${withinWidth}%` }} />
        {excessWidth > 0 && <span className={styles.progressExcess} style={{ width: `${excessWidth}%` }} />}
      </div>
      <p>{progress.tag === "AboveGoal"
        ? `${formatNumber(progress.excess, definition.fractions)} ${definition.unit} boven doel`
        : `${progress.percentage}% van je dagdoel`}</p>
      {featured && progress.tag === "WithinGoal" && <b>{formatNumber(progress.remaining, definition.fractions)} {definition.unit} resterend</b>}
      {featured && progress.tag === "AboveGoal" && <b className={styles.dangerText}>{formatNumber(progress.excess, definition.fractions)} {definition.unit} boven doel</b>}
    </article>
  );
}

/**
 * Format a computed presentation number using Dutch separators.
 *
 * @param value - The value value.
 * @param fractions - The fractions value.
 * @returns The function result.
 */
function formatNumber(value: number, fractions: number): string {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: fractions }).format(value);
}
