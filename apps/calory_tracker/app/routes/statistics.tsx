import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import type { ConsumptionTypeFilter, DailyStatistics, NutritionGoal, UpsertNutritionGoal } from "@product-repos/contracts/calorie-tracker";
import { getDailyStatistics, putNutritionGoals } from "../calorie-tracker-api";
import {
  canonicalizeTrackerUrl,
  deriveGoalProgress,
  formatDecimal,
  formatLocalDate,
  getTodayInTimezone,
  parsePositiveDecimal,
} from "../calorie-tracker-domain";
import { DateControl, FocusDialog, Icon, StatusPanel } from "../calorie-tracker-components";
import { useBrowserTimezone } from "../use-browser-timezone";
import styles from "./statistics.module.css";

type StatisticDefinition = {
  readonly key: "caloriesKcal" | "proteinG" | "carbohydratesG" | "fatG";
  readonly label: string;
  readonly unit: "kcal" | "g";
  readonly fractions: number;
};

type StatisticsViewState =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "LoadFailed" }
  | { readonly _tag: "Ready"; readonly data: DailyStatistics }
  | { readonly _tag: "EmptyDay"; readonly data: DailyStatistics };

const STATISTICS: ReadonlyArray<StatisticDefinition> = [
  { key: "caloriesKcal", label: "Calorieën", unit: "kcal", fractions: 0 },
  { key: "proteinG", label: "Eiwit", unit: "g", fractions: 1 },
  { key: "carbohydratesG", label: "Koolhydraten", unit: "g", fractions: 1 },
  { key: "fatG", label: "Vet", unit: "g", fractions: 1 },
];

