import { and, asc, eq, gte, isNotNull, isNull, lt, lte } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { consumptionLog } from "../../../db/schema.ts";
import type {
  ConsumptionLogRecord,
  ConsumptionLogRepository,
  InsertConsumptionLogRecord,
  UpdateConsumptionLogRecord,
} from "./calorie-tracker-store.ts";

/** Create consumption-log persistence for one injected database. */
export function createDrizzleConsumptionLogRepository(db: BackendDatabase): ConsumptionLogRepository {
  /** Read active user logs from a bounded UTC window in stable chronological order. */
  function findUserLogsInWindow(userId: string, startInclusive: string, endExclusive: string): ReadonlyArray<ConsumptionLogRecord> {
    return db.select().from(consumptionLog).where(and(
      eq(consumptionLog.userId, userId),
      isNull(consumptionLog.deletedAt),
      gte(consumptionLog.consumedAt, startInclusive),
      lt(consumptionLog.consumedAt, endExclusive),
    )).orderBy(asc(consumptionLog.consumedAt), asc(consumptionLog.createdAt), asc(consumptionLog.id)).all();
  }

  /** Read any user's log by globally unique identifier for idempotency checks. */
  function findLogById(logId: string): ConsumptionLogRecord | undefined {
    return db.select().from(consumptionLog).where(eq(consumptionLog.id, logId)).get();
  }

  /** Insert a parsed consumption log unless its globally unique identifier already exists. */
  function insertLog(input: InsertConsumptionLogRecord): ConsumptionLogRecord | undefined {
    return db.insert(consumptionLog).values(input).onConflictDoNothing({ target: consumptionLog.id }).returning().get();
  }

  /** Update an active user-owned log only when its concurrency token still matches. */
  function updateLog(userId: string, logId: string, expectedUpdatedAt: string, input: UpdateConsumptionLogRecord): ConsumptionLogRecord | undefined {
    return db.update(consumptionLog).set(input).where(and(
      eq(consumptionLog.id, logId),
      eq(consumptionLog.userId, userId),
      eq(consumptionLog.updatedAt, expectedUpdatedAt),
      isNull(consumptionLog.deletedAt),
    )).returning().get();
  }

  /** Soft-delete an active user-owned log. */
  function deleteLog(userId: string, logId: string, deletedAt: string, updatedAt: string): ConsumptionLogRecord | undefined {
    return db.update(consumptionLog).set({ deletedAt, updatedAt }).where(and(
      eq(consumptionLog.id, logId),
      eq(consumptionLog.userId, userId),
      isNull(consumptionLog.deletedAt),
    )).returning().get();
  }

  /** Restore a deleted user-owned log when its deletion timestamp still matches. */
  function restoreLog(userId: string, logId: string, expectedDeletedAt: string, updatedAt: string): ConsumptionLogRecord | undefined {
    return db.update(consumptionLog).set({ deletedAt: null, updatedAt }).where(and(
      eq(consumptionLog.id, logId),
      eq(consumptionLog.userId, userId),
      eq(consumptionLog.deletedAt, expectedDeletedAt),
    )).returning().get();
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
