import { addPhysicalInventoryItemsRequestSchema, inventoryErrorResponseSchema, inventoryProductSearchResultSchema, physicalInventoryItemDetailSchema, physicalInventoryItemSchema, physicalInventoryPageSchema, productStockThresholdSchema, removePhysicalInventoryItemSchema, updatePhysicalInventoryContentSchema, updatePhysicalInventoryExpirySchema, updatePhysicalInventoryLocationSchema, updateProductStockThresholdSchema, type InventoryErrorCode, type PhysicalInventoryItemDetail } from "@product-repos/contracts/inventory";
import { Hono, type Context, type Next } from "hono";
import { z } from "zod/v4";
import { hasAdminRole } from "../../auth/domain/role.ts";
import { reportAuthenticationStoreUnavailable, type SessionResolver } from "../../auth/services/session-resolution.service.ts";
import type { InventoryMutationError, InventoryMutationService } from "../services/inventory-mutation.service.ts";
import type { InventoryQueryService } from "../services/inventory-query.service.ts";

const listQuerySchema = z.object({ query: z.string().trim().max(200).optional(), filter: z.enum(["all", "low-stock", "expiring"]).default("all"), limit: z.coerce.number().int().min(1).max(100).default(30), cursor: z.coerce.number().int().min(0).default(0) }).strict();
const searchQuerySchema = z.object({ query: z.string().trim().min(2).max(200), limit: z.coerce.number().int().min(1).max(100).default(20) }).strict();

type InventoryVariables = { inventoryUserId: string; inventoryIsAdmin: boolean };
export type InventoryEnvironment = { Variables: InventoryVariables };

