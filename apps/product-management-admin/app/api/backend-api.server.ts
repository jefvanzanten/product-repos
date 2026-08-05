const apiBaseUrl = process.env.API_URL ?? "http://localhost:3000";
const apiUrl = apiBaseUrl.replace(/\/$/, "");

type BackendMethod = "GET" | "POST" | "PATCH" | "DELETE";

type BackendRequestOptions = {
  readonly method?: BackendMethod;
  readonly body?: unknown | FormData;
};

/**
 * Send an authenticated request to the backend API.
 *
 * @param path - Absolute backend API path.
 * @param request - Incoming request carrying the session and abort signal.
 * @param options - HTTP method and optional JSON or multipart body.
 * @returns Raw backend response for feature-specific success and error parsing.
 */
async function sendBackendRequest(
  path: string,
  request: Request,
  options: BackendRequestOptions = {},
): Promise<Response> {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie !== null) headers.set("cookie", cookie);

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
    signal: request.signal,
  });
}

export type { BackendMethod };
export { sendBackendRequest };
