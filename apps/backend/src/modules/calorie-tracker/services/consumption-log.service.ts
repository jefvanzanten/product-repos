import type {
  ConsumptionInputMode,
  ConsumptionLog,
  ConsumptionTypeFilter,
  CreateConsumptionLog,
  DeleteLogResult,
  LogList,
  UpdateConsumptionLog,
} from "@product-repos/contracts/calorie-tracker";
import {
  canonicalDecimal,
  deriveConsumptionQuantity,
  isAllowedConsumedAt,
  localDateForInstant,
  parsePositiveDecimal,
} from "../domain/calorie-tracker-domain.ts";
import type { CatalogPackageRecord, ConsumptionCatalogReader } from "../../catalog/repositories/consumption-catalog-reader.ts";
import type { ConsumptionLogRecord, ConsumptionLogRepository } from "../repositories/calorie-tracker-store.ts";
import { createConsumptionLogProjector, toQuantityPackage } from "./calorie-tracker-projections.ts";
import {
  failure,
  nextTimestamp,
  projectionFailure,
  success,
  utcSearchWindow,
  type CalorieTrackerResult,
  type Clock,
} from "./calorie-tracker-service-support.ts";

/** Outcome of an idempotent create operation. */
export type CreateLogOutcome = {
  readonly state: "created" | "existing";
  readonly log: ConsumptionLog;
};

/** Outcome of physically cleaning up deleted logs after their retention period. */
export type CleanupDeletedLogsOutcome = {
  readonly deletedCount: number;
  readonly cutoffInclusive: string;
};

/** Consumption-log lifecycle use cases consumed by routes and cleanup jobs. */
export type ConsumptionLogService = ReturnType<typeof createConsumptionLogService>;

const deletedLogRetentionMilliseconds = 30 * 24 * 60 * 60 * 1_000;

