import {
  availableInputUnitsSchema,
  calorieTrackerErrorResponseSchema,
  consumptionLogSchema,
  dailyStatisticsSchema,
  deleteLogResultSchema,
  logListSchema,
  nutritionGoalSchema,
  packageSearchResultsSchema,
  type AvailableInputUnit,
  type CalorieTrackerErrorResponse,
  type ConsumptionLog,
  type ConsumptionTypeFilter,
  type CreateConsumptionLog,
  type DailyStatistics,
  type DeleteLogResult,
  type LogList,
  type NutritionGoal,
  type PackageSearchResult,
  type UpdateConsumptionLog,
  type UpsertNutritionGoal,
} from "@product-repos/contracts/calorie-tracker";
import { redirectToSessionLogin } from "@product-repos/auth-client/session-monitor";
import { CALORY_TRACKER_BASE_PATH } from "../../auth/public-paths";
import { loginPath, toCalorieTrackerPublicPath } from "../../routing/calorie-tracker-routes";

/** Parsed success or classified API failure. */
export type ApiOutcome<T> =
  | { readonly _tag: "Success"; readonly value: T }
  | { readonly _tag: "Failure"; readonly error: CalorieTrackerApiFailure };

/** Failures owned and classified by the browser HTTP adapter. */
export type CalorieTrackerApiFailure =
  | { readonly _tag: "Aborted" }
  | { readonly _tag: "SessionExpired" }
  | { readonly _tag: "NetworkFailure"; readonly cause: unknown }
  | { readonly _tag: "HttpFailure"; readonly status: number; readonly response: CalorieTrackerErrorResponse }
  | { readonly _tag: "InvalidResponse"; readonly issues: ReadonlyArray<string> };

type ProtocolSchema<T> = {
  readonly safeParse: (input: unknown) =>
    | { readonly success: true; readonly data: T }
    | { readonly success: false; readonly error: { readonly issues: ReadonlyArray<{ readonly message: string }> } };
};

type RequestContext = {
  readonly timezone: string;
  readonly signal?: AbortSignal;
};

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Fetch aggregate statistics for one local calendar date. */
export async function getDailyStatistics(date: string, context: RequestContext): Promise<ApiOutcome<DailyStatistics>> {
  return requestJson(`/calorie-tracker/statistics?${new URLSearchParams({ date })}`, { method: "GET" }, dailyStatisticsSchema, context);
}

/** Atomically replace all current nutrition goals. */
export async function putNutritionGoals(input: UpsertNutritionGoal, context: RequestContext): Promise<ApiOutcome<NutritionGoal>> {
  return requestJson("/calorie-tracker/goals", createJsonRequest("PUT", input), nutritionGoalSchema, context);
}

/** Fetch a date- and filter-scoped consumption-log list. */
export async function getConsumptionLogs(date: string, type: ConsumptionTypeFilter, context: RequestContext): Promise<ApiOutcome<LogList>> {
  const search = new URLSearchParams({ date, type });
  return requestJson(`/calorie-tracker/logs?${search}`, { method: "GET" }, logListSchema, context);
}

/** Fetch recent packages or search active catalog packages. */
export async function getLoggablePackages(query: string | null, context: RequestContext): Promise<ApiOutcome<ReadonlyArray<PackageSearchResult>>> {
  const search = query === null ? "" : `?${new URLSearchParams({ query })}`;
  return requestJson(`/calorie-tracker/packages/search${search}`, { method: "GET" }, packageSearchResultsSchema, context);
}

/** Fetch valid quantity input units for one selected package. */
export async function getAvailableInputUnits(packageId: number, context: RequestContext): Promise<ApiOutcome<ReadonlyArray<AvailableInputUnit>>> {
  return requestJson(`/calorie-tracker/packages/${packageId}/input-units`, { method: "GET" }, availableInputUnitsSchema, context);
}

