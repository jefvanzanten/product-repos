import { sendBackendRequest as sendSharedBackendRequest, type BackendMethod } from "@product-repos/shared/backend-api";

const apiUrl = process.env.API_URL ?? "http://localhost:3000";

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
  return sendSharedBackendRequest(apiUrl, path, {
    method: options.method,
    headers: {
      "X-Browser-Timezone": context.timezone,
      ...(context.cookie === null ? {} : { cookie: context.cookie }),
    },
    body: options.body,
    signal: context.signal,
  });
}
