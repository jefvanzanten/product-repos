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
import type { ConsumptionCatalogReader } from "../../catalog/repositories/consumption-catalog.repository.ts";
import type {
  ConsumptionLogRecord,
  ConsumptionLogRepository,
  InsertConsumptionLogRecord,
  ProductConsumptionLogRecord,
  UpdateConsumptionLogRecord,
} from "../repositories/consumption-log.repository.ts";
import type { DishRepository } from "../../recipes/repositories/dish.repository.ts";
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
  readonly dishRepository: DishRepository;
  readonly clock: Clock;
}) {
  const { catalogReader, logRepository, dishRepository, clock } = dependencies;
  const projector = createConsumptionLogProjector(catalogReader, dishRepository);

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
      if (filter === "all" || logMatchesFilter(projected.value, filter)) logs.push(projected.value);
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
      const sameContent = sameCreateContent(existing, retryContent.value);
      if (!sameContent.ok) return sameContent;
      if (existing.deletedAt !== null || !sameContent.value) return failure("LOG_CREATE_CONFLICT", "The log id was already used with different content");
      const projected = projector.projectLog(existing);
      return projected.ok ? success({ state: "existing", log: projected.value }) : projectionFailure();
    }

    const parsed = parseCreateInput(userId, input);
    if (!parsed.ok) return parsed;
    const now = clock.now().toISOString();
    const createContent: ParsedCreateContent = parsed.value;
    const stored = logRepository.insertLog({
      ...createContent,
      id: input.id,
      userId,
      timezone,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } satisfies InsertConsumptionLogRecord);
    if (stored === undefined) {
      const raced = logRepository.findLogById(input.id);
      if (raced === undefined) throw new Error("Idempotent log insert did not persist or conflict");
      if (raced.userId !== userId) return failure("LOG_ALREADY_EXISTS", "A log with this id already exists");
      const racedContent = parseCreateRequestContent(input, timezone);
      if (!racedContent.ok) return racedContent;
      const sameRacedContent = sameCreateContent(raced, racedContent.value);
      if (!sameRacedContent.ok) return sameRacedContent;
      if (raced.deletedAt !== null || !sameRacedContent.value) return failure("LOG_CREATE_CONFLICT", "The log id was already used with different content");
      const projected = projector.projectLog(raced);
      return projected.ok ? success({ state: "existing", log: projected.value }) : projectionFailure();
    }
    const projected = projector.projectLog(stored);
    return projected.ok ? success({ state: "created", log: projected.value }) : projectionFailure();
  }

  /** Update one log with optimistic concurrency and current catalog or dish rules per subtype. */
  function updateLog(userId: string, logId: string, timezone: string, input: UpdateConsumptionLog): CalorieTrackerResult<ConsumptionLog> {
    const existing = logRepository.findLogById(logId);
    if (existing === undefined || existing.userId !== userId || existing.deletedAt !== null) return failure("LOG_NOT_FOUND", "Log not found");
    if (existing.updatedAt !== input.expectedUpdatedAt) return failure("LOG_UPDATE_CONFLICT", "The log has changed since it was opened");
    if (existing.type !== input.type) return failure("VALIDATION_ERROR", "Log type cannot be changed");
    const parsed = input.type === "PRODUCT"
      ? parseProductInput(input, existing.type === "PRODUCT" ? existing : undefined)
      : parseDishUpdateInput(input);
    if (!parsed.ok) return parsed;
    const updatedAt = nextTimestamp(clock.now(), existing.updatedAt);
    const updateContent: ParsedUpdateContent = parsed.value;
    const updated = logRepository.updateLog(userId, logId, input.expectedUpdatedAt, { ...updateContent, timezone, updatedAt } satisfies UpdateConsumptionLogRecord);
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

  /** Parse and validate a create payload into persisted subtype content. */
  function parseCreateInput(userId: string, input: CreateConsumptionLog): CalorieTrackerResult<ParsedCreateContent> {
    if (input.type === "PRODUCT") return parseProductInput(input, undefined);
    const dishRow = dishRepository.findDishById(input.dishId);
    if (
      dishRow === undefined
      || dishRow.archivedAt !== null
      || dishRow.deletedAt !== null
      || (dishRow.userId !== userId && dishRow.visibility !== "PUBLIC")
    ) return failure("DISH_NOT_FOUND", "Dish not found");
    const version = dishRepository.findNewestVersion(dishRow.id);
    if (version === undefined) return projectionFailure();
    const quantity = parsePositiveDecimal(input.quantity);
    if (!quantity.ok) return { ok: false, error: quantity.error };
    if (!isAllowedConsumedAt(input.consumedAt, clock.now())) return failure("VALIDATION_ERROR", "Consumed instant cannot be in the future", { consumedAt: "Future instants are not allowed" });
    return success({ type: "DISH", dishVersionId: version.id, quantity: quantity.value, consumedAt: new Date(input.consumedAt).toISOString() });
  }

  /** Parse and validate a product create or update payload against current catalog rules. */
  function parseProductInput(
    input: { readonly productId: string; readonly quantity: string; readonly inputMode: ConsumptionInputMode; readonly inputUnitTypeId: number | null; readonly consumedAt: string },
    currentLog: ProductConsumptionLogRecord | undefined,
  ): CalorieTrackerResult<ProductContent> {
    const packageRecord = catalogReader.findCatalogProduct(input.productId);
    if (packageRecord === undefined) return failure("PRODUCT_NOT_FOUND", "Product not found");
    const keepsHistoricalInput = currentLog !== undefined
      && packageRecord.productId === currentLog.productId
      && input.inputMode === currentLog.inputMode
      && input.inputUnitTypeId === currentLog.inputUnitTypeId;
    if (packageRecord.consumptionType === null && !keepsHistoricalInput) {
      return failure("PRODUCT_NOT_CONSUMABLE", "Non-consumable product input cannot be selected");
    }
    if (packageRecord.productArchivedAt !== null && !keepsHistoricalInput) {
      return failure("PRODUCT_ARCHIVED", "Archived product input cannot be replaced");
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
      type: "PRODUCT",
      productId: input.productId,
      quantity: quantity.value,
      inputMode: input.inputMode,
      inputUnitTypeId: input.inputUnitTypeId,
      consumedAt: new Date(input.consumedAt).toISOString(),
    });
  }

  /** Parse and validate a dish update payload limited to quantity and instant. */
  function parseDishUpdateInput(input: { readonly quantity: string; readonly consumedAt: string }): CalorieTrackerResult<DishUpdateContent> {
    const quantity = parsePositiveDecimal(input.quantity);
    if (!quantity.ok) return { ok: false, error: quantity.error };
    if (!isAllowedConsumedAt(input.consumedAt, clock.now())) return failure("VALIDATION_ERROR", "Consumed instant cannot be in the future", { consumedAt: "Future instants are not allowed" });
    return success({ type: "DISH", quantity: quantity.value, consumedAt: new Date(input.consumedAt).toISOString() });
  }

  /** Compare canonical create content to persisted content for idempotent retries. */
  function sameCreateContent(row: ConsumptionLogRecord, input: CreateContent): CalorieTrackerResult<boolean> {
    if (row.type === "PRODUCT") {
      if (input.type !== "PRODUCT") return success(false);
      return success(
        row.productId === input.productId
        && canonicalDecimal(row.quantity) === input.quantity
        && row.inputMode === input.inputMode
        && row.inputUnitTypeId === input.inputUnitTypeId
        && row.consumedAt === input.consumedAt
        && row.timezone === input.timezone,
      );
    }
    if (input.type !== "DISH") return success(false);
    const versions = dishRepository.findVersionsByIds([row.dishVersionId]);
    if (versions.length !== 1) return projectionFailure();
    return success(
      versions[0]!.dishId === input.dishId
      && canonicalDecimal(row.quantity) === input.quantity
      && row.consumedAt === input.consumedAt
      && row.timezone === input.timezone,
    );
  }

  return { listLogs, getLog, createLog, updateLog, deleteLog, restoreLog, cleanupDeletedLogs };
}

