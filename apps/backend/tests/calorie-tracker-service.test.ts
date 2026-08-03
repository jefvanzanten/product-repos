import { describe, expect, it } from "bun:test";
import { createConsumptionLogService } from "../src/modules/calorie-tracker/services/consumption-log.service.ts";
import { createNutritionSummaryService } from "../src/modules/calorie-tracker/services/nutrition-summary.service.ts";
import type { ConsumptionCatalogReader } from "../src/modules/catalog/repositories/consumption-catalog-reader.ts";
import type {
  ConsumptionLogRecord,
  ConsumptionLogRepository,
  NutritionGoalRecord,
  NutritionGoalRepository,
} from "../src/modules/calorie-tracker/repositories/calorie-tracker-store.ts";

const missingReferenceLog: ConsumptionLogRecord = {
  id: "10000000-0000-4000-8000-000000000001",
  userId: "user-1",
  productPackageId: 404,
  quantity: "1",
  inputMode: "PACKAGE",
  inputUnitTypeId: null,
  consumedAt: "2026-01-15T12:00:00.000Z",
  timezone: "UTC",
  createdAt: "2026-01-15T12:00:00.000Z",
  updatedAt: "2026-01-15T12:00:00.000Z",
  deletedAt: null,
};

/** Create a minimal persistence fake with one log whose package reference is missing. */
function createBrokenProjectionStore(): {
  readonly catalogReader: ConsumptionCatalogReader;
  readonly logRepository: ConsumptionLogRepository;
  readonly goalRepository: NutritionGoalRepository;
} {
  const catalogReader: ConsumptionCatalogReader = {
    searchActiveCatalogPackages: () => [],
    findRecentActiveCatalogPackages: () => [],
    findCatalogPackage: () => undefined,
    findCatalogPackagesByIds: () => [],
    findCompatibleUnitTypes: () => [],
    findUnitType: () => undefined,
    findUnitTypesByIds: () => [],
  };
  const logRepository: ConsumptionLogRepository = {
    findUserLogsInWindow: () => [missingReferenceLog],
    findLogById: () => undefined,
    insertLog: () => undefined,
    updateLog: () => undefined,
    deleteLog: () => undefined,
    restoreLog: () => undefined,
    deleteExpiredLogs: () => 0,
  };
  const goalRepository: NutritionGoalRepository = {
    findGoals: () => undefined,
    upsertGoals: (input: NutritionGoalRecord) => input,
  };
  return { catalogReader, logRepository, goalRepository };
}

/** Create focused services under a deterministic clock for pure application tests. */
function createServices() {
  const dependencies = createBrokenProjectionStore();
  const clock = {
    /** Return a stable instant after the projected test log. */
    now: () => new Date("2026-01-16T00:00:00.000Z"),
  };
  return {
    consumptionLogs: createConsumptionLogService({ ...dependencies, clock }),
    nutritionSummary: createNutritionSummaryService({ ...dependencies, clock }),
  };
}

describe("Calorie Tracker service projection invariants", () => {
  it("fails the complete log list instead of silently returning partial data", () => {
    expect(createServices().consumptionLogs.listLogs("user-1", "2026-01-15", "UTC", "all")).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "A stored consumption log could not be projected" },
    });
  });

  it("fails statistics instead of calculating totals from a partial projection", () => {
    expect(createServices().nutritionSummary.getDailyStatistics("user-1", "2026-01-15", "UTC")).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "A stored consumption log could not be projected" },
    });
  });
});
