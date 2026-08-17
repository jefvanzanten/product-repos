import type { MiddlewareHandler } from "hono";
import type { SessionResolver } from "../services/session-resolution.service.ts";
import { reportAuthenticationStoreUnavailable } from "../services/session-resolution.service.ts";
import { hasAdminRole } from "../domain/role.ts";

/** Create catalog authorization mounted only on the catalog router. */
export function createCatalogAuthorization(sessionResolver: SessionResolver): MiddlewareHandler {
  /** Require a session for catalog reads and an administrator for mutations. */
  async function requireCatalogAccess(context: Parameters<MiddlewareHandler>[0], next: Parameters<MiddlewareHandler>[1]): Promise<Response | void> {
    const session = await sessionResolver.resolveSession(context.req.raw.headers);
    if (session._tag === "Unavailable") {
      const correlationId = reportAuthenticationStoreUnavailable(session.error, "catalog");
      return context.json({ code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable", fields: { correlationId } }, 503);
    }
    if (session._tag === "Unauthenticated") {
      return context.json({ code: "UNAUTHENTICATED", message: "Authentication is required" }, 401);
    }
    const isReadRequest = context.req.method === "GET" || context.req.method === "HEAD";
    if (!isReadRequest && !hasAdminRole(session.principal.role)) {
      return context.json({ code: "FORBIDDEN", message: "Administrator access is required" }, 403);
    }
    await next();
  }

  return requireCatalogAccess;
}