/** Create one client-idempotent consumption log. */
export async function createConsumptionLog(input: CreateConsumptionLog, context: RequestContext): Promise<ApiOutcome<ConsumptionLog>> {
  return requestJson("/calorie-tracker/logs", createJsonRequest("POST", input), consumptionLogSchema, context);
}

/** Fetch one private consumption-log detail. */
export async function getConsumptionLog(logId: string, context: RequestContext): Promise<ApiOutcome<ConsumptionLog>> {
  return requestJson(`/calorie-tracker/logs/${encodeURIComponent(logId)}`, { method: "GET" }, consumptionLogSchema, context);
}

/** Update a consumption log with optimistic concurrency. */
export async function updateConsumptionLog(logId: string, input: UpdateConsumptionLog, context: RequestContext): Promise<ApiOutcome<ConsumptionLog>> {
  return requestJson(`/calorie-tracker/logs/${encodeURIComponent(logId)}`, createJsonRequest("PUT", input), consumptionLogSchema, context);
}

/** Soft-delete one consumption log. */
export async function deleteConsumptionLog(logId: string, context: RequestContext): Promise<ApiOutcome<DeleteLogResult>> {
  return requestJson(`/calorie-tracker/logs/${encodeURIComponent(logId)}`, { method: "DELETE" }, deleteLogResultSchema, context);
}

/** Restore a recently soft-deleted consumption log. */
export async function restoreConsumptionLog(logId: string, context: RequestContext): Promise<ApiOutcome<ConsumptionLog>> {
  return requestJson(`/calorie-tracker/logs/${encodeURIComponent(logId)}/restore`, { method: "POST" }, consumptionLogSchema, context);
}

/** Build a JSON mutation request without introducing protocol-specific behavior in callers. */
function createJsonRequest(method: "POST" | "PUT" | "PATCH", body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** Perform one authenticated, timezone-aware request and parse its response contract. */
async function requestJson<T>(
  path: string,
  init: RequestInit,
  schema: ProtocolSchema<T>,
  context: RequestContext,
): Promise<ApiOutcome<T>> {
  const headers = new Headers(init.headers);
  headers.set("X-Browser-Timezone", context.timezone);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: context.signal,
    });
  } catch (cause: unknown) {
    if (context.signal?.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
      return { _tag: "Failure", error: { _tag: "Aborted" } };
    }
    return { _tag: "Failure", error: { _tag: "NetworkFailure", cause } };
  }

  const raw: unknown = await readUnknownJson(response);
  if (!response.ok) {
    const failure = classifyHttpErrorResponse(response.status, raw);
    if (failure.error._tag === "SessionExpired") {
      redirectToSessionLogin({
        appBasePath: CALORY_TRACKER_BASE_PATH,
        loginPath: toCalorieTrackerPublicPath(loginPath()),
      });
    }
    return failure;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      _tag: "Failure",
      error: { _tag: "InvalidResponse", issues: parsed.error.issues.map((issue) => issue.message) },
    };
  }
  return { _tag: "Success", value: parsed.data };
}

/** Classify a non-success response without disguising malformed protocol data as validation. */
export function classifyHttpErrorResponse(
  status: number,
  raw: unknown,
): { readonly _tag: "Failure"; readonly error: CalorieTrackerApiFailure } {
  const parsedError = calorieTrackerErrorResponseSchema.safeParse(raw);
  if (!parsedError.success) {
    return {
      _tag: "Failure",
      error: { _tag: "InvalidResponse", issues: parsedError.error.issues.map((issue) => issue.message) },
    };
  }
  if (status === 401 && parsedError.data.code === "UNAUTHENTICATED") {
    return { _tag: "Failure", error: { _tag: "SessionExpired" } };
  }
  return { _tag: "Failure", error: { _tag: "HttpFailure", status, response: parsedError.data } };
}

/** Read a response body as unknown so no unparsed transport shape crosses the adapter. */
async function readUnknownJson(response: Response): Promise<unknown> {
  try {
    const value: unknown = await response.json();
    return value;
  } catch {
    return null;
  }
}