/** Create user-owned consumption-log lifecycle use cases. */
export function createConsumptionLogService(dependencies: {
  readonly catalogReader: ConsumptionCatalogReader;
  readonly logRepository: ConsumptionLogRepository;
  readonly clock: Clock;
}) {
  const { catalogReader, logRepository, clock } = dependencies;
  const projector = createConsumptionLogProjector(catalogReader);

  /** List active user-owned logs for a local date and optional type filter. */
  function listLogs(userId: string, date: string, timezone: string, filter: ConsumptionTypeFilter): CalorieTrackerResult<LogList> {
    const window = utcSearchWindow(date);
    const rows = logRepository.findUserLogsInWindow(userId, window.startInclusive, window.endExclusive)
      .filter((row) => localDateForInstant(row.consumedAt, row.timezone) === date);
    const references = projector.readReferences(rows);
    const logs: ConsumptionLog[] = [];
    for (const row of rows) {
      const projected = projector.projectLog(row, references);
      if (!projected.ok) return projectionFailure();
      if (filter === "all" || projected.value.package.consumptionType.toLowerCase() === filter) logs.push(projected.value);
    }
    return success({ date, timezone, type: filter, items: logs });
  }

  /** Read one active user-owned log without revealing another user's identifiers. */
  function getLog(userId: string, logId: string): CalorieTrackerResult<ConsumptionLog> {
    const row = logRepository.findLogById(logId);
    if (row === undefined || row.userId !== userId || row.deletedAt !== null) return failure("LOG_NOT_FOUND", "Log not found");
    const projected = projector.projectLog(row);
    return projected.ok ? success(projected.value) : projectionFailure();
  }

  /** Create one log idempotently after comparing stored request content before current catalog validation. */
  function createLog(userId: string, timezone: string, input: CreateConsumptionLog): CalorieTrackerResult<CreateLogOutcome> {
    const existing = logRepository.findLogById(input.id);
    if (existing !== undefined) {
      if (existing.userId !== userId) return failure("LOG_ALREADY_EXISTS", "A log with this id already exists");
      const retryContent = parseCreateRequestContent(input, timezone);
      if (!retryContent.ok) return retryContent;
      if (existing.deletedAt !== null || !sameCreateContent(existing, retryContent.value)) return failure("LOG_CREATE_CONFLICT", "The log id was already used with different content");
      const projected = projector.projectLog(existing);
      return projected.ok ? success({ state: "existing", log: projected.value }) : projectionFailure();
    }

    const parsed = parseMutationInput(input, undefined);
    if (!parsed.ok) return parsed;
    const now = clock.now().toISOString();
    const stored = logRepository.insertLog({
      id: input.id,
      userId,
      productPackageId: parsed.value.productPackageId,
      quantity: parsed.value.quantity,
      inputMode: parsed.value.inputMode,
      inputUnitTypeId: parsed.value.inputUnitTypeId,
      consumedAt: parsed.value.consumedAt,
      timezone,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    if (stored === undefined) {
      const raced = logRepository.findLogById(input.id);
      if (raced === undefined) throw new Error("Idempotent log insert did not persist or conflict");
      if (raced.userId !== userId) return failure("LOG_ALREADY_EXISTS", "A log with this id already exists");
      if (raced.deletedAt !== null || !sameCreateContent(raced, { ...parsed.value, timezone })) return failure("LOG_CREATE_CONFLICT", "The log id was already used with different content");
      const projected = projector.projectLog(raced);
      return projected.ok ? success({ state: "existing", log: projected.value }) : projectionFailure();
    }
    const projected = projector.projectLog(stored);
    return projected.ok ? success({ state: "created", log: projected.value }) : projectionFailure();
  }

  /** Update one log with optimistic concurrency and current package selectability rules. */
  function updateLog(userId: string, logId: string, timezone: string, input: UpdateConsumptionLog): CalorieTrackerResult<ConsumptionLog> {
    const existing = logRepository.findLogById(logId);
    if (existing === undefined || existing.userId !== userId || existing.deletedAt !== null) return failure("LOG_NOT_FOUND", "Log not found");
    if (existing.updatedAt !== input.expectedUpdatedAt) return failure("LOG_UPDATE_CONFLICT", "The log has changed since it was opened");
    const parsed = parseMutationInput(input, existing);
    if (!parsed.ok) return parsed;
    const updatedAt = nextTimestamp(clock.now(), existing.updatedAt);
    const updated = logRepository.updateLog(userId, logId, input.expectedUpdatedAt, { ...parsed.value, timezone, updatedAt });
    if (updated === undefined) return failure("LOG_UPDATE_CONFLICT", "The log has changed since it was opened");
    const projected = projector.projectLog(updated);
    return projected.ok ? success(projected.value) : projectionFailure();
  }

  /** Soft-delete one active user-owned log and open its five-second restore window. */
  function deleteLog(userId: string, logId: string): CalorieTrackerResult<DeleteLogResult> {
    const existing = logRepository.findLogById(logId);
    if (existing === undefined || existing.userId !== userId || existing.deletedAt !== null) return failure("LOG_NOT_FOUND", "Log not found");
    const deletedAt = nextTimestamp(clock.now(), existing.updatedAt);
    const deleted = logRepository.deleteLog(userId, logId, deletedAt, deletedAt);
    if (deleted === undefined) return failure("LOG_NOT_FOUND", "Log not found");
    return success({ id: logId, deletedAt, restoreUntil: new Date(Date.parse(deletedAt) + 5_000).toISOString() });
  }

  /** Restore a user-owned soft-deleted log during the five-second undo window. */
  function restoreLog(userId: string, logId: string): CalorieTrackerResult<ConsumptionLog> {
    const existing = logRepository.findLogById(logId);
    if (existing === undefined || existing.userId !== userId || existing.deletedAt === null) return failure("LOG_NOT_FOUND", "Log not found");
    const now = clock.now();
    if (now.getTime() > Date.parse(existing.deletedAt) + 5_000) return failure("LOG_RESTORE_WINDOW_EXPIRED", "The restore window has expired");
    const updatedAt = nextTimestamp(now, existing.updatedAt);
    const restored = logRepository.restoreLog(userId, logId, existing.deletedAt, updatedAt);
    if (restored === undefined) return failure("LOG_NOT_FOUND", "Log not found");
    const projected = projector.projectLog(restored);
    return projected.ok ? success(projected.value) : projectionFailure();
  }

  /** Physically delete soft-deleted logs retained for at least thirty days. */
  function cleanupDeletedLogs(): CalorieTrackerResult<CleanupDeletedLogsOutcome> {
    const cutoffInclusive = new Date(clock.now().getTime() - deletedLogRetentionMilliseconds).toISOString();
    return success({ deletedCount: logRepository.deleteExpiredLogs(cutoffInclusive), cutoffInclusive });
  }

  /** Parse and normalize a create or update payload into persistence values. */
  function parseMutationInput(
    input: Omit<CreateConsumptionLog, "id"> | UpdateConsumptionLog,
    currentLog: ConsumptionLogRecord | undefined,
  ): CalorieTrackerResult<{
    readonly productPackageId: number;
    readonly quantity: string;
    readonly inputMode: ConsumptionInputMode;
    readonly inputUnitTypeId: number | null;
    readonly consumedAt: string;
  }> {
    const packageRecord = catalogReader.findCatalogPackage(input.packageId);
    if (packageRecord === undefined) return failure("PRODUCT_PACKAGE_NOT_FOUND", "Product package not found");
    if (!isActivePackage(packageRecord)) {
      const keepsArchivedInput = currentLog !== undefined
        && packageRecord.packageId === currentLog.productPackageId
        && input.inputMode === currentLog.inputMode
        && input.inputUnitTypeId === currentLog.inputUnitTypeId;
      if (!keepsArchivedInput) return failure("PRODUCT_PACKAGE_ARCHIVED", "Archived package input cannot be replaced");
    }
    const quantity = parsePositiveDecimal(input.quantity);
    if (!quantity.ok) return { ok: false, error: quantity.error };
    const inputUnit = input.inputUnitTypeId === null ? null : catalogReader.findUnitType(input.inputUnitTypeId) ?? null;
    const derived = deriveConsumptionQuantity(toQuantityPackage(packageRecord), {
      quantity: quantity.value,
      inputMode: input.inputMode,
      inputUnit,
    });
    if (!derived.ok) return { ok: false, error: derived.error };
    if (!isAllowedConsumedAt(input.consumedAt, clock.now())) return failure("VALIDATION_ERROR", "Consumed instant cannot be in the future", { consumedAt: "Future instants are not allowed" });
    return success({
      productPackageId: input.packageId,
      quantity: quantity.value,
      inputMode: input.inputMode,
      inputUnitTypeId: input.inputUnitTypeId,
      consumedAt: new Date(input.consumedAt).toISOString(),
    });
  }

  return { listLogs, getLog, createLog, updateLog, deleteLog, restoreLog, cleanupDeletedLogs };
}

/** Determine whether both product and package are actively selectable. */
function isActivePackage(row: CatalogPackageRecord): boolean {
  return row.productArchivedAt === null && row.packageArchivedAt === null;
}

/** Canonicalize only immutable create-request fields without consulting mutable catalog data. */
function parseCreateRequestContent(input: CreateConsumptionLog, timezone: string): CalorieTrackerResult<{
  readonly productPackageId: number;
  readonly quantity: string;
  readonly inputMode: ConsumptionInputMode;
  readonly inputUnitTypeId: number | null;
  readonly consumedAt: string;
  readonly timezone: string;
}> {
  const quantity = parsePositiveDecimal(input.quantity);
  if (!quantity.ok) return { ok: false, error: quantity.error };
  return success({
    productPackageId: input.packageId,
    quantity: quantity.value,
    inputMode: input.inputMode,
    inputUnitTypeId: input.inputUnitTypeId,
    consumedAt: new Date(input.consumedAt).toISOString(),
    timezone,
  });
}

/** Compare canonical create content to persisted content for idempotent retries. */
function sameCreateContent(row: ConsumptionLogRecord, input: {
  readonly productPackageId: number;
  readonly quantity: string;
  readonly inputMode: ConsumptionInputMode;
  readonly inputUnitTypeId: number | null;
  readonly consumedAt: string;
  readonly timezone: string;
}): boolean {
  return row.productPackageId === input.productPackageId
    && canonicalDecimal(row.quantity) === input.quantity
    && row.inputMode === input.inputMode
    && row.inputUnitTypeId === input.inputUnitTypeId
    && row.consumedAt === input.consumedAt
    && row.timezone === input.timezone;
}
