import type { ZodType } from "zod";

/**
 * Read and validate an untrusted JSON response at the HTTP boundary.
 *
 * @param response - Backend response.
 * @param schema - Contract that owns the response shape.
 * @returns The validated response value.
 */
export async function readJson<Output>(response: Response, schema: ZodType<Output>): Promise<Output> {
  const value = await response.json();
  return schema.parse(value);
}
