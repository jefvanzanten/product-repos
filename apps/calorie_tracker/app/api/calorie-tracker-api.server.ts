import {
  availableInputUnitsSchema,
  calorieTrackerErrorResponseSchema,
  consumptionLogSchema,
  dailyStatisticsSchema,
  deleteDishResultSchema,
  deleteLogResultSchema,
  dishSchema,
  logListSchema,
  nutritionGoalSchema,
  packageSearchResultsSchema,
  unifiedSearchResultSchema,
  type AvailableInputUnit,
  type CalorieTrackerErrorResponse,
  type ConsumptionLog,
  type ConsumptionTypeFilter,
  type CreateConsumptionLog,
  type CreateDish,
  type DailyStatistics,
  type DeleteDishResult,
  type DeleteLogResult,
  type Dish,
  type LogList,
  type NutritionGoal,
  type PackageSearchResult,
  type UnifiedSearchResult,
  type UpdateConsumptionLog,
  type UpdateDish,
  type UpsertNutritionGoal,
} from "@product-repos/contracts/calorie-tracker";
import { sendBackendRequest } from "./backend-api.server";

type ProtocolSchema<T> = {
  readonly parse: (input: unknown) => T;
};

/** A classified backend failure safe for route-level error mapping. */
export class CalorieTrackerApiError extends Error {
  readonly status: number;
  readonly response: CalorieTrackerErrorResponse | null;

  /**
   * Create a classified backend API error.
   *
   * @param status - Backend HTTP status.
   * @param response - Parsed protocol error when available.
   */
  constructor(status: number, response: CalorieTrackerErrorResponse | null) {
    super(response?.message ?? `Backend request failed with status ${status}`);
    this.name = "CalorieTrackerApiError";
    this.status = status;
    this.response = response;
  }
}

