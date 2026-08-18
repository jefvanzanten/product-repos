import {
  availableInputUnitsSchema,
  consumptionLogSchema,
  deleteLogResultSchema,
  logListSchema,
  productSearchResultsSchema,
  unifiedSearchResultSchema,
} from "@product-repos/contracts/calorie-tracker";
import type { BackendRequestContext } from "../../../core/data/backend-api.server";
import {
  getCalorieTrackerJson,
  requestCalorieTrackerJson,
} from "../../../core/data/calorie-tracker-api.server";
import type { ConsumptionTypeFilter } from "../../../core/domain/consumption-types";
import type {
  AvailableInputUnit,
  ConsumableSearchResult,
  ConsumptionLog,
  ConsumptionLogList,
  CreateConsumptionLog,
  DeleteLogResult,
  ProductSearchResult,
  UpdateConsumptionLog,
} from "../domain/consumption-log";
import {
  mapAvailableInputUnit,
  mapConsumableSearchResult,
  mapConsumptionLog,
  mapDeleteLogResult,
  mapProductSearchResult,
} from "./consumption-log-mappers";

export { CalorieTrackerApiError } from "../../../core/data/calorie-tracker-api.server";

/** Fetch a date- and filter-scoped consumption-log list. */
export async function getConsumptionLogs(
  date: string,
  type: ConsumptionTypeFilter,
  context: BackendRequestContext,
): Promise<ConsumptionLogList> {
  const dto = await getCalorieTrackerJson(
    `/calorie-tracker/logs?${new URLSearchParams({ date, type })}`,
    logListSchema,
    context,
  );
  return { ...dto, items: dto.items.map(mapConsumptionLog) };
}

/** Fetch recent packages or search active catalog packages. */
export async function getLoggableProducts(
  query: string | null,
  context: BackendRequestContext,
): Promise<ReadonlyArray<ProductSearchResult>> {
  const search = query === null ? "" : `?${new URLSearchParams({ query })}`;
  const dtos = await getCalorieTrackerJson(
    `/calorie-tracker/products/search${search}`,
    productSearchResultsSchema,
    context,
  );
  return dtos.map(mapProductSearchResult);
}

/** Search products and dishes for the log-addition flow. */
export async function getConsumableSearchResults(
  query: string | null,
  context: BackendRequestContext,
): Promise<ReadonlyArray<ConsumableSearchResult>> {
  const search = query === null ? "" : `?${new URLSearchParams({ query })}`;
  const dtos = await getCalorieTrackerJson(
    `/calorie-tracker/search${search}`,
    unifiedSearchResultSchema.array(),
    context,
  );
  return dtos.map(mapConsumableSearchResult);
}

/** Fetch valid quantity input units for one selected concrete product. */
export async function getAvailableInputUnits(
  productId: string,
  context: BackendRequestContext,
): Promise<ReadonlyArray<AvailableInputUnit>> {
  const dtos = await getCalorieTrackerJson(
    `/calorie-tracker/products/${encodeURIComponent(productId)}/input-units`,
    availableInputUnitsSchema,
    context,
  );
  return dtos.map(mapAvailableInputUnit);
}

/** Create one client-idempotent consumption log. */
export async function createConsumptionLog(
  input: CreateConsumptionLog,
  context: BackendRequestContext,
): Promise<ConsumptionLog> {
  const dto = await requestCalorieTrackerJson(
    "/calorie-tracker/logs",
    "POST",
    input,
    consumptionLogSchema,
    context,
  );
  return mapConsumptionLog(dto);
}

/** Fetch one private consumption-log detail. */
export async function getConsumptionLog(
  logId: string,
  context: BackendRequestContext,
): Promise<ConsumptionLog> {
  const dto = await getCalorieTrackerJson(
    `/calorie-tracker/logs/${encodeURIComponent(logId)}`,
    consumptionLogSchema,
    context,
  );
  return mapConsumptionLog(dto);
}

/** Update a consumption log with optimistic concurrency. */
export async function updateConsumptionLog(
  logId: string,
  input: UpdateConsumptionLog,
  context: BackendRequestContext,
): Promise<ConsumptionLog> {
  const dto = await requestCalorieTrackerJson(
    `/calorie-tracker/logs/${encodeURIComponent(logId)}`,
    "PUT",
    input,
    consumptionLogSchema,
    context,
  );
  return mapConsumptionLog(dto);
}

/** Soft-delete one consumption log. */
export async function deleteConsumptionLog(
  logId: string,
  context: BackendRequestContext,
): Promise<DeleteLogResult> {
  const dto = await requestCalorieTrackerJson(
    `/calorie-tracker/logs/${encodeURIComponent(logId)}`,
    "DELETE",
    undefined,
    deleteLogResultSchema,
    context,
  );
  return mapDeleteLogResult(dto);
}

/** Restore a recently soft-deleted consumption log. */
export async function restoreConsumptionLog(
  logId: string,
  context: BackendRequestContext,
): Promise<ConsumptionLog> {
  const dto = await requestCalorieTrackerJson(
    `/calorie-tracker/logs/${encodeURIComponent(logId)}/restore`,
    "POST",
    undefined,
    consumptionLogSchema,
    context,
  );
  return mapConsumptionLog(dto);
}
