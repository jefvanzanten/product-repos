import { eq } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { userNutritionGoal } from "../../../db/schema.ts";
import type { NutritionGoalRecord, NutritionGoalRepository } from "./calorie-tracker-store.ts";

/** Create nutrition-goal persistence for one injected database. */
export function createDrizzleNutritionGoalRepository(db: BackendDatabase): NutritionGoalRepository {
  /** Read current nutrition goals for one user. */
  function findGoals(userId: string): NutritionGoalRecord | undefined {
    return db.select().from(userNutritionGoal).where(eq(userNutritionGoal.userId, userId)).get();
  }

  /** Atomically insert or replace all current nutrition goals for one user. */
  function upsertGoals(input: NutritionGoalRecord): NutritionGoalRecord {
    db.insert(userNutritionGoal).values(input).onConflictDoUpdate({
      target: userNutritionGoal.userId,
      set: {
        caloriesKcal: input.caloriesKcal,
        proteinG: input.proteinG,
        carbohydratesG: input.carbohydratesG,
        fatG: input.fatG,
        updatedAt: input.updatedAt,
      },
    }).run();
    const stored = findGoals(input.userId);
    if (stored === undefined) throw new Error("Nutrition goals were not persisted");
    return stored;
  }

  return { findGoals, upsertGoals };
}
