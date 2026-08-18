import {
  calorieTrackerErrorResponseSchema,
  type CalorieTrackerErrorResponse,
  type CreateConsumptionLog,
  type UpdateConsumptionLog,
  type UpsertNutritionGoal,
} from "@product-repos/contracts/calorie-tracker";
import { readJson } from "@product-repos/shared/backend-response";
import type { ZodType } from "zod";
import { sendBackendRequest, type BackendRequestContext } from "./backend-api.server";

type CalorieTrackerRequestBody = CreateConsumptionLog | UpdateConsumptionLog | UpsertNutritionGoal | undefined;

/** A classified Calorie Tracker backend failure safe for route-level translation. */
export class CalorieTrackerApiError extends Error {
  readonly status: number;
  readonly response: CalorieTrackerErrorResponse | null;

  /** Create a classified backend API error. */
  constructor(status: number, response: CalorieTrackerErrorResponse | null) {
    super(response?.message ?? `Backend request failed with status ${status}`);
    this.name = "CalorieTrackerApiError";
    this.status = status;
    this.response = response;
  }
}

/** Perform and parse one authenticated backend GET request. */
export async function getCalorieTrackerJson<T>(path: string, schema: ZodType<T>, context: BackendRequestContext): Promise<T> {
  return requestCalorieTrackerJson(path, "GET", undefined, schema, context);
}

/** Perform one authenticated backend request and parse its success contract. */
export async function requestCalorieTrackerJson<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body: CalorieTrackerRequestBody,
  schema: ZodType<T>,
  context: BackendRequestContext,
): Promise<T> {
  const response = await sendBackendRequest(path, context, { method, body });
  if (!response.ok) {
    const parsed = calorieTrackerErrorResponseSchema.safeParse(await response.json().catch(() => null));
    throw new CalorieTrackerApiError(response.status, parsed.success ? parsed.data : null);
  }
  return readJson(response, schema);
}
