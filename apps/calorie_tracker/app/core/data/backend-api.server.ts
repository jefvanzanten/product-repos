const apiBaseUrl = process.env.API_URL ?? "http://localhost:3000";
const apiUrl = apiBaseUrl.replace(/\/$/, "");

type BackendMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Request metadata needed by the backend data adapter. */
export type BackendRequestContext = {
  readonly cookie: string | null;
  readonly timezone: string;
  readonly signal: AbortSignal;
};

type BackendRequestOptions = {
  readonly method?: BackendMethod;
  readonly body?: unknown;
};

/**
 * Send an authenticated, timezone-aware request to the backend.
 *
 * @param path - Absolute backend API path.
 * @param context - Transport metadata extracted at the presentation boundary.
 * @param options - HTTP method and optional JSON body.
 * @returns The raw backend response for endpoint-specific parsing.
 */
export async function sendBackendRequest(
  path: string,
  context: BackendRequestContext,
  options: BackendRequestOptions = {},
): Promise<Response> {
  const headers = new Headers({ "X-Browser-Timezone": context.timezone });
  if (context.cookie !== null) headers.set("cookie", context.cookie);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");

  return fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: context.signal,
  });
}
