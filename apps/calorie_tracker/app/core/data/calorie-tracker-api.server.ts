import {
  calorieTrackerErrorResponseSchema,
  type CalorieTrackerErrorResponse,
} from "@product-repos/contracts/calorie-tracker";
import { sendBackendRequest, type BackendRequestContext } from "./backend-api.server";

type ProtocolSchema<T> = {
  readonly parse: (input: unknown) => T;
};

/** A classified Calorie Tracker backend failure safe for route-level translation. */
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
 * Perform and parse one authenticated backend GET request.
 *
 * @param path - Backend endpoint path.
 * @param schema - Success response schema.
 * @param context - Backend request metadata.
 * @returns The parsed response.
 */
export async function getCalorieTrackerJson<T>(
  path: string,
  schema: ProtocolSchema<T>,
  context: BackendRequestContext,
): Promise<T> {
  return requestCalorieTrackerJson(path, "GET", undefined, schema, context);
}

/**
 * Perform one authenticated backend request and parse its success contract.
 *
 * @param path - Backend endpoint path.
 * @param method - HTTP method.
 * @param body - Optional request body.
 * @param schema - Success response schema.
 * @param context - Backend request metadata.
 * @returns The parsed response.
 */
export async function requestCalorieTrackerJson<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body: unknown,
  schema: ProtocolSchema<T>,
  context: BackendRequestContext,
): Promise<T> {
  const response = await sendBackendRequest(path, context, { method, body });
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
 * @param response - Backend response.
 * @returns Parsed JSON or null for an invalid response body.
 */
async function readUnknownJson(response: Response): Promise<unknown> {
  try {
    const value: unknown = await response.json();
    return value;
  } catch {
    return null;
  }
}
