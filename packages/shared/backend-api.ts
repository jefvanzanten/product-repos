/** HTTP methods supported by the shared backend transport. */
export type BackendMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Framework-neutral options for one backend request. */
export type BackendRequestOptions = {
  readonly method?: BackendMethod;
  readonly body?: unknown;
  readonly headers?: HeadersInit;
  readonly credentials?: RequestCredentials;
  readonly signal?: AbortSignal;
};

/**
 * Send a request to a backend API, encoding non-multipart bodies as JSON.
 *
 * @param apiBaseUrl - Backend API origin without an endpoint path.
 * @param path - Absolute backend endpoint path.
 * @param options - Method, headers, body, credentials and cancellation signal.
 * @returns The raw backend response.
 */
export function sendBackendRequest(
  apiBaseUrl: string,
  path: string,
  options: BackendRequestOptions = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) headers.set("Content-Type", "application/json");

  return fetch(`${apiBaseUrl.replace(/\/$/, "")}${path}`, {
    method: options.method ?? "GET",
    credentials: options.credentials,
    headers,
    body: options.body === undefined
      ? undefined
      : isFormData
        ? options.body
        : JSON.stringify(options.body),
    signal: options.signal,
  });
}