/**
 * Fetch aggregate statistics for one local calendar date.
 *
 * @param date - The date value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function getDailyStatistics(date: string, timezone: string, request: Request): Promise<DailyStatistics> {
  return getJson(`/calorie-tracker/statistics?${new URLSearchParams({ date })}`, dailyStatisticsSchema, timezone, request);
}

/**
 * Atomically replace all current nutrition goals.
 *
 * @param input - The input value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function putNutritionGoals(input: UpsertNutritionGoal, timezone: string, request: Request): Promise<NutritionGoal> {
  return requestJson("/calorie-tracker/goals", "PUT", input, nutritionGoalSchema, timezone, request);
}

/**
 * Fetch a date- and filter-scoped consumption-log list.
 *
 * @param date - The date value.
 * @param type - The type value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function getConsumptionLogs(date: string, type: ConsumptionTypeFilter, timezone: string, request: Request): Promise<LogList> {
  return getJson(`/calorie-tracker/logs?${new URLSearchParams({ date, type })}`, logListSchema, timezone, request);
}

/**
 * Fetch recent packages or search active catalog packages.
 *
 * @param query - The query value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function getLoggablePackages(query: string | null, timezone: string, request: Request): Promise<ReadonlyArray<PackageSearchResult>> {
  const search = query === null ? "" : `?${new URLSearchParams({ query })}`;
  return getJson(`/calorie-tracker/packages/search${search}`, packageSearchResultsSchema, timezone, request);
}

/**
 * Search packages and dishes together for the log-addition flow.
 *
 * @param query - The query value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function getUnifiedSearch(query: string | null, timezone: string, request: Request): Promise<ReadonlyArray<UnifiedSearchResult>> {
  const search = query === null ? "" : `?${new URLSearchParams({ query })}`;
  return getJson(`/calorie-tracker/search${search}`, unifiedSearchResultSchema.array(), timezone, request);
}

/**
 * Fetch one private dish with its newest recipe version.
 *
 * @param dishId - The dishId value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function getDish(dishId: string, timezone: string, request: Request): Promise<Dish> {
  return getJson(`/calorie-tracker/dishes/${encodeURIComponent(dishId)}`, dishSchema, timezone, request);
}

/**
 * Create one user-owned dish with its first recipe version.
 *
 * @param input - The input value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function createDish(input: CreateDish, timezone: string, request: Request): Promise<Dish> {
  return requestJson("/calorie-tracker/dishes", "POST", input, dishSchema, timezone, request);
}

/**
 * Update one user-owned dish, creating a new version on recipe changes.
 *
 * @param dishId - The dishId value.
 * @param input - The input value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function updateDish(dishId: string, input: UpdateDish, timezone: string, request: Request): Promise<Dish> {
  return requestJson(`/calorie-tracker/dishes/${encodeURIComponent(dishId)}`, "PUT", input, dishSchema, timezone, request);
}

/**
 * Soft-delete one user-owned dish without a restore flow.
 *
 * @param dishId - The dishId value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function deleteDish(dishId: string, timezone: string, request: Request): Promise<DeleteDishResult> {
  return requestJson(`/calorie-tracker/dishes/${encodeURIComponent(dishId)}`, "DELETE", undefined, deleteDishResultSchema, timezone, request);
}

/**
 * Fetch valid quantity input units for one selected package.
 *
 * @param packageId - The packageId value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function getAvailableInputUnits(packageId: number, timezone: string, request: Request): Promise<ReadonlyArray<AvailableInputUnit>> {
  return getJson(`/calorie-tracker/packages/${packageId}/input-units`, availableInputUnitsSchema, timezone, request);
}

/**
 * Create one client-idempotent consumption log.
 *
 * @param input - The input value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function createConsumptionLog(input: CreateConsumptionLog, timezone: string, request: Request): Promise<ConsumptionLog> {
  return requestJson("/calorie-tracker/logs", "POST", input, consumptionLogSchema, timezone, request);
}

/**
 * Fetch one private consumption-log detail.
 *
 * @param logId - The logId value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function getConsumptionLog(logId: string, timezone: string, request: Request): Promise<ConsumptionLog> {
  return getJson(`/calorie-tracker/logs/${encodeURIComponent(logId)}`, consumptionLogSchema, timezone, request);
}

/**
 * Update a consumption log with optimistic concurrency.
 *
 * @param logId - The logId value.
 * @param input - The input value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function updateConsumptionLog(logId: string, input: UpdateConsumptionLog, timezone: string, request: Request): Promise<ConsumptionLog> {
  return requestJson(`/calorie-tracker/logs/${encodeURIComponent(logId)}`, "PUT", input, consumptionLogSchema, timezone, request);
}

/**
 * Soft-delete one consumption log.
 *
 * @param logId - The logId value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function deleteConsumptionLog(logId: string, timezone: string, request: Request): Promise<DeleteLogResult> {
  return requestJson(`/calorie-tracker/logs/${encodeURIComponent(logId)}`, "DELETE", undefined, deleteLogResultSchema, timezone, request);
}

/**
 * Restore a recently soft-deleted consumption log.
 *
 * @param logId - The logId value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export async function restoreConsumptionLog(logId: string, timezone: string, request: Request): Promise<ConsumptionLog> {
  return requestJson(`/calorie-tracker/logs/${encodeURIComponent(logId)}/restore`, "POST", undefined, consumptionLogSchema, timezone, request);
}

/**
 * Perform and parse one authenticated backend GET request.
 *
 * @param path - The path value.
 * @param schema - The schema value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
async function getJson<T>(path: string, schema: ProtocolSchema<T>, timezone: string, request: Request): Promise<T> {
  return requestJson(path, "GET", undefined, schema, timezone, request);
}

/**
 * Perform one authenticated backend request and parse its success contract.
 *
 * @param path - The path value.
 * @param method - The method value.
 * @param body - The body value.
 * @param schema - The schema value.
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
async function requestJson<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body: unknown,
  schema: ProtocolSchema<T>,
  timezone: string,
  request: Request,
): Promise<T> {
  const response = await sendBackendRequest(path, request, { method, body, timezone });
  const raw = await readUnknownJson(response);
  if (!response.ok) {
    const parsed = calorieTrackerErrorResponseSchema.safeParse(raw);
    throw new CalorieTrackerApiError(response.status, parsed.success ? parsed.data : null);
  }
  return schema.parse(raw);
}

/**
 * Read an untrusted JSON response without asserting its protocol shape.
 *
 * @param response - The response value.
 * @returns The function result.
 */
async function readUnknownJson(response: Response): Promise<unknown> {
  try {
    const value: unknown = await response.json();
    return value;
  } catch {
    return null;
  }
}
