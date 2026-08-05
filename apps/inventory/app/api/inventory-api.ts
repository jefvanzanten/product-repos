import { redirectToSessionLogin } from "@product-repos/auth-client/session-monitor";
import {
  inventoryErrorResponseSchema,
  inventoryPageSchema,
  type InventoryErrorResponse,
  type InventoryPage,
} from "@product-repos/contracts/inventory";
import { INVENTORY_BASE_PATH, toInventoryPublicPath } from "../public-paths";

/** Parsed success or classified Inventory API failure. */
export type InventoryApiOutcome<T> =
  | { readonly _tag: "Success"; readonly value: T }
  | { readonly _tag: "Failure"; readonly error: InventoryApiFailure };

/** Failures owned and classified by the browser HTTP adapter. */
export type InventoryApiFailure =
  | { readonly _tag: "Aborted" }
  | { readonly _tag: "SessionExpired" }
  | { readonly _tag: "NetworkFailure"; readonly cause: unknown }
  | { readonly _tag: "HttpFailure"; readonly status: number; readonly response: InventoryErrorResponse }
  | { readonly _tag: "InvalidResponse"; readonly issues: ReadonlyArray<string> };

/** Structural protocol parser used at the untrusted HTTP boundary. */
type ProtocolSchema<T> = {
  readonly safeParse: (input: unknown) =>
    | { readonly success: true; readonly data: T }
    | { readonly success: false; readonly error: { readonly issues: ReadonlyArray<{ readonly message: string }> } };
};

type InventoryListRequest = {
  readonly query: string | null;
  readonly cursor: string | null;
  readonly signal?: AbortSignal;
};

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Fetch one page of grouped, authenticated inventory data.
 *
 * @param request - Search, cursor, and cancellation values for the request.
 * @returns A parsed inventory page or a classified API failure.
 */
export async function getInventoryItems(request: InventoryListRequest): Promise<InventoryApiOutcome<InventoryPage>> {
  const search = new URLSearchParams({ limit: "30" });
  if (request.query !== null) search.set("query", request.query);
  if (request.cursor !== null) search.set("cursor", request.cursor);
  return requestJson(
    `/inventory-items?${search}`,
    inventoryPageSchema,
    request.signal,
  );
}

/**
 * Perform one credentialed request and parse its response contract.
 *
 * @param path - Backend path relative to the configured API origin.
 * @param schema - Runtime parser for the expected success payload.
 * @param signal - Optional request cancellation signal.
 * @returns Parsed response data or a classified API failure.
 */
async function requestJson<T>(
  path: string,
  schema: ProtocolSchema<T>,
  signal: AbortSignal | undefined,
): Promise<InventoryApiOutcome<T>> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: "GET",
      credentials: "include",
      headers: { "X-Browser-Timezone": resolveBrowserTimezone() },
      signal,
    });
  } catch (cause: unknown) {
    if (signal?.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
      return { _tag: "Failure", error: { _tag: "Aborted" } };
    }
    return { _tag: "Failure", error: { _tag: "NetworkFailure", cause } };
  }

  const raw = await readUnknownJson(response);
  if (!response.ok) {
    const failure = classifyHttpErrorResponse(response.status, raw);
    if (failure.error._tag === "SessionExpired") {
      redirectToSessionLogin({
        appBasePath: INVENTORY_BASE_PATH,
        loginPath: toInventoryPublicPath("/login"),
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

/**
 * Classify a non-success response without trusting its transport shape.
 *
 * @param status - HTTP response status.
 * @param raw - Untrusted response payload.
 * @returns A classified Inventory API failure.
 */
function classifyHttpErrorResponse(
  status: number,
  raw: unknown,
): { readonly _tag: "Failure"; readonly error: InventoryApiFailure } {
  const parsed = inventoryErrorResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      _tag: "Failure",
      error: { _tag: "InvalidResponse", issues: parsed.error.issues.map((issue) => issue.message) },
    };
  }
  if (status === 401 && parsed.data.code === "UNAUTHENTICATED") {
    return { _tag: "Failure", error: { _tag: "SessionExpired" } };
  }
  return { _tag: "Failure", error: { _tag: "HttpFailure", status, response: parsed.data } };
}

/**
 * Resolve the browser's IANA timezone without accessing the DOM during SSR.
 *
 * @returns The browser timezone or UTC when resolution is unavailable.
 */
function resolveBrowserTimezone(): string {
  return typeof Intl === "undefined" ? "UTC" : Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/**
 * Read JSON as unknown so unparsed response data cannot cross the adapter.
 *
 * @param response - Fetch response whose body should be decoded.
 * @returns The decoded unknown value or null for invalid JSON.
 */
async function readUnknownJson(response: Response): Promise<unknown> {
  try {
    const value: unknown = await response.json();
    return value;
  } catch {
    return null;
  }
}
