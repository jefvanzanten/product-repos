import { upsertNutritionGoalSchema } from "@product-repos/contracts/calorie-tracker";
import type { UpsertNutritionGoal } from "../domain/statistics";

/** Parse an untrusted nutrition-goal replacement payload. */
export function parseUpsertNutritionGoal(input: unknown): UpsertNutritionGoal | null {
  const result = upsertNutritionGoalSchema.safeParse(input);
  return result.success ? result.data : null;
}
