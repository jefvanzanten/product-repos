import { sendBackendRequest } from "./backend-api";

/** Failures produced before an HTTP response is available. */
export type BackendTransportFailure =
  | { readonly tag: "Aborted" }
  | { readonly tag: "NetworkFailure"; readonly cause: unknown };

/** Raw backend response or classified transport failure. */
export type BackendResponse =
  | { readonly tag: "Success"; readonly response: Response }
  | { readonly tag: "Failure"; readonly error: BackendTransportFailure };

/** Options supported by the browser backend adapter. */
export type BackendRequest = {
  readonly method: "GET" | "POST" | "PUT" | "DELETE";
  readonly body?: unknown;
  readonly signal?: AbortSignal;
};

/**
 * Perform one credentialed and timezone-aware browser request.
 *
 * @param apiBaseUrl - Backend API origin without an endpoint path.
 * @param path - Absolute backend endpoint path.
 * @param request - Request method, body and cancellation signal.
 * @returns The raw HTTP response or a transport failure.
 */
export async function sendBrowserBackendRequest(
  apiBaseUrl: string,
  path: string,
  request: BackendRequest,
): Promise<BackendResponse> {
  try {
    const response = await sendBackendRequest(apiBaseUrl, path, {
      method: request.method,
      credentials: "include",
      headers: { "X-Browser-Timezone": resolveBrowserTimezone() },
      body: request.body,
      signal: request.signal,
    });
    return { tag: "Success", response };
  } catch (cause: unknown) {
    if (request.signal?.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
      return { tag: "Failure", error: { tag: "Aborted" } };
    }
    return { tag: "Failure", error: { tag: "NetworkFailure", cause } };
  }
}

/**
 * Resolve the browser IANA timezone with an SSR-safe fallback.
 *
 * @returns The resolved browser timezone or UTC.
 */
function resolveBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
