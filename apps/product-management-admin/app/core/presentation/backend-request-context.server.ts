import type { BackendRequestContext } from "../data/backend-api.server";

/**
 * Convert an incoming route request into framework-neutral backend metadata.
 *
 * @param request - Incoming React Router request.
 * @returns Context accepted by backend data adapters.
 */
export function createBackendRequestContext(request: Request): BackendRequestContext {
  return { cookie: request.headers.get("cookie"), signal: request.signal };
}
