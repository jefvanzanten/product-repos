import type {
  AvailableInputUnit,
  CalorieTrackerErrorResponse,
  CalorieTrackerUnitType,
  ConsumptionInputMode,
  ConsumptionLog,
  ConsumptionTypeFilter,
  CreateConsumptionLog,
  DailyStatistics,
  DeleteLogResult,
  LogList,
  MacroValues,
  NutritionGoal,
  PackageSearchResult,
  UpdateConsumptionLog,
  UpsertNutritionGoal,
} from "@product-repos/contracts/calorie-tracker";
import {
  calculateMacroValues,
  canonicalDecimal,
  deriveConsumptionQuantity,
  isAllowedConsumedAt,
  localDateForInstant,
  parsePositiveDecimal,
  sumMacroValues,
  type QuantityUnit,
} from "./domain.ts";
import {
  calorieTrackerStore,
  type CatalogPackageRecord,
  type ConsumptionLogRecord,
  type DrizzleCalorieTracker,
  type NutritionGoalRecord,
  type UnitTypeRecord,
} from "./drizzle-calorie-tracker.ts";

/** Typed result returned by Calorie Tracker application operations. */
export type CalorieTrackerResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: CalorieTrackerErrorResponse };

/** Clock capability used to make mutation and restore-window behavior deterministic. */
export type Clock = {
  /** Return the current instant. */
  now(): Date;
};

/** System clock used by the production Calorie Tracker application service. */
export const systemClock: Clock = {
  /** Return the current system time. */
  now: () => new Date(),
};

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

const deletedLogRetentionMilliseconds = 30 * 24 * 60 * 60 * 1_000;

/** Cohesive application service for user-owned Calorie Tracker operations. */
export class CalorieTracker {
  /** Create a Calorie Tracker service with explicit persistence and time capabilities. */
  constructor(
    private readonly store: DrizzleCalorieTracker,
    private readonly clock: Clock,
  ) {}

  /** Search active packages or return the user's recently consumed active packages. */
  searchPackages(userId: string, query: string | undefined, limit: number): CalorieTrackerResult<ReadonlyArray<PackageSearchResult>> {
    const activePackages = this.store.findCatalogPackages().filter(isActivePackage);
    if (query === undefined) {
      const byId = new Map(activePackages.map((row) => [row.packageId, row]));
      const recent = this.store.findRecentPackageIds(userId)
        .map((packageId) => byId.get(packageId))
        .filter((row): row is CatalogPackageRecord => row !== undefined)
        .slice(0, limit);
      return success(recent.map(toPackageSearchResult));
    }

    const normalizedQuery = query.trim().toLocaleLowerCase("nl-NL");
    if (normalizedQuery.length < 2) return failure("VALIDATION_ERROR", "Search query must contain at least two characters", { query: "Minimum length is 2" });
    const matches = activePackages
      .filter((row) => row.productName.toLocaleLowerCase("nl-NL").includes(normalizedQuery) || (row.brandName?.toLocaleLowerCase("nl-NL").includes(normalizedQuery) ?? false))
      .sort(compareSearchPackages)
      .slice(0, limit);
    return success(matches.map(toPackageSearchResult));
  }

  /** Return quantity input modes and compatible units for an active package. */
  getAvailableInputUnits(packageId: number): CalorieTrackerResult<ReadonlyArray<AvailableInputUnit>> {
    const packageRecord = this.store.findCatalogPackage(packageId);
    if (packageRecord === undefined || !isActivePackage(packageRecord)) return failure("PRODUCT_PACKAGE_NOT_FOUND", "Product package not found");
    const values: AvailableInputUnit[] = [{ inputMode: "PACKAGE", unitType: null, label: packageRecord.packageTypeName }];
    if (packageRecord.unitsPerPackage > 1 && packageRecord.individualPackageTypeName !== null) {
      values.push({ inputMode: "INDIVIDUAL_UNIT", unitType: null, label: packageRecord.individualPackageTypeName });
    }
    for (const unit of this.store.findUnitTypes().filter((candidate) => candidate.dimension === packageRecord.contentUnitDimension)) {
      values.push({ inputMode: "CONTENT_UNIT", unitType: toUnitType(unit), label: unit.name });
    }
    return success(values);
  }

