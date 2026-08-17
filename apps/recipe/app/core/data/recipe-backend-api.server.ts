import { readUnknownJson } from "@product-repos/shared/backend-response";
import { sendBackendRequest, type BackendRequestContext } from "./backend-api.server";

type ProtocolSchema<T> = {
  readonly parse: (input: unknown) => T;
};

type RecipeApiErrorBody = {
  readonly code: string;
  readonly message: string;
  readonly fields?: Readonly<Record<string, string>>;
};

/** A classified Recipe backend failure safe for route-level translation. */
export class RecipeApiError extends Error {
  /**
   * Create one typed API failure.
   *
   * @param status - Backend HTTP status.
   * @param code - Stable backend error code.
   * @param message - User-facing backend message.
   * @param fields - Optional field-level validation messages.
   */
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = "RecipeApiError";
  }
}

/**
 * Perform and validate one Recipe backend request.
 *
 * @param path - Backend endpoint path.
 * @param method - HTTP method.
 * @param body - Optional request body.
 * @param schema - Success response schema.
 * @param context - Backend request metadata.
 * @returns The validated response body.
 */
export async function requestRecipeJson<T>(
  path: string,
  method: "GET" | "POST" | "PUT",
  body: unknown,
  schema: ProtocolSchema<T>,
  context: BackendRequestContext,
): Promise<T> {
  const response = await sendBackendRequest(path, context, { method, body });
  const value = await readUnknownJson(response);
  if (!response.ok) {
    const error = readError(value);
    throw new RecipeApiError(response.status, error.code, error.message, error.fields);
  }
  return schema.parse(value);
}

/**
 * Safely parse the standard backend error projection.
 *
 * @param value - Untrusted backend response body.
 * @returns A normalized Recipe API error body.
 */
function readError(value: unknown): RecipeApiErrorBody {
  if (typeof value !== "object" || value === null) {
    return { code: "INTERNAL_ERROR", message: "Er ging iets mis." };
  }
  const record = value as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : "INTERNAL_ERROR",
    message: typeof record.message === "string" ? record.message : "Er ging iets mis.",
    fields: readFields(record.fields),
  };
}

/**
 * Validate field-error values without trusting the backend object shape.
 *
 * @param value - Potential field-error map.
 * @returns The validated field map when every entry is textual.
 */
function readFields(value: unknown): Readonly<Record<string, string>> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const entries = Object.entries(value);
  if (!entries.every((entry) => typeof entry[1] === "string")) return undefined;
  return Object.fromEntries(entries) as Readonly<Record<string, string>>;
}
