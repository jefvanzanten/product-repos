import { sendBackendRequest as sendSharedBackendRequest, type BackendMethod } from "@product-repos/shared/backend-api";

const apiUrl = process.env.API_URL ?? "http://localhost:3000";

/** Request metadata needed by backend data adapters. */
export type BackendRequestContext = {
  readonly cookie: string | null;
  readonly signal: AbortSignal;
};

type BackendRequestOptions = {
  readonly method?: BackendMethod;
  readonly body?: unknown;
};

/**
 * Send an authenticated request to the backend.
 *
 * @param path - Absolute backend API path.
 * @param context - Transport metadata extracted at the route boundary.
 * @param options - HTTP method and optional JSON body.
 * @returns The raw backend response for endpoint-specific parsing.
 */
export async function sendBackendRequest(
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
