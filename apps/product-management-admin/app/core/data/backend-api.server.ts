import { sendBackendRequest as sendSharedBackendRequest, type BackendMethod } from "@product-repos/shared/backend-api";

const apiUrl = process.env.API_URL ?? "http://localhost:3000";

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
  return sendSharedBackendRequest(apiUrl, path, {
    method: options.method,
    headers: context.cookie === null ? undefined : { cookie: context.cookie },
    body: options.body,
    signal: context.signal,
  });
}

export type { BackendMethod, BackendRequestContext };
export { sendBackendRequest };
