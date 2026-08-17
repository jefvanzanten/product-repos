const apiBaseUrl = process.env.API_URL ?? "http://localhost:3000";
const apiUrl = apiBaseUrl.replace(/\/$/, "");

type BackendMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type BackendRequestOptions = {
  readonly method?: BackendMethod;
  readonly body?: unknown;
};

/** Request metadata needed by backend data adapters. */
type BackendRequestContext = {
  readonly cookie: string | null;
  readonly signal: AbortSignal;
};

/**
 * Send an authenticated request to the backend API.
 *
 * @param path - Absolute backend API path.
 * @param context - Framework-neutral session and cancellation metadata.
 * @param options - HTTP method and optional JSON or multipart body.
 * @returns Raw backend response for feature-specific success and error parsing.
 */
async function sendBackendRequest(
  path: string,
  context: BackendRequestContext,
  options: BackendRequestOptions = {},
): Promise<Response> {
  const headers = new Headers();
  if (context.cookie !== null) headers.set("cookie", context.cookie);

  const isFormData = options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined
      ? undefined
      : isFormData
        ? options.body
        : JSON.stringify(options.body),
    signal: context.signal,
  });
}

export type { BackendMethod, BackendRequestContext };
export { sendBackendRequest };