  /** List active user-owned logs for a local date and optional type filter. */
  listLogs(userId: string, date: string, timezone: string, filter: ConsumptionTypeFilter): CalorieTrackerResult<LogList> {
    const logs = this.store.findUserLogs(userId)
      .filter((row) => localDateForInstant(row.consumedAt, row.timezone) === date)
      .map((row) => this.projectLog(row))
      .filter((result): result is { readonly ok: true; readonly value: ConsumptionLog } => result.ok)
      .map((result) => result.value)
      .filter((log) => filter === "all" || log.package.consumptionType.toLowerCase() === filter);
    return success({ date, timezone, type: filter, items: logs });
  }

  /** Read one active user-owned log without revealing another user's identifiers. */
  getLog(userId: string, logId: string): CalorieTrackerResult<ConsumptionLog> {
    const row = this.store.findLogById(logId);
    if (row === undefined || row.userId !== userId || row.deletedAt !== null) return failure("LOG_NOT_FOUND", "Log not found");
    return this.projectLog(row);
  }

  /** Create one log idempotently after comparing stored request content before current catalog validation. */
  createLog(userId: string, timezone: string, input: CreateConsumptionLog): CalorieTrackerResult<CreateLogOutcome> {
    const existing = this.store.findLogById(input.id);
    if (existing !== undefined) {
      if (existing.userId !== userId) return failure("LOG_ALREADY_EXISTS", "A log with this id already exists");
      const retryContent = parseCreateRequestContent(input, timezone);
      if (!retryContent.ok) return retryContent;
      if (existing.deletedAt !== null || !sameCreateContent(existing, retryContent.value)) return failure("LOG_CREATE_CONFLICT", "The log id was already used with different content");
      const projected = this.projectLog(existing);
      return projected.ok ? success({ state: "existing", log: projected.value }) : projected;
    }

    const parsed = this.parseMutationInput(input, undefined);
    if (!parsed.ok) return parsed;
    const now = this.clock.now().toISOString();
    const stored = this.store.insertLog({
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
      const raced = this.store.findLogById(input.id);
      if (raced === undefined) throw new Error("Idempotent log insert did not persist or conflict");
      if (raced.userId !== userId) return failure("LOG_ALREADY_EXISTS", "A log with this id already exists");
      if (raced.deletedAt !== null || !sameCreateContent(raced, { ...parsed.value, timezone })) return failure("LOG_CREATE_CONFLICT", "The log id was already used with different content");
      const racedProjection = this.projectLog(raced);
      return racedProjection.ok ? success({ state: "existing", log: racedProjection.value }) : racedProjection;
    }
    const projected = this.projectLog(stored);
    return projected.ok ? success({ state: "created", log: projected.value }) : projected;
  }

  /** Update one log with optimistic concurrency and current package selectability rules. */
  updateLog(userId: string, logId: string, timezone: string, input: UpdateConsumptionLog): CalorieTrackerResult<ConsumptionLog> {
    const existing = this.store.findLogById(logId);
    if (existing === undefined || existing.userId !== userId || existing.deletedAt !== null) return failure("LOG_NOT_FOUND", "Log not found");
    if (existing.updatedAt !== input.expectedUpdatedAt) return failure("LOG_UPDATE_CONFLICT", "The log has changed since it was opened");
    const parsed = this.parseMutationInput(input, existing.productPackageId);
    if (!parsed.ok) return parsed;
    const updatedAt = nextTimestamp(this.clock.now(), existing.updatedAt);
    const updated = this.store.updateLog(userId, logId, input.expectedUpdatedAt, { ...parsed.value, timezone, updatedAt });
    if (updated === undefined) return failure("LOG_UPDATE_CONFLICT", "The log has changed since it was opened");
    return this.projectLog(updated);
  }

  /** Soft-delete one active user-owned log and open its five-second restore window. */
  deleteLog(userId: string, logId: string): CalorieTrackerResult<DeleteLogResult> {
    const existing = this.store.findLogById(logId);
    if (existing === undefined || existing.userId !== userId || existing.deletedAt !== null) return failure("LOG_NOT_FOUND", "Log not found");
    const now = this.clock.now();
    const deletedAt = nextTimestamp(now, existing.updatedAt);
    const deleted = this.store.deleteLog(userId, logId, deletedAt, deletedAt);
    if (deleted === undefined) return failure("LOG_NOT_FOUND", "Log not found");
    return success({ id: logId, deletedAt, restoreUntil: new Date(Date.parse(deletedAt) + 5_000).toISOString() });
  }

  /** Restore a user-owned soft-deleted log during the five-second undo window. */
  restoreLog(userId: string, logId: string): CalorieTrackerResult<ConsumptionLog> {
    const existing = this.store.findLogById(logId);
    if (existing === undefined || existing.userId !== userId || existing.deletedAt === null) return failure("LOG_NOT_FOUND", "Log not found");
    const now = this.clock.now();
    if (now.getTime() > Date.parse(existing.deletedAt) + 5_000) return failure("LOG_RESTORE_WINDOW_EXPIRED", "The restore window has expired");
    const updatedAt = nextTimestamp(now, existing.updatedAt);
    const restored = this.store.restoreLog(userId, logId, existing.deletedAt, updatedAt);
    if (restored === undefined) return failure("LOG_NOT_FOUND", "Log not found");
    return this.projectLog(restored);
  }

  /** Physically delete soft-deleted logs retained for at least thirty days. */
  cleanupDeletedLogs(): CalorieTrackerResult<CleanupDeletedLogsOutcome> {
    const cutoffInclusive = new Date(this.clock.now().getTime() - deletedLogRetentionMilliseconds).toISOString();
    return success({
      deletedCount: this.store.deleteExpiredLogs(cutoffInclusive),
      cutoffInclusive,
    });
  }

  /** Return current goals or an empty goal projection when none have been stored. */
  getGoals(userId: string): CalorieTrackerResult<NutritionGoal> {
    const row = this.store.findGoals(userId);
    return success(row === undefined ? emptyGoals() : toNutritionGoal(row));
  }

  /** Atomically replace all current optional nutrition goals. */
  replaceGoals(userId: string, input: UpsertNutritionGoal): CalorieTrackerResult<NutritionGoal> {
    const existing = this.store.findGoals(userId);
    const now = nextTimestamp(this.clock.now(), existing?.updatedAt);
    const stored = this.store.upsertGoals({
      userId,
      caloriesKcal: input.caloriesKcal,
      proteinG: input.proteinG === null ? null : canonicalDecimal(input.proteinG),
      carbohydratesG: input.carbohydratesG === null ? null : canonicalDecimal(input.carbohydratesG),
      fatG: input.fatG === null ? null : canonicalDecimal(input.fatG),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    return success(toNutritionGoal(stored));
  }

  /** Aggregate exact daily nutrition totals from current catalog data and active logs. */
  getDailyStatistics(userId: string, date: string, timezone: string): CalorieTrackerResult<DailyStatistics> {
    const values = this.store.findUserLogs(userId)
      .filter((row) => localDateForInstant(row.consumedAt, row.timezone) === date)
      .map((row) => this.projectLog(row))
      .filter((result): result is { readonly ok: true; readonly value: ConsumptionLog } => result.ok)
      .map((result) => result.value.macroValues);
    const summed = sumMacroValues(values);
    const totals: MacroValues = {
      caloriesKcal: summed.caloriesKcal ?? "0",
      proteinG: summed.proteinG ?? "0",
      carbohydratesG: summed.carbohydratesG ?? "0",
      fatG: summed.fatG ?? "0",
    };
    const goals = this.store.findGoals(userId);
    return success({ date, timezone, totals, goals: goals === undefined ? null : toNutritionGoal(goals) });
  }

  /** Parse and normalize a create or update payload into persistence values. */
  private parseMutationInput(
    input: Omit<CreateConsumptionLog, "id"> | UpdateConsumptionLog,
    currentPackageId: number | undefined,
  ): CalorieTrackerResult<{
    readonly productPackageId: number;
    readonly quantity: string;
    readonly inputMode: ConsumptionInputMode;
    readonly inputUnitTypeId: number | null;
    readonly consumedAt: string;
  }> {
    const packageRecord = this.store.findCatalogPackage(input.packageId);
    if (packageRecord === undefined) return failure("PRODUCT_PACKAGE_NOT_FOUND", "Product package not found");
    if (!isActivePackage(packageRecord) && packageRecord.packageId !== currentPackageId) return failure("PRODUCT_PACKAGE_ARCHIVED", "Product package is archived");
    const quantity = parsePositiveDecimal(input.quantity);
    if (!quantity.ok) return { ok: false, error: quantity.error };
    const inputUnit = input.inputUnitTypeId === null ? null : this.store.findUnitType(input.inputUnitTypeId) ?? null;
    const derived = deriveConsumptionQuantity(toQuantityPackage(packageRecord), {
      quantity: quantity.value,
      inputMode: input.inputMode,
      inputUnit,
    });
    if (!derived.ok) return { ok: false, error: derived.error };
    if (!isAllowedConsumedAt(input.consumedAt, this.clock.now())) return failure("VALIDATION_ERROR", "Consumed instant cannot be in the future", { consumedAt: "Future instants are not allowed" });
    return success({
      productPackageId: input.packageId,
      quantity: quantity.value,
      inputMode: input.inputMode,
      inputUnitTypeId: input.inputUnitTypeId,
      consumedAt: new Date(input.consumedAt).toISOString(),
    });
  }

  /** Project a persistence log using current catalog, package, unit, and nutrition data. */
  private projectLog(row: ConsumptionLogRecord): CalorieTrackerResult<ConsumptionLog> {
    const packageRecord = this.store.findCatalogPackage(row.productPackageId);
    if (packageRecord === undefined) return failure("REFERENCE_NOT_FOUND", "Log package reference is missing");
    const inputUnit = row.inputUnitTypeId === null ? null : this.store.findUnitType(row.inputUnitTypeId) ?? null;
    const derived = deriveConsumptionQuantity(toQuantityPackage(packageRecord), {
      quantity: canonicalDecimal(row.quantity),
      inputMode: row.inputMode,
      inputUnit,
    });
    if (!derived.ok) return { ok: false, error: derived.error };
    return success({
      id: row.id,
      package: {
        ...toPackageSearchResult(packageRecord),
        productArchived: packageRecord.productArchivedAt !== null,
        packageArchived: packageRecord.packageArchivedAt !== null,
      },
      quantity: canonicalDecimal(row.quantity),
      inputMode: row.inputMode,
      inputUnitType: inputUnit === null ? null : toUnitType(inputUnit),
      consumedAt: row.consumedAt,
      timezone: row.timezone,
      localDate: localDateForInstant(row.consumedAt, row.timezone),
      derivedQuantityLabel: derived.value.label,
      macroValues: calculateMacroValues(packageRecord.macroProfile, derived.value.baseAmount),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

/** Construct a successful application result. */
function success<T>(value: T): CalorieTrackerResult<T> {
  return { ok: true, value };
}

/** Construct a typed expected application failure. */
function failure(
  code: CalorieTrackerErrorResponse["code"],
  message: string,
  fields?: Record<string, string>,
): CalorieTrackerResult<never> {
  return fields === undefined ? { ok: false, error: { code, message } } : { ok: false, error: { code, message, fields } };
}

/** Determine whether both product and package are actively selectable. */
function isActivePackage(row: CatalogPackageRecord): boolean {
  return row.productArchivedAt === null && row.packageArchivedAt === null;
}

/** Sort package search matches with single packages first and stable names thereafter. */
function compareSearchPackages(left: CatalogPackageRecord, right: CatalogPackageRecord): number {
  const packageRank = Number(left.unitsPerPackage > 1) - Number(right.unitsPerPackage > 1);
  return packageRank
    || left.productName.localeCompare(right.productName, "nl", { sensitivity: "base" })
    || (left.brandName ?? "").localeCompare(right.brandName ?? "", "nl", { sensitivity: "base" })
    || left.packageId - right.packageId;
}

/** Project a persistence unit into the shared strict protocol contract. */
function toUnitType(row: UnitTypeRecord): CalorieTrackerUnitType {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    dimension: row.dimension,
    conversionToBase: canonicalDecimal(row.conversionToBase),
  };
}

/** Format a current package summary for compact package selection. */
function packageSummary(row: CatalogPackageRecord): string {
  const amount = canonicalDecimal(row.contentAmount);
  if (row.unitsPerPackage === 1) return `${row.packageTypeName} ${amount} ${row.contentUnitSymbol}`;
  return `${row.packageTypeName} (${row.unitsPerPackage} x ${amount} ${row.contentUnitSymbol})`;
}

/** Project joined package rows into the shared strict search contract. */
function toPackageSearchResult(row: CatalogPackageRecord): PackageSearchResult {
  return {
    packageId: row.packageId,
    productId: row.productId,
    productName: row.productName,
    displayName: row.brandName === null ? row.productName : `${row.productName} - ${row.brandName}`,
    brand: row.brandId === null || row.brandName === null ? null : { id: row.brandId, name: row.brandName },
    consumptionType: row.consumptionType,
    packageType: { id: row.packageTypeId, name: row.packageTypeName },
    individualPackageType: row.individualPackageTypeId === null || row.individualPackageTypeName === null
      ? null
      : { id: row.individualPackageTypeId, name: row.individualPackageTypeName },
    contentAmount: canonicalDecimal(row.contentAmount),
    contentUnit: {
      id: row.contentUnitId,
      name: row.contentUnitName,
      symbol: row.contentUnitSymbol,
      dimension: row.contentUnitDimension,
      conversionToBase: canonicalDecimal(row.contentUnitConversionToBase),
    },
    unitsPerPackage: row.unitsPerPackage,
    summary: packageSummary(row),
    imageUrl: null,
  };
}

/** Project package data into the pure quantity-conversion input. */
function toQuantityPackage(row: CatalogPackageRecord) {
  return {
    contentAmount: canonicalDecimal(row.contentAmount),
    contentUnit: {
      id: row.contentUnitId,
      name: row.contentUnitName,
      symbol: row.contentUnitSymbol,
      dimension: row.contentUnitDimension,
      conversionToBase: canonicalDecimal(row.contentUnitConversionToBase),
    } satisfies QuantityUnit,
    unitsPerPackage: row.unitsPerPackage,
    packageLabel: row.packageTypeName,
    individualLabel: row.individualPackageTypeName,
  };
}

/** Canonicalize only the immutable create-request fields without consulting mutable catalog data. */
function parseCreateRequestContent(
  input: CreateConsumptionLog,
  timezone: string,
): CalorieTrackerResult<{
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
function sameCreateContent(
  row: ConsumptionLogRecord,
  input: {
    readonly productPackageId: number;
    readonly quantity: string;
    readonly inputMode: ConsumptionInputMode;
    readonly inputUnitTypeId: number | null;
    readonly consumedAt: string;
    readonly timezone: string;
  },
): boolean {
  return row.productPackageId === input.productPackageId
    && canonicalDecimal(row.quantity) === input.quantity
    && row.inputMode === input.inputMode
    && row.inputUnitTypeId === input.inputUnitTypeId
    && row.consumedAt === input.consumedAt
    && row.timezone === input.timezone;
}

/** Return an ISO timestamp strictly later than a prior concurrency token when needed. */
function nextTimestamp(now: Date, previous: string | undefined): string {
  if (previous === undefined || now.getTime() > Date.parse(previous)) return now.toISOString();
  return new Date(Date.parse(previous) + 1).toISOString();
}

/** Project a stored nutrition-goal row into the shared strict response contract. */
function toNutritionGoal(row: NutritionGoalRecord): NutritionGoal {
  return {
    caloriesKcal: row.caloriesKcal,
    proteinG: row.proteinG === null ? null : canonicalDecimal(row.proteinG),
    carbohydratesG: row.carbohydratesG === null ? null : canonicalDecimal(row.carbohydratesG),
    fatG: row.fatG === null ? null : canonicalDecimal(row.fatG),
    updatedAt: row.updatedAt,
  };
}

/** Construct the response used before a user has stored any goals. */
function emptyGoals(): NutritionGoal {
  return { caloriesKcal: null, proteinG: null, carbohydratesG: null, fatG: null, updatedAt: null };
}

/** Default Calorie Tracker application service wired to SQLite and the system clock. */
export const calorieTracker = new CalorieTracker(calorieTrackerStore, systemClock);
