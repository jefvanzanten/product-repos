import type { ConsumptionInputMode } from "@product-repos/contracts/calorie-tracker";

/** Shared persisted fields of every consumption log. */
type ConsumptionLogBaseRecord = {
  readonly id: string;
  readonly userId: string;
  readonly consumedAt: string;
  readonly timezone: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
};

/** Persisted package-based consumption log with its original input semantics. */
export type ProductConsumptionLogRecord = ConsumptionLogBaseRecord & {
  readonly type: "PRODUCT";
  readonly productPackageId: number;
  readonly quantity: string;
  readonly inputMode: ConsumptionInputMode;
  readonly inputUnitTypeId: number | null;
};

/** Persisted dish consumption log pinning the consumed recipe version. */
export type DishConsumptionLogRecord = ConsumptionLogBaseRecord & {
  readonly type: "DISH";
  readonly dishVersionId: string;
  readonly quantity: string;
};

/** Persistence representation of one consumption log discriminated by subtype. */
export type ConsumptionLogRecord = ProductConsumptionLogRecord | DishConsumptionLogRecord;

/** Values required to insert a parsed consumption log with its subtype details. */
export type InsertConsumptionLogRecord = ConsumptionLogRecord;

/** Values required to update the subtype-specific fields of a parsed consumption log. */
export type UpdateConsumptionLogRecord =
  | {
      readonly type: "PRODUCT";
      readonly productPackageId: number;
      readonly quantity: string;
      readonly inputMode: ConsumptionInputMode;
      readonly inputUnitTypeId: number | null;
      readonly consumedAt: string;
      readonly timezone: string;
      readonly updatedAt: string;
    }
  | {
      readonly type: "DISH";
      readonly quantity: string;
      readonly consumedAt: string;
      readonly timezone: string;
      readonly updatedAt: string;
    };

/** Consumption-log persistence operations. */
export type ConsumptionLogRepository = {
  /** Read active user logs from a bounded UTC window. */
  findUserLogsInWindow(userId: string, startInclusive: string, endExclusive: string): ReadonlyArray<ConsumptionLogRecord>;
  /** Read any user's log by globally unique identifier. */
  findLogById(logId: string): ConsumptionLogRecord | undefined;
  /** Insert a parsed log with its subtype details unless its identifier already exists. */
  insertLog(input: InsertConsumptionLogRecord): ConsumptionLogRecord | undefined;
  /** Update an active user-owned log under optimistic concurrency. */
  updateLog(userId: string, logId: string, expectedUpdatedAt: string, input: UpdateConsumptionLogRecord): ConsumptionLogRecord | undefined;
  /** Soft-delete an active user-owned log. */
  deleteLog(userId: string, logId: string, deletedAt: string, updatedAt: string): ConsumptionLogRecord | undefined;
  /** Restore a user-owned log with the expected deletion token. */
  restoreLog(userId: string, logId: string, expectedDeletedAt: string, updatedAt: string): ConsumptionLogRecord | undefined;
  /** Physically delete logs whose retention cutoff elapsed. */
  deleteExpiredLogs(cutoffInclusive: string): number;
};

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

/** Persistence representation of one user-owned dish stem. */
export type DishRecord = {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
};

/** Persistence representation of one immutable dish recipe version. */
export type DishVersionRecord = {
  readonly id: string;
  readonly dishId: string;
  readonly servings: string;
  readonly createdAt: string;
};

/** Persistence representation of one ingredient inside a dish recipe version. */
export type DishIngredientRecord = {
  readonly id: string;
  readonly dishVersionId: string;
  readonly productPackageId: number;
  readonly quantity: string;
  readonly inputMode: ConsumptionInputMode;
  readonly inputUnitTypeId: number | null;
};

/** One user-owned dish with its most recent consumption instant, used for recency ordering. */
export type RecentConsumedDish = {
  readonly dish: DishRecord;
  readonly lastConsumedAt: string;
};

/** Values required to insert a complete new dish with its first recipe version. */
export type InsertDishInput = {
  readonly dish: DishRecord;
  readonly version: DishVersionRecord;
  readonly ingredients: ReadonlyArray<DishIngredientRecord>;
};

/** Stem-only dish mutation values. */
export type UpdateDishStemInput = {
  readonly name: string;
  readonly imageUrl: string | null;
  readonly updatedAt: string;
};

/** Dish persistence operations. */
export type DishRepository = {
  /** Read any user's dish stem by globally unique identifier. */
  findDishById(dishId: string): DishRecord | undefined;
  /** Determine whether a non-deleted dish with the same normalized name exists for one user. */
  existsActiveDishWithName(userId: string, name: string): boolean;
  /** Insert a complete dish with its first version unless the name already exists. */
  insertDish(input: InsertDishInput): DishRecord | undefined;
  /** Update mutable stem fields of an active user-owned dish under optimistic concurrency. */
  updateDishStem(userId: string, dishId: string, expectedUpdatedAt: string, input: UpdateDishStemInput): DishRecord | undefined;
  /** Soft-delete an active user-owned dish without a restore flow. */
  softDeleteDish(userId: string, dishId: string, deletedAt: string, updatedAt: string): DishRecord | undefined;
  /** Read the newest recipe version of one dish. */
  findNewestVersion(dishId: string): DishVersionRecord | undefined;
  /** Read only the recipe versions referenced by projected logs. */
  findVersionsByIds(versionIds: ReadonlyArray<string>): ReadonlyArray<DishVersionRecord>;
  /** Insert one immutable recipe version. */
  insertVersion(input: DishVersionRecord): DishVersionRecord;
  /** Read all ingredients of one recipe version in insertion order. */
  findIngredientsByVersionId(versionId: string): ReadonlyArray<DishIngredientRecord>;
  /** Read ingredients for every referenced recipe version. */
  findIngredientsByVersionIds(versionIds: ReadonlyArray<string>): ReadonlyArray<DishIngredientRecord>;
  /** Insert the ingredients of one recipe version atomically. */
  insertIngredients(input: ReadonlyArray<DishIngredientRecord>): void;
  /** Search non-deleted user dishes by name. */
  searchActiveUserDishes(userId: string, query: string, limit: number): ReadonlyArray<DishRecord>;
  /** Read non-deleted user dishes ordered by their most recent consumption instant. */
  findRecentConsumedDishes(userId: string, limit: number): ReadonlyArray<RecentConsumedDish>;
};
