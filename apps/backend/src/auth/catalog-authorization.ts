import type { MiddlewareHandler } from "hono";
import { auth } from "./auth.ts";

const protectedCatalogRoots = [
  "/brands",
  "/categories",
  "/package-types",
  "/products",
  "/unit-types",
] as const;

/** Determine whether the current API path belongs to the admin catalog surface. */
function isProtectedCatalogPath(path: string): boolean {
  return protectedCatalogRoots.some(
    (root) => path === root || path.startsWith(`${root}/`),
  );
}

/** Determine whether a Better Auth role list contains the administrator role. */
function hasAdminRole(role: string | null | undefined): boolean {
  return role?.split(",").some((entry) => entry.trim() === "admin") ?? false;
}

/** Require a session for catalog reads and an administrator for catalog mutations. */
export const requireCatalogAccess: MiddlewareHandler = async (context, next) => {
  const path = new URL(context.req.url).pathname;
  if (!isProtectedCatalogPath(path)) {
    await next();
    return;
  }

  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    session = await auth.api.getSession({ headers: context.req.raw.headers });
  } catch (cause) {
    console.error("Authentication store unavailable", {
      operation: "getSession",
      cause,
    });
    return context.json(
      { code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable" },
      503,
    );
  }

  if (!session) {
    return context.json(
      { code: "UNAUTHENTICATED", message: "Authentication is required" },
      401,
    );
  }

  const isReadRequest = context.req.method === "GET" || context.req.method === "HEAD";
  if (!isReadRequest && !hasAdminRole(session.user.role)) {
    return context.json(
      { code: "FORBIDDEN", message: "Administrator access is required" },
      403,
    );
  }

  await next();
  return;
};