/** Build statistics URL state while retaining a filter only when it came from logbook context. */
function createStatisticsParameters(date: string, type: ConsumptionTypeFilter, includeType: boolean): URLSearchParams {
  const parameters = new URLSearchParams({ date });
  if (includeType) parameters.set("type", type);
  return parameters;
}

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
  const requiresStatisticsReplace = parameters.get("date") !== date || (carriesLogFilter && parameters.get("type") !== type);
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
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = window.setTimeout(() => setParameters(createStatisticsParameters(getTodayInTimezone(timezone), type, carriesLogFilter), { replace: true }), nextMidnight.getTime() - now.getTime());
    return () => window.clearTimeout(timer);
  }, [carriesLogFilter, date, resolvedTimezone, setParameters, timezone, today, type]);

  const statisticsQuery = useQuery({
    queryKey: ["calorie-tracker", "statistics", date, timezone],
    enabled: resolvedTimezone !== null,
    queryFn: ({ signal }) => getDailyStatistics(date, { timezone, signal }),
  });
  const viewState = deriveStatisticsViewState(statisticsQuery.data, resolvedTimezone === null || statisticsQuery.isPending);

  return (
    <main className={styles.page}>
      <div className={styles.mobileDate}>
        <DateControl date={date} today={today} onChange={(nextDate) => setParameters(createStatisticsParameters(nextDate, type, carriesLogFilter))} />
      </div>
      <header className={styles.header}>
        <div className={styles.headerDate}>
          <h1>{date === today ? "Vandaag" : formatLocalDate(date, "compact")}</h1>
          <p>{formatLocalDate(date)}{date === today ? " · vandaag" : ""}</p>
          <input type="date" value={date} max={today} aria-label="Geselecteerde datum wijzigen" onChange={(event) => setParameters(createStatisticsParameters(event.currentTarget.value, type, carriesLogFilter))} />
        </div>
        <button type="button" className="ct-primary" onClick={() => setGoalsOpen(true)}>
          {(viewState._tag === "Ready" || viewState._tag === "EmptyDay") && hasActiveGoals(viewState.data.goals) ? "Doelen wijzigen" : "Doelen instellen"}
        </button>
      </header>

      <section className={styles.panel} aria-live="polite">
        <div className={styles.panelActions}>
          <button type="button" aria-label="Persoonlijke dagdoelen beheren" onClick={() => setGoalsOpen(true)}>
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

/** Determine whether at least one optional nutrition goal is active. */
function hasActiveGoals(goals: NutritionGoal | null): boolean {
  return goals !== null && (goals.caloriesKcal !== null || goals.proteinG !== null || goals.carbohydratesG !== null || goals.fatG !== null);
}

/** Derive the explicit route view state from one parsed API outcome. */
function deriveStatisticsViewState(
  outcome: Awaited<ReturnType<typeof getDailyStatistics>> | undefined,
  isPending: boolean,
): StatisticsViewState {
  if (isPending || outcome === undefined) return { _tag: "Loading" };
  if (outcome._tag === "Failure") return { _tag: "LoadFailed" };
  const values = Object.values(outcome.value.totals);
  const isEmpty = values.every((value) => value === null || Number(value) === 0);
  return isEmpty ? { _tag: "EmptyDay", data: outcome.value } : { _tag: "Ready", data: outcome.value };
}

/** Render stable loading cards matching the final statistics geometry. */
function StatisticsSkeleton(): ReactNode {
  return <div className={styles.skeleton} aria-label="Statistieken laden">Statistieken laden…</div>;
}

/** Render the calorie card and three macro cards in responsive Figma composition. */
function StatisticsGrid({ data }: { readonly data: DailyStatistics }): ReactNode {
  return (
    <div className={styles.statisticsGrid}>
      <StatisticCard definition={STATISTICS[0]} data={data} featured />
      <div className={styles.macros}>
        {STATISTICS.slice(1).map((definition) => <StatisticCard key={definition.key} definition={definition} data={data} />)}
      </div>
      <aside className={styles.dayStatus}>
        <strong>{Object.values(data.totals).every((value) => value === null || Number(value) === 0) ? "Nog geen consumpties op deze dag" : "Dagtotalen bijgewerkt"}</strong>
        <span>Totalen zijn gebaseerd op actuele product- en verpakkingsgegevens.</span>
      </aside>
    </div>
  );
}

/** Render a total-only or goal-progress statistic card. */
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
  const formattedGoal = goalRaw === null ? null : typeof goalRaw === "number"
    ? new Intl.NumberFormat("nl-NL").format(goalRaw)
    : formatDecimal(goalRaw, definition.fractions);

  if (progress._tag === "NoGoal") {
    return (
      <article className={`${styles.statCard} ${featured ? styles.featured : ""}`}>
        <h2>{definition.label}</h2>
        <strong>{formattedCurrent} {definition.unit}</strong>
        <p>op deze dag</p>
      </article>
    );
  }

  const withinWidth = progress._tag === "AboveGoal" ? progress.goalSegmentPercentage : Math.min(100, progress.percentage);
  const excessWidth = progress._tag === "AboveGoal" ? 100 - progress.goalSegmentPercentage : 0;
  return (
    <article className={`${styles.statCard} ${featured ? styles.featured : ""}`}>
      <div className={styles.statHeader}>
        <h2>{definition.label}</h2>
        <span className={progress._tag === "AboveGoal" ? styles.dangerText : ""}>{formattedCurrent} / {formattedGoal} {definition.unit}</span>
      </div>
      {featured && <strong>{formattedCurrent} {definition.unit}</strong>}
      <div
        className={styles.progress}
        role="progressbar"
        aria-label={`${definition.label}: ${progress.percentage}% van het dagdoel`}
        aria-valuemin={0}
        aria-valuenow={Math.min(current, progress.goal)}
        aria-valuemax={progress.goal}
        aria-valuetext={progress._tag === "AboveGoal"
          ? `${formattedCurrent} ${definition.unit}; ${formatNumber(progress.excess, definition.fractions)} ${definition.unit} boven doel`
          : `${progress.percentage}% van het dagdoel`}
      >
        <span className={styles.progressWithin} style={{ width: `${withinWidth}%` }} />
        {excessWidth > 0 && <span className={styles.progressExcess} style={{ width: `${excessWidth}%` }} />}
      </div>
      <p>{progress._tag === "AboveGoal" ? `${formatNumber(progress.excess, definition.fractions)} ${definition.unit} boven doel` : `${progress.percentage}% van je dagdoel`}</p>
      {featured && progress._tag === "WithinGoal" && <b>{formatNumber(progress.remaining, definition.fractions)} {definition.unit} resterend</b>}
      {featured && progress._tag === "AboveGoal" && <b className={styles.dangerText}>{formatNumber(progress.excess, definition.fractions)} {definition.unit} boven doel</b>}
    </article>
  );
}

/** Format a computed presentation number using Dutch separators. */
function formatNumber(value: number, fractions: number): string {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: fractions }).format(value);
}

type GoalDraft = {
  readonly enabled: Record<StatisticDefinition["key"], boolean>;
  readonly values: Record<StatisticDefinition["key"], string>;
};

