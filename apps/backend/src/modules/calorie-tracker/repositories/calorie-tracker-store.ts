import type { ConsumptionInputMode } from "@product-repos/contracts/calorie-tracker";

/** Persistence representation of one consumption log. */
export type ConsumptionLogRecord = {
  readonly id: string;
  readonly userId: string;
  readonly productPackageId: number;
  readonly quantity: string;
  readonly inputMode: ConsumptionInputMode;
  readonly inputUnitTypeId: number | null;
  readonly consumedAt: string;
  readonly timezone: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
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

/** Values required to insert a parsed consumption log. */
export type InsertConsumptionLogRecord = ConsumptionLogRecord;

/** Values required to update a parsed consumption log. */
export type UpdateConsumptionLogRecord = Pick<
  InsertConsumptionLogRecord,
  "productPackageId" | "quantity" | "inputMode" | "inputUnitTypeId" | "consumedAt" | "timezone" | "updatedAt"
>;

/** Consumption-log persistence operations. */
export type ConsumptionLogRepository = {
  /** Read active user logs from a bounded UTC window. */
  findUserLogsInWindow(userId: string, startInclusive: string, endExclusive: string): ReadonlyArray<ConsumptionLogRecord>;
  /** Read any user's log by globally unique identifier. */
  findLogById(logId: string): ConsumptionLogRecord | undefined;
  /** Insert a parsed log unless its identifier already exists. */
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

/** Nutrition-goal persistence operations. */
export type NutritionGoalRepository = {
  /** Read current nutrition goals for one user. */
  findGoals(userId: string): NutritionGoalRecord | undefined;
  /** Atomically insert or replace current nutrition goals. */
  upsertGoals(input: NutritionGoalRecord): NutritionGoalRecord;
};
