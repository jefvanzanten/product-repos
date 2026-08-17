import type { BackendRequestContext } from "../data/backend-api.server";

/**
 * Extract backend transport metadata from an incoming route request.
 *
 * @param request - Incoming React Router request.
 * @returns Data-layer request metadata.
 */
export function createBackendRequestContext(request: Request): BackendRequestContext {
  return {
    cookie: request.headers.get("cookie"),
    signal: request.signal,
  };
}
