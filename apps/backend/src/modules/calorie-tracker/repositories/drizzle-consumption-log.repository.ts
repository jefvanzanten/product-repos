import { and, asc, eq, gte, isNotNull, isNull, lt, lte } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { consumptionLog, dishConsumption, productConsumption } from "../../../db/schema.ts";
import type {
  ConsumptionLogRecord,
  ConsumptionLogRepository,
  InsertConsumptionLogRecord,
  UpdateConsumptionLogRecord,
} from "./calorie-tracker-store.ts";

/** Joined row shape returned by the subtype-aware log query. */
type JoinedConsumptionLogRow = {
  readonly id: string;
  readonly userId: string;
  readonly type: "PRODUCT" | "DISH";
  readonly consumedAt: string;
  readonly timezone: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
  readonly productPackageId: number | null;
  readonly productQuantity: string | null;
  readonly inputMode: "PACKAGE" | "INDIVIDUAL_UNIT" | "CONTENT_UNIT" | null;
  readonly inputUnitTypeId: number | null;
  readonly dishVersionId: string | null;
  readonly dishQuantity: string | null;
};

/** Create consumption-log persistence for one injected database. */
export function createDrizzleConsumptionLogRepository(db: BackendDatabase): ConsumptionLogRepository {
  /** Project one joined row into the discriminated persistence record. */
  function toRecord(row: JoinedConsumptionLogRow): ConsumptionLogRecord | undefined {
    if (row.type === "DISH") {
      if (row.dishVersionId === null || row.dishQuantity === null) return undefined;
      return {
        id: row.id,
        userId: row.userId,
        type: "DISH",
        dishVersionId: row.dishVersionId,
        quantity: row.dishQuantity,
        consumedAt: row.consumedAt,
        timezone: row.timezone,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      };
    }
    if (row.productPackageId === null || row.productQuantity === null || row.inputMode === null) return undefined;
    return {
      id: row.id,
      userId: row.userId,
      type: "PRODUCT",
      productPackageId: row.productPackageId,
      quantity: row.productQuantity,
      inputMode: row.inputMode,
      inputUnitTypeId: row.inputUnitTypeId,
      consumedAt: row.consumedAt,
      timezone: row.timezone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  /** Select logs joined with both subtype tables for projection. */
  function selectJoinedLogs() {
    return db.select({
      id: consumptionLog.id,
      userId: consumptionLog.userId,
      type: consumptionLog.type,
      consumedAt: consumptionLog.consumedAt,
      timezone: consumptionLog.timezone,
      createdAt: consumptionLog.createdAt,
      updatedAt: consumptionLog.updatedAt,
      deletedAt: consumptionLog.deletedAt,
      productPackageId: productConsumption.productPackageId,
      productQuantity: productConsumption.quantity,
      inputMode: productConsumption.inputMode,
      inputUnitTypeId: productConsumption.inputUnitTypeId,
      dishVersionId: dishConsumption.dishVersionId,
      dishQuantity: dishConsumption.quantity,
    }).from(consumptionLog)
      .leftJoin(productConsumption, eq(productConsumption.consumptionLogId, consumptionLog.id))
      .leftJoin(dishConsumption, eq(dishConsumption.consumptionLogId, consumptionLog.id));
  }

  /** Read active user logs from a bounded UTC window in stable chronological order. */
  function findUserLogsInWindow(userId: string, startInclusive: string, endExclusive: string): ReadonlyArray<ConsumptionLogRecord> {
    return selectJoinedLogs().where(and(
      eq(consumptionLog.userId, userId),
      isNull(consumptionLog.deletedAt),
      gte(consumptionLog.consumedAt, startInclusive),
      lt(consumptionLog.consumedAt, endExclusive),
    )).orderBy(asc(consumptionLog.consumedAt), asc(consumptionLog.createdAt), asc(consumptionLog.id)).all()
      .flatMap((row) => {
        const record = toRecord(row);
        return record === undefined ? [] : [record];
      });
  }

  /** Read any user's log by globally unique identifier for idempotency checks. */
  function findLogById(logId: string): ConsumptionLogRecord | undefined {
    const row = selectJoinedLogs().where(eq(consumptionLog.id, logId)).get();
    return row === undefined ? undefined : toRecord(row);
  }

  /** Insert a parsed consumption log with its subtype details unless its identifier already exists. */
  function insertLog(input: InsertConsumptionLogRecord): ConsumptionLogRecord | undefined {
    const inserted = db.transaction((transaction) => {
      const log = transaction.insert(consumptionLog).values({
        id: input.id,
        userId: input.userId,
        type: input.type,
        consumedAt: input.consumedAt,
        timezone: input.timezone,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        deletedAt: input.deletedAt,
      }).onConflictDoNothing({ target: consumptionLog.id }).returning().get();
      if (log === undefined) return undefined;
      if (input.type === "PRODUCT") {
        transaction.insert(productConsumption).values({
          consumptionLogId: input.id,
          productPackageId: input.productPackageId,
          quantity: input.quantity,
          inputMode: input.inputMode,
          inputUnitTypeId: input.inputUnitTypeId,
        }).run();
      } else {
        transaction.insert(dishConsumption).values({
          consumptionLogId: input.id,
          dishVersionId: input.dishVersionId,
          quantity: input.quantity,
        }).run();
      }
      return input;
    });
    return inserted;
  }

  /** Update an active user-owned log only when its concurrency token still matches. */
  function updateLog(userId: string, logId: string, expectedUpdatedAt: string, input: UpdateConsumptionLogRecord): ConsumptionLogRecord | undefined {
    const updated = db.transaction((transaction) => {
      const log = transaction.update(consumptionLog).set({
        consumedAt: input.consumedAt,
        timezone: input.timezone,
        updatedAt: input.updatedAt,
      }).where(and(
        eq(consumptionLog.id, logId),
        eq(consumptionLog.userId, userId),
        eq(consumptionLog.updatedAt, expectedUpdatedAt),
        isNull(consumptionLog.deletedAt),
      )).returning().get();
      if (log === undefined) return undefined;
      if (input.type === "PRODUCT") {
        const details = transaction.update(productConsumption).set({
          productPackageId: input.productPackageId,
          quantity: input.quantity,
          inputMode: input.inputMode,
          inputUnitTypeId: input.inputUnitTypeId,
        }).where(eq(productConsumption.consumptionLogId, logId)).returning().get();
        if (details === undefined) throw new Error("Product consumption details missing for updated log");
      } else {
        const details = transaction.update(dishConsumption).set({ quantity: input.quantity })
          .where(eq(dishConsumption.consumptionLogId, logId)).returning().get();
        if (details === undefined) throw new Error("Dish consumption details missing for updated log");
      }
      return log;
    });
    if (updated === undefined) return undefined;
    return findLogById(logId);
  }

  /** Soft-delete an active user-owned log. */
  function deleteLog(userId: string, logId: string, deletedAt: string, updatedAt: string): ConsumptionLogRecord | undefined {
    const deleted = db.update(consumptionLog).set({ deletedAt, updatedAt }).where(and(
      eq(consumptionLog.id, logId),
      eq(consumptionLog.userId, userId),
      isNull(consumptionLog.deletedAt),
    )).returning({ id: consumptionLog.id }).get();
    return deleted === undefined ? undefined : findLogById(logId);
  }

  /** Restore a deleted user-owned log when its deletion timestamp still matches. */
  function restoreLog(userId: string, logId: string, expectedDeletedAt: string, updatedAt: string): ConsumptionLogRecord | undefined {
    const restored = db.update(consumptionLog).set({ deletedAt: null, updatedAt }).where(and(
      eq(consumptionLog.id, logId),
      eq(consumptionLog.userId, userId),
      eq(consumptionLog.deletedAt, expectedDeletedAt),
    )).returning({ id: consumptionLog.id }).get();
    return restored === undefined ? undefined : findLogById(logId);
  }

  /** Physically delete soft-deleted logs whose retention deadline has elapsed. */
  function deleteExpiredLogs(cutoffInclusive: string): number {
    return db.delete(consumptionLog).where(and(
      isNotNull(consumptionLog.deletedAt),
      lte(consumptionLog.deletedAt, cutoffInclusive),
    )).returning({ id: consumptionLog.id }).all().length;
  }

  return { findUserLogsInWindow, findLogById, insertLog, updateLog, deleteLog, restoreLog, deleteExpiredLogs };
}
