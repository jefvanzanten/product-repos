const apiBaseUrl = process.env.API_URL ?? "http://localhost:3000";
const apiUrl = apiBaseUrl.replace(/\/$/, "");

type BackendMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type BackendRequestOptions = {
  readonly method?: BackendMethod;
  readonly body?: unknown;
  readonly timezone: string;
};

/**
 * Send an authenticated, timezone-aware request to the backend.
 *
 * @param path - Absolute backend API path.
 * @param request - Incoming request carrying the session and abort signal.
 * @param options - HTTP method, timezone, and optional JSON body.
 * @returns The raw backend response for endpoint-specific parsing.
 */
export async function sendBackendRequest(
  path: string,
  request: Request,
  options: BackendRequestOptions,
): Promise<Response> {
  const headers = new Headers({ "X-Browser-Timezone": options.timezone });
  const cookie = request.headers.get("cookie");
  if (cookie !== null) headers.set("cookie", cookie);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");

  return fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: request.signal,
  });
}
