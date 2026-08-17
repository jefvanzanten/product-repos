import {
  dailyStatisticsSchema,
  nutritionGoalSchema,
} from "@product-repos/contracts/calorie-tracker";
import type { BackendRequestContext } from "../../../core/data/backend-api.server";
import {
  getCalorieTrackerJson,
  requestCalorieTrackerJson,
} from "../../../core/data/calorie-tracker-api.server";
import type { DailyStatistics, NutritionGoal, UpsertNutritionGoal } from "../domain/statistics";
import { mapDailyStatistics, mapNutritionGoal } from "./statistics-mappers";

export { CalorieTrackerApiError } from "../../../core/data/calorie-tracker-api.server";

/**
 * Fetch aggregate statistics for one local calendar date.
 *
 * @param date - Local calendar date.
 * @param context - Backend request metadata.
 * @returns Daily statistics returned by the backend.
 */
export async function getDailyStatistics(date: string, context: BackendRequestContext): Promise<DailyStatistics> {
  const dto = await getCalorieTrackerJson(`/calorie-tracker/statistics?${new URLSearchParams({ date })}`, dailyStatisticsSchema, context);
  return mapDailyStatistics(dto);
}

/**
 * Atomically replace all current nutrition goals.
 *
 * @param input - Complete goal replacement.
 * @param context - Backend request metadata.
 * @returns Persisted nutrition goals.
 */
export async function putNutritionGoals(input: UpsertNutritionGoal, context: BackendRequestContext): Promise<NutritionGoal> {
  const dto = await requestCalorieTrackerJson("/calorie-tracker/goals", "PUT", input, nutritionGoalSchema, context);
  return mapNutritionGoal(dto);
}
