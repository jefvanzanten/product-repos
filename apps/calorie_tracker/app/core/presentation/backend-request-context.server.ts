import type { BackendRequestContext } from "../data/backend-api.server";

/**
 * Extract backend transport metadata from an incoming route request.
 *
 * @param request - Incoming React Router request.
 * @param timezone - Resolved browser timezone.
 * @returns Data-layer request metadata.
 */
export function createBackendRequestContext(request: Request, timezone: string): BackendRequestContext {
  return {
    cookie: request.headers.get("cookie"),
    timezone,
    signal: request.signal,
  };
}
