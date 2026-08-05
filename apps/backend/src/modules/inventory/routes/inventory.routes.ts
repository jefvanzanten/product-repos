import {
  addInventoryItemRequestSchema,
  inventoryErrorResponseSchema,
  inventoryItemRowSchema,
  inventoryPackageSearchResultSchema,
  type InventoryErrorCode,
} from "@product-repos/contracts/inventory";
import { z } from "zod/v4";
import { Hono, type Context, type Next } from "hono";
import { hasAdminRole } from "../../auth/services/role.service.ts";
import { reportAuthenticationStoreUnavailable, type SessionResolver } from "../../auth/services/session-resolution.service.ts";
import type { AddInventoryError, InventoryMutationService } from "../services/inventory-mutation.service.ts";
import type { InventoryQueryService } from "../services/inventory-query.service.ts";

const inventoryListQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(30),
  cursor: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).default(0),
}).strict();

const packageSearchQuerySchema = z.object({
  query: z.string().trim().min(2).max(200),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
}).strict();

type InventoryVariables = {
  inventoryUserId: string;
  inventoryIsAdmin: boolean;
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
  context.set("inventoryIsAdmin", hasAdminRole(session.principal.role));
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
  readonly inventoryMutations: InventoryMutationService;
  readonly sessionResolver: SessionResolver;
}): Hono<InventoryEnvironment> {
  const router = new Hono<InventoryEnvironment>();
  // Scope the session guard to inventory paths so unrelated routes keep their own behavior.
  router.use("/inventory-items", (context, next) => requireInventorySession(dependencies.sessionResolver, context, next));
  router.use("/inventory-items/*", (context, next) => requireInventorySession(dependencies.sessionResolver, context, next));

  router.get("/inventory-items/packages/search", (context) => {
    const url = new URL(context.req.url);
    const parsed = packageSearchQuerySchema.safeParse({
      query: url.searchParams.get("query") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return validationResponse(context);
    return context.json(inventoryPackageSearchResultSchema.array().parse(
      dependencies.inventoryQueries.searchPackages(parsed.data.query, parsed.data.limit),
    ));
  });

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

  router.post("/inventory-items", async (context) => {
    if (!context.get("inventoryIsAdmin")) return errorResponse(context, "ADMIN_ROLE_REQUIRED");
    const parsed = addInventoryItemRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return validationResponse(context);
    const result = dependencies.inventoryMutations.addInventory(context.get("inventoryUserId"), parsed.data);
    if (!result.ok) return mutationErrorResponse(context, result.error);
    return context.json(inventoryItemRowSchema.parse(result.value), 201);
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
  return errorResponse(context, "VALIDATION_ERROR", message);
}

/**
 * Translate one expected Inventory mutation failure into its HTTP response.
 *
 * @param context - Current Inventory request context.
 * @param error - Expected service failure code.
 * @returns A strict Inventory error response.
 */
function mutationErrorResponse(context: Context<InventoryEnvironment>, error: AddInventoryError): Response {
  return errorResponse(context, error);
}

/**
 * Render one stable Inventory error code with its documented status.
 *
 * @param context - Current Inventory request context.
 * @param code - Stable Inventory API error code.
 * @param message - Optional validation detail.
 * @returns A strict error response.
 */
function errorResponse(
  context: Context<InventoryEnvironment>,
  code: InventoryErrorCode,
  message: string = inventoryErrorDetails[code].message,
): Response {
  const details = inventoryErrorDetails[code];
  return context.json(inventoryErrorResponseSchema.parse({ code, message }), details.status as 400);
}

const inventoryErrorDetails: Readonly<Record<InventoryErrorCode, { readonly status: number; readonly message: string }>> = {
  VALIDATION_ERROR: { status: 400, message: "Request is invalid" },
  REFERENCE_NOT_FOUND: { status: 400, message: "A referenced value is invalid" },
  ADMIN_ROLE_REQUIRED: { status: 403, message: "Administrator access is required" },
  INVENTORY_ITEM_NOT_FOUND: { status: 404, message: "Inventory item was not found" },
  LOCATION_NOT_FOUND: { status: 404, message: "Location was not found" },
  PRODUCT_PACKAGE_NOT_FOUND: { status: 404, message: "Product package was not found" },
  INVENTORY_ITEM_VERSION_CONFLICT: { status: 409, message: "Inventory item has changed" },
  PRODUCT_PACKAGE_ARCHIVED: { status: 409, message: "Product package is archived" },
  LOCATION_ARCHIVED: { status: 409, message: "Location is archived" },
  UNAUTHENTICATED: { status: 401, message: "Authentication is required" },
  AUTH_UNAVAILABLE: { status: 503, message: "Authentication is temporarily unavailable" },
  INTERNAL_ERROR: { status: 500, message: "Internal server error" },
};
