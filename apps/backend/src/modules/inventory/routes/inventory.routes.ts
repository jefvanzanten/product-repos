import { z } from "zod/v4";
import { Hono, type Context, type Next } from "hono";
import { reportAuthenticationStoreUnavailable, type SessionResolver } from "../../auth/services/session-resolution.service.ts";
import type { InventoryQueryService } from "../services/inventory-query.service.ts";

const inventoryListQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(30),
  cursor: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).default(0),
}).strict();

type InventoryVariables = {
  inventoryUserId: string;
};

export type InventoryEnvironment = {
  Variables: InventoryVariables;
};

/**
 * Require a Better Auth session and expose only its user identifier to handlers.
 *
 * @param sessionResolver - Authentication capability used to resolve the request session.
 * @param context - Current Inventory request context.
 * @param next - Continuation for the protected route.
 * @returns An authentication failure response or nothing after continuing.
 */
async function requireInventorySession(
  sessionResolver: SessionResolver,
  context: Context<InventoryEnvironment>,
  next: Next,
): Promise<Response | void> {
  const session = await sessionResolver.resolveSession(context.req.raw.headers);
  if (session._tag === "Unavailable") {
    const correlationId = reportAuthenticationStoreUnavailable(session.error, "inventory");
    return context.json(
      {
        code: "AUTH_UNAVAILABLE",
        message: "Authentication is temporarily unavailable",
        fields: { correlationId },
      },
      503,
    );
  }
  if (session._tag === "Unauthenticated") {
    return context.json({ code: "UNAUTHENTICATED", message: "Authentication is required" }, 401);
  }
  context.set("inventoryUserId", session.principal.userId);
  await next();
}

/**
 * Create the authenticated Inventory HTTP route adapter.
 *
 * @param dependencies - Inventory queries and session resolution dependencies.
 * @returns The mounted Inventory Hono router.
 */
export function inventoryRoutes(dependencies: {
  readonly inventoryQueries: InventoryQueryService;
  readonly sessionResolver: SessionResolver;
}): Hono<InventoryEnvironment> {
  const router = new Hono<InventoryEnvironment>();
  // Scope the session guard to inventory paths so unrelated routes keep their own behavior.
  router.use("/inventory-items", (context, next) => requireInventorySession(dependencies.sessionResolver, context, next));
  router.use("/inventory-items/*", (context, next) => requireInventorySession(dependencies.sessionResolver, context, next));

  router.get("/inventory-items", (context) => {
    const url = new URL(context.req.url);
    const parsed = inventoryListQuerySchema.safeParse({
      query: url.searchParams.has("query") ? url.searchParams.get("query") ?? "" : undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    if (!parsed.success) return validationResponse(context);
    if (parsed.data.query !== undefined && parsed.data.query.length < 2) {
      return validationResponse(context, "Search query needs at least 2 characters");
    }
    const page = dependencies.inventoryQueries.listInventory({
      query: parsed.data.query ?? null,
      limit: parsed.data.limit,
      offset: parsed.data.cursor,
    });
    return context.json(page);
  });

  return router;
}

/**
 * Render a standard strict validation error response.
 *
 * @param context - Current Inventory request context.
 * @param message - Safe validation message returned to the client.
 * @returns A strict HTTP 400 response.
 */
function validationResponse(context: Context<InventoryEnvironment>, message = "Request is invalid"): Response {
  return context.json({ code: "VALIDATION_ERROR", message }, 400);
}
