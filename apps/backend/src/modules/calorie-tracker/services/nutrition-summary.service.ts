import type { DailyStatistics, MacroValues, NutritionGoal, UpsertNutritionGoal } from "@product-repos/contracts/calorie-tracker";
import { canonicalDecimal, localDateForInstant, sumMacroValues } from "../domain/calorie-tracker-domain.ts";
import type { ConsumptionCatalogReader } from "../../catalog/repositories/consumption-catalog-reader.ts";
import type { ConsumptionLogRepository, NutritionGoalRepository } from "../repositories/calorie-tracker-store.ts";
import { createConsumptionLogProjector, emptyGoals, toNutritionGoal } from "./calorie-tracker-projections.ts";
import {
  nextTimestamp,
  projectionFailure,
  success,
  utcSearchWindow,
  type CalorieTrackerResult,
  type Clock,
} from "./calorie-tracker-service-support.ts";

/** Nutrition-goal and daily-summary use cases consumed by Calorie Tracker routes. */
export type NutritionSummaryService = ReturnType<typeof createNutritionSummaryService>;

/** Create nutrition-goal and current-catalog daily-summary use cases. */
export function createNutritionSummaryService(dependencies: {
  readonly catalogReader: ConsumptionCatalogReader;
  readonly logRepository: ConsumptionLogRepository;
  readonly goalRepository: NutritionGoalRepository;
  readonly clock: Clock;
}) {
  const { catalogReader, logRepository, goalRepository, clock } = dependencies;
  const projector = createConsumptionLogProjector(catalogReader);

  /** Return current goals or an empty goal projection when none have been stored. */
  function getGoals(userId: string): CalorieTrackerResult<NutritionGoal> {
    const row = goalRepository.findGoals(userId);
    return success(row === undefined ? emptyGoals() : toNutritionGoal(row));
  }

  /** Atomically replace all current optional nutrition goals. */
  function replaceGoals(userId: string, input: UpsertNutritionGoal): CalorieTrackerResult<NutritionGoal> {
    const existing = goalRepository.findGoals(userId);
    const now = nextTimestamp(clock.now(), existing?.updatedAt);
    const stored = goalRepository.upsertGoals({
      userId,
      caloriesKcal: input.caloriesKcal,
      proteinG: input.proteinG === null ? null : canonicalDecimal(input.proteinG),
      carbohydratesG: input.carbohydratesG === null ? null : canonicalDecimal(input.carbohydratesG),
      fatG: input.fatG === null ? null : canonicalDecimal(input.fatG),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    return success(toNutritionGoal(stored));
  }

  /** Aggregate exact daily nutrition totals from current catalog data and active logs. */
  function getDailyStatistics(userId: string, date: string, timezone: string): CalorieTrackerResult<DailyStatistics> {
    const window = utcSearchWindow(date);
    const rows = logRepository.findUserLogsInWindow(userId, window.startInclusive, window.endExclusive)
      .filter((row) => localDateForInstant(row.consumedAt, row.timezone) === date);
    const references = projector.readReferences(rows);
    const values: Array<MacroValues | null> = [];
    for (const row of rows) {
      const projected = projector.projectLog(row, references);
      if (!projected.ok) return projectionFailure();
      values.push(projected.value.macroValues);
    }
    const summed = sumMacroValues(values);
    const totals: MacroValues = {
      caloriesKcal: summed.caloriesKcal ?? "0",
      proteinG: summed.proteinG ?? "0",
      carbohydratesG: summed.carbohydratesG ?? "0",
      fatG: summed.fatG ?? "0",
    };
    const goals = goalRepository.findGoals(userId);
    return success({ date, timezone, totals, goals: goals === undefined ? null : toNutritionGoal(goals) });
  }

  return { getGoals, replaceGoals, getDailyStatistics };
}