/** Persisted product subtype content shared by create and update parsing. */
type ProductContent = {
  readonly type: "PRODUCT";
  readonly productId: string;
  readonly quantity: string;
  readonly inputMode: ConsumptionInputMode;
  readonly inputUnitTypeId: number | null;
  readonly consumedAt: string;
};

/** Persisted dish content produced by create parsing, pinning the resolved version. */
type DishCreateContent = {
  readonly type: "DISH";
  readonly dishVersionId: string;
  readonly quantity: string;
  readonly consumedAt: string;
};

/** Persisted dish content produced by update parsing, keeping the pinned version. */
type DishUpdateContent = {
  readonly type: "DISH";
  readonly quantity: string;
  readonly consumedAt: string;
};

/** Parsed create payload ready for persistence. */
type ParsedCreateContent = ProductContent | DishCreateContent;

/** Parsed update payload ready for persistence. */
type ParsedUpdateContent = ProductContent | DishUpdateContent;

/** Canonical create-content comparison values for idempotent retries. */
type CreateContent =
  | { readonly type: "PRODUCT"; readonly productId: string; readonly quantity: string; readonly inputMode: ConsumptionInputMode; readonly inputUnitTypeId: number | null; readonly consumedAt: string; readonly timezone: string }
  | { readonly type: "DISH"; readonly dishId: string; readonly quantity: string; readonly consumedAt: string; readonly timezone: string };

/** Determine whether one projected log satisfies the requested type filter. */
function logMatchesFilter(log: ConsumptionLog, filter: ConsumptionTypeFilter): boolean {
  if (log.type === "DISH") return filter === "food";
  return log.product.consumptionType !== null && log.product.consumptionType.toLowerCase() === filter;
}

/** Canonicalize only immutable create-request fields without consulting mutable catalog data. */
function parseCreateRequestContent(input: CreateConsumptionLog, timezone: string): CalorieTrackerResult<CreateContent> {
  const quantity = parsePositiveDecimal(input.quantity);
  if (!quantity.ok) return { ok: false, error: quantity.error };
  if (input.type === "PRODUCT") {
    return success({
      type: "PRODUCT",
      productId: input.productId,
      quantity: quantity.value,
      inputMode: input.inputMode,
      inputUnitTypeId: input.inputUnitTypeId,
      consumedAt: new Date(input.consumedAt).toISOString(),
      timezone,
    });
  }
  return success({
    type: "DISH",
    dishId: input.dishId,
    quantity: quantity.value,
    consumedAt: new Date(input.consumedAt).toISOString(),
    timezone,
  });
}