/** Render and persist the accessible optional-goals modal. */
function GoalsDialog({
  goals,
  lastSavedDraft,
  date,
  timezone,
  onSaved,
  onClose,
}: {
  readonly goals: NutritionGoal | null;
  readonly lastSavedDraft: GoalDraft | null;
  readonly date: string;
  readonly timezone: string;
  readonly onSaved: (draft: GoalDraft) => void;
  readonly onClose: () => void;
}): ReactNode {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<GoalDraft>(() => createGoalDraft(goals, lastSavedDraft));
  const [error, setError] = useState<string | null>(null);
  const closeDialog = useCallback(() => onClose(), [onClose]);
  const mutation = useMutation({
    mutationFn: (input: UpsertNutritionGoal) => putNutritionGoals(input, { timezone, signal: new AbortController().signal }),
  });

  /** Parse and save enabled draft values while preserving failures in the dialog. */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = parseGoalDraft(draft);
    if (parsed._tag === "Failure") {
      setError(parsed.error);
      return;
    }
    const outcome = await mutation.mutateAsync(parsed.value);
    if (outcome._tag === "Failure") {
      setError(outcome.error._tag === "HttpFailure" ? outcome.error.response.message : "Doelen opslaan lukt niet. Probeer opnieuw.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["calorie-tracker", "statistics", date, timezone] });
    onSaved(draft);
    onClose();
  }

  return (
    <FocusDialog title="Persoonlijke dagdoelen" onClose={closeDialog}>
      <form className={styles.goalsForm} onSubmit={(event) => void handleSubmit(event)}>
        <header>
          <h2>Persoonlijke dagdoelen</h2>
          <p>Schakel doelen afzonderlijk in of uit.</p>
        </header>
        {STATISTICS.map((definition) => (
          <label className={styles.goalRow} key={definition.key}>
            <span className={styles.switchLabel}>
              <input
                type="checkbox"
                checked={draft.enabled[definition.key]}
                onChange={(event) => setDraft({ ...draft, enabled: { ...draft.enabled, [definition.key]: event.currentTarget.checked } })}
              />
              <span>{definition.label}</span>
            </span>
            <span className={styles.goalInput}>
              <input
                inputMode="decimal"
                required={draft.enabled[definition.key]}
                disabled={!draft.enabled[definition.key]}
                value={draft.values[definition.key]}
                aria-label={`${definition.label} doel`}
                onChange={(event) => setDraft({ ...draft, values: { ...draft.values, [definition.key]: event.currentTarget.value } })}
              />
              <b>{definition.unit}</b>
            </span>
          </label>
        ))}
        {error !== null && <p className={styles.formError} role="alert">{error}</p>}
        <footer>
          <button type="button" className="ct-secondary" onClick={onClose}>Annuleren</button>
          <button type="submit" className="ct-primary" disabled={mutation.isPending}><Icon name="add" />{mutation.isPending ? "Opslaan…" : "Opslaan"}</button>
        </footer>
      </form>
    </FocusDialog>
  );
}

/** Create an editable goals concept while retaining values from the last successful save. */
function createGoalDraft(goals: NutritionGoal | null, lastSavedDraft: GoalDraft | null): GoalDraft {
  return {
    enabled: {
      caloriesKcal: goals?.caloriesKcal !== null && goals?.caloriesKcal !== undefined,
      proteinG: goals?.proteinG !== null && goals?.proteinG !== undefined,
      carbohydratesG: goals?.carbohydratesG !== null && goals?.carbohydratesG !== undefined,
      fatG: goals?.fatG !== null && goals?.fatG !== undefined,
    },
    values: {
      caloriesKcal: goals?.caloriesKcal === null || goals?.caloriesKcal === undefined ? lastSavedDraft?.values.caloriesKcal ?? "" : String(goals.caloriesKcal),
      proteinG: goals?.proteinG ?? lastSavedDraft?.values.proteinG ?? "",
      carbohydratesG: goals?.carbohydratesG ?? lastSavedDraft?.values.carbohydratesG ?? "",
      fatG: goals?.fatG ?? lastSavedDraft?.values.fatG ?? "",
    },
  };
}

/** Parse goal toggles and values into the shared replacement contract input. */
function parseGoalDraft(draft: GoalDraft): { readonly _tag: "Success"; readonly value: UpsertNutritionGoal } | { readonly _tag: "Failure"; readonly error: string } {
  const parsedValues: Record<StatisticDefinition["key"], string | null> = {
    caloriesKcal: null,
    proteinG: null,
    carbohydratesG: null,
    fatG: null,
  };
  for (const definition of STATISTICS) {
    if (!draft.enabled[definition.key]) continue;
    const parsed = parsePositiveDecimal(draft.values[definition.key]);
    if (parsed._tag === "Failure") return { _tag: "Failure", error: `Vul een positief doel in voor ${definition.label.toLowerCase()}.` };
    if (definition.key === "caloriesKcal" && !/^\d+$/.test(parsed.value.canonical)) {
      return { _tag: "Failure", error: "Calorieën moeten een positief geheel getal zijn." };
    }
    if (definition.key !== "caloriesKcal" && !/^\d+(?:\.\d)?$/.test(parsed.value.canonical)) {
      return { _tag: "Failure", error: `${definition.label} mag maximaal één decimaal hebben.` };
    }
    parsedValues[definition.key] = parsed.value.canonical;
  }
  return {
    _tag: "Success",
    value: {
      caloriesKcal: parsedValues.caloriesKcal === null ? null : Number(parsedValues.caloriesKcal),
      proteinG: parsedValues.proteinG,
      carbohydratesG: parsedValues.carbohydratesG,
      fatG: parsedValues.fatG,
    },
  };
}
