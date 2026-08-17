import { eq } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { userNutritionGoal } from "../../../db/schema.ts";


/** Persistence representation of one user's current nutrition goals. */
export type NutritionGoalRecord = {
  readonly userId: string;
  readonly caloriesKcal: number | null;
  readonly proteinG: string | null;
  readonly carbohydratesG: string | null;
  readonly fatG: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Nutrition-goal persistence operations. */
export type NutritionGoalRepository = {
  /** Read current nutrition goals for one user. */
  findGoals(userId: string): NutritionGoalRecord | undefined;
  /** Atomically insert or replace current nutrition goals. */
  upsertGoals(input: NutritionGoalRecord): NutritionGoalRecord;
};

/** Create nutrition-goal persistence for one injected database. */
export function createNutritionGoalRepository(db: BackendDatabase): NutritionGoalRepository {
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
