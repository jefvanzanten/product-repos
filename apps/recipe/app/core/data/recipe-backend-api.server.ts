import { readJson } from "@product-repos/shared/backend-response";
import { z, type ZodType } from "zod";
import { sendBackendRequest, type BackendRequestContext } from "./backend-api.server";

const recipeApiErrorSchema = z.object({
  code: z.string().catch("INTERNAL_ERROR"),
  message: z.string().catch("Er ging iets mis."),
  fields: z.record(z.string(), z.string()).optional(),
});

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
 * @param body - Optional contract-derived request body.
 * @param schema - Success response schema.
 * @param context - Backend request metadata.
 * @returns The validated response body.
 */
export async function requestRecipeJson<T, Body>(
  path: string,
  method: "GET" | "POST" | "PUT",
  body: Body,
  schema: ZodType<T>,
  context: BackendRequestContext,
): Promise<T> {
  const response = await sendBackendRequest(path, context, { method, body });
  if (!response.ok) {
    const error = await readRecipeApiError(response);
    throw new RecipeApiError(response.status, error.code, error.message, error.fields);
  }
  return readJson(response, schema);
}

/**
 * Parse the standard backend error projection with stable fallbacks.
 *
 * @param response - Unsuccessful backend response.
 * @returns A normalized Recipe API error body.
 */
async function readRecipeApiError(response: Response): Promise<z.infer<typeof recipeApiErrorSchema>> {
  try {
    return await readJson(response, recipeApiErrorSchema);
  } catch {
    return { code: "INTERNAL_ERROR", message: "Er ging iets mis." };
  }
}