/** Require an authenticated inventory session. */
async function requireInventorySession(sessionResolver: SessionResolver, context: Context<InventoryEnvironment>, next: Next): Promise<Response | void> {
  const session = await sessionResolver.resolveSession(context.req.raw.headers);
  if (session.tag === "Unavailable") {
    const correlationId = reportAuthenticationStoreUnavailable(session.error, "inventory");
    return context.json({ code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable", fields: { correlationId } }, 503);
  }
  if (session.tag === "Unauthenticated") return context.json({ code: "UNAUTHENTICATED", message: "Authentication is required" }, 401);
  context.set("inventoryUserId", session.principal.userId);
  context.set("inventoryIsAdmin", hasAdminRole(session.principal.role));
  await next();
}

/** Create the physical inventory HTTP adapter. */
export function inventoryRoutes(dependencies: { readonly inventoryQueries: InventoryQueryService; readonly inventoryMutations: InventoryMutationService; readonly sessionResolver: SessionResolver }): Hono<InventoryEnvironment> {
  const router = new Hono<InventoryEnvironment>();
  router.use("/inventory-items", (context, next) => requireInventorySession(dependencies.sessionResolver, context, next));
  router.use("/inventory-items/*", (context, next) => requireInventorySession(dependencies.sessionResolver, context, next));

  router.get("/inventory-items/products/search", (context) => {
    const parsed = parseSearchQuery(context);
    if (!parsed.success) return validationResponse(context);
    return context.json(inventoryProductSearchResultSchema.array().parse(dependencies.inventoryQueries.searchProducts(parsed.data.query, parsed.data.limit)));
  });

  router.get("/inventory-items/:itemId", (context) => {
    const item = dependencies.inventoryQueries.findItem(context.req.param("itemId"));
    return item === null ? errorResponse(context, "INVENTORY_ITEM_NOT_FOUND") : context.json(physicalInventoryItemDetailSchema.parse(item));
  });

  router.get("/inventory-items", (context) => {
    const url = new URL(context.req.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success || (parsed.data.query !== undefined && parsed.data.query.length < 2)) return validationResponse(context, "Search query needs at least 2 characters");
    const page = dependencies.inventoryQueries.listInventory({ query: parsed.data.query ?? null, filter: parsed.data.filter, limit: parsed.data.limit, offset: parsed.data.cursor, today: localToday(context.req.header("X-Browser-Timezone")) });
    return context.json(physicalInventoryPageSchema.parse(page));
  });

  router.post("/inventory-items", async (context) => {
    if (!context.get("inventoryIsAdmin")) return errorResponse(context, "ADMIN_ROLE_REQUIRED");
    const parsed = addPhysicalInventoryItemsRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return validationResponse(context);
    const result = dependencies.inventoryMutations.addInventory(context.get("inventoryUserId"), parsed.data);
    if (!result.ok) return mutationErrorResponse(context, result.error);
    const items = result.value.map((id) => dependencies.inventoryQueries.findItem(id)).filter((item): item is PhysicalInventoryItemDetail => item !== null).map(toPhysicalItem);
    return context.json(physicalInventoryItemSchema.array().parse(items), 201);
  });

  router.put("/inventory-items/:itemId/content", async (context) => {
    if (!context.get("inventoryIsAdmin")) return errorResponse(context, "ADMIN_ROLE_REQUIRED");
    const parsed = updatePhysicalInventoryContentSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return validationResponse(context);
    const result = dependencies.inventoryMutations.setContent(context.get("inventoryUserId"), context.req.param("itemId"), parsed.data);
    if (!result.ok) return mutationErrorResponse(context, result.error);
    if (result.value === null) return new Response(null, { status: 204 });
    return detailResponse(context, dependencies.inventoryQueries, result.value);
  });

  router.put("/inventory-items/:itemId/location", async (context) => mutateDetail(context, updatePhysicalInventoryLocationSchema, (body) => dependencies.inventoryMutations.moveItem(context.get("inventoryUserId"), context.req.param("itemId"), body), dependencies));
  router.put("/inventory-items/:itemId/expiry", async (context) => mutateDetail(context, updatePhysicalInventoryExpirySchema, (body) => dependencies.inventoryMutations.setExpiry(context.get("inventoryUserId"), context.req.param("itemId"), body), dependencies));

  router.delete("/inventory-items/:itemId", async (context) => {
    if (!context.get("inventoryIsAdmin")) return errorResponse(context, "ADMIN_ROLE_REQUIRED");
    const parsed = removePhysicalInventoryItemSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return validationResponse(context);
    const result = dependencies.inventoryMutations.removeItem(context.get("inventoryUserId"), context.req.param("itemId"), parsed.data.version);
    return result.ok ? new Response(null, { status: 204 }) : mutationErrorResponse(context, result.error);
  });

  router.put("/inventory-items/products/:productId/low-stock-threshold", async (context) => {
    if (!context.get("inventoryIsAdmin")) return errorResponse(context, "ADMIN_ROLE_REQUIRED");
    const parsed = updateProductStockThresholdSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return validationResponse(context);
    const result = dependencies.inventoryMutations.setThreshold(context.req.param("productId"), parsed.data);
    return result.ok ? context.json(productStockThresholdSchema.parse(result.value)) : mutationErrorResponse(context, result.error);
  });

  return router;
}

/** Parse product search query values. */
function parseSearchQuery(context: Context<InventoryEnvironment>) {
  return searchQuerySchema.safeParse(Object.fromEntries(new URL(context.req.url).searchParams));
}

/** Apply one admin detail mutation and return the refreshed item. */
async function mutateDetail<T>(context: Context<InventoryEnvironment>, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, operation: (body: T) => { ok: true; value: string } | { ok: false; error: InventoryMutationError }, dependencies: { readonly inventoryQueries: InventoryQueryService }): Promise<Response> {
  if (!context.get("inventoryIsAdmin")) return errorResponse(context, "ADMIN_ROLE_REQUIRED");
  const parsed = schema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return validationResponse(context);
  const result = operation(parsed.data);
  return result.ok ? detailResponse(context, dependencies.inventoryQueries, result.value) : mutationErrorResponse(context, result.error);
}

/** Return one refreshed item detail. */
function detailResponse(context: Context<InventoryEnvironment>, queries: InventoryQueryService, itemId: string): Response {
  const item = queries.findItem(itemId);
  return item === null ? errorResponse(context, "INVENTORY_ITEM_NOT_FOUND") : context.json(physicalInventoryItemDetailSchema.parse(item));
}

/** Strip detail-only fields from an item. */
function toPhysicalItem(item: PhysicalInventoryItemDetail) {
  return {
    id: item.id,
    productId: item.productId,
    locationId: item.locationId,
    expiryDate: item.expiryDate,
    remainingAmountBase: item.remainingAmountBase,
    maximumAmountBase: item.maximumAmountBase,
    remainingRatio: item.remainingRatio,
    isFull: item.isFull,
    version: item.version,
  };
}

/** Derive today's ISO date in a valid browser timezone. */
function localToday(timezone: string | undefined): string {
  let safeTimezone = timezone ?? "UTC";
  try { new Intl.DateTimeFormat("en-CA", { timeZone: safeTimezone }).format(); } catch { safeTimezone = "UTC"; }
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: safeTimezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")!.value}-${parts.find((part) => part.type === "month")!.value}-${parts.find((part) => part.type === "day")!.value}`;
}

/** Render a validation error. */
function validationResponse(context: Context<InventoryEnvironment>, message = "Request is invalid"): Response { return errorResponse(context, "VALIDATION_ERROR", message); }
/** Render an expected mutation error. */
function mutationErrorResponse(context: Context<InventoryEnvironment>, error: InventoryMutationError): Response { return errorResponse(context, error); }
/** Render one stable inventory error response. */
function errorResponse(context: Context<InventoryEnvironment>, code: InventoryErrorCode, message: string = errorDetails[code].message): Response {
  return context.json(inventoryErrorResponseSchema.parse({ code, message }), errorDetails[code].status as 400);
}

const errorDetails: Readonly<Record<InventoryErrorCode, { readonly status: number; readonly message: string }>> = {
  VALIDATION_ERROR: { status: 400, message: "Request is invalid" }, REFERENCE_NOT_FOUND: { status: 400, message: "A referenced value is invalid" }, ADMIN_ROLE_REQUIRED: { status: 403, message: "Administrator access is required" }, INVENTORY_ITEM_NOT_FOUND: { status: 404, message: "Inventory item was not found" }, LOCATION_NOT_FOUND: { status: 404, message: "Location was not found" }, PRODUCT_NOT_FOUND: { status: 404, message: "Product was not found" }, INVENTORY_ITEM_VERSION_CONFLICT: { status: 409, message: "Inventory item has changed" }, PRODUCT_ARCHIVED: { status: 409, message: "Product is archived" }, PRODUCT_CONTENT_UNKNOWN: { status: 409, message: "Product content is unknown" }, AMOUNT_EXCEEDS_PRODUCT_CONTENT: { status: 409, message: "Amount exceeds product content" }, LOCATION_ARCHIVED: { status: 409, message: "Location is archived" }, UNAUTHENTICATED: { status: 401, message: "Authentication is required" }, AUTH_UNAVAILABLE: { status: 503, message: "Authentication is temporarily unavailable" }, INTERNAL_ERROR: { status: 500, message: "Internal server error" },
};
