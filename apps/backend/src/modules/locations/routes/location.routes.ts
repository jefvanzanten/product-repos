import { createLocationRequestSchema, locationErrorResponseSchema, locationTreeNodeSchema, updateLocationRequestSchema, type LocationErrorCode } from "@product-repos/contracts/locations";
import { Hono, type Context, type Next } from "hono";
import { z } from "zod/v4";
import { hasAdminRole } from "../../auth/domain/role.ts";
import { reportAuthenticationStoreUnavailable, type SessionResolver } from "../../auth/services/session-resolution.service.ts";
import type { LocationService, LocationServiceError } from "../services/location.service.ts";

const locationIdParameterSchema = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive());

type LocationVariables = { readonly locationIsAdmin: boolean };
export type LocationEnvironment = { Variables: LocationVariables };

/**
 * Create authenticated location read and admin-management HTTP routes.
 *
 * @param dependencies - Composed service and session resolver.
 * @returns Location router mounted at the API root.
 */
export function locationRoutes(dependencies: {
  readonly locations: LocationService;
  readonly sessionResolver: SessionResolver;
}): Hono<LocationEnvironment> {
  const router = new Hono<LocationEnvironment>();
  router.use("/locations", (context, next) => requireLocationAccess(dependencies.sessionResolver, context, next));
  router.use("/locations/*", (context, next) => requireLocationAccess(dependencies.sessionResolver, context, next));

  router.get("/locations", (context) => {
    const url = new URL(context.req.url);
    const keys = [...url.searchParams.keys()];
    if (keys.some((key) => key !== "status") || url.searchParams.getAll("status").length > 1) {
      return errorResponse(context, "VALIDATION_ERROR");
    }
    if (!url.searchParams.has("status")) return context.json(dependencies.locations.listActiveLocations());
    if (url.searchParams.get("status") !== "archived") return errorResponse(context, "VALIDATION_ERROR");
    if (!context.get("locationIsAdmin")) return errorResponse(context, "ADMIN_ROLE_REQUIRED");
    return context.json(dependencies.locations.listArchivedLocations());
  });

  router.post("/locations", async (context) => {
    const input = await parseJsonBody(context, createLocationRequestSchema);
    if (!input.ok) return errorResponse(context, "VALIDATION_ERROR");
    const result = dependencies.locations.createLocation(input.value);
    if (!result.ok) return serviceErrorResponse(context, result.error);
    return context.json(locationTreeNodeSchema.parse(result.value), 201);
  });

  router.patch("/locations/:locationId", async (context) => {
    const id = parseLocationId(context.req.param("locationId"));
    if (id === null) return errorResponse(context, "VALIDATION_ERROR");
    const input = await parseJsonBody(context, updateLocationRequestSchema);
    if (!input.ok) return errorResponse(context, "VALIDATION_ERROR");
    const result = dependencies.locations.updateLocation(id, input.value);
    if (!result.ok) return serviceErrorResponse(context, result.error);
    return context.json(locationTreeNodeSchema.parse(result.value));
  });

  router.post("/locations/:locationId/archive", async (context) => {
    const id = parseLocationId(context.req.param("locationId"));
    if (id === null || !(await hasEmptyBody(context))) return errorResponse(context, "VALIDATION_ERROR");
    const result = dependencies.locations.archiveLocation(id);
    if (!result.ok) return serviceErrorResponse(context, result.error);
    return context.json(locationTreeNodeSchema.parse(result.value));
  });

  router.post("/locations/:locationId/restore", async (context) => {
    const id = parseLocationId(context.req.param("locationId"));
    if (id === null || !(await hasEmptyBody(context))) return errorResponse(context, "VALIDATION_ERROR");
    const result = dependencies.locations.restoreLocation(id);
    if (!result.ok) return serviceErrorResponse(context, result.error);
    return context.json(locationTreeNodeSchema.parse(result.value));
  });

  return router;
}

/**
 * Require a session for active reads and an administrator for archive reads and writes.
 *
 * @param sessionResolver - Authentication boundary capability.
 * @param context - Current Location request context.
 * @param next - Next Hono handler.
 * @returns An auth error response or downstream completion.
 */
async function requireLocationAccess(
  sessionResolver: SessionResolver,
  context: Context<LocationEnvironment>,
  next: Next,
): Promise<Response | void> {
  const session = await sessionResolver.resolveSession(context.req.raw.headers);
  if (session.tag === "Unavailable") {
    const correlationId = reportAuthenticationStoreUnavailable(session.error, "locations");
    return context.json({ code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable", fields: { correlationId } }, 503);
  }
  if (session.tag === "Unauthenticated") {
    return context.json({ code: "UNAUTHENTICATED", message: "Authentication is required" }, 401);
  }
  const isAdmin = hasAdminRole(session.principal.role);
  context.set("locationIsAdmin", isAdmin);
  const url = new URL(context.req.url);
  const requiresAdmin = context.req.method !== "GET" || url.searchParams.get("status") === "archived";
  if (requiresAdmin && !isAdmin) return errorResponse(context, "ADMIN_ROLE_REQUIRED");
  await next();
}

/**
 * Parse a positive location route parameter.
 *
 * @param value - Raw route parameter.
 * @returns A positive integer or null when invalid.
 */
function parseLocationId(value: string): number | null {
  const parsed = locationIdParameterSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Parse unknown JSON through one strict Zod request schema.
 *
 * @param context - Current request context.
 * @param schema - Contract schema owning the boundary parse.
 * @returns Parsed data or a validation marker.
 */
async function parseJsonBody<T>(context: Context<LocationEnvironment>, schema: z.ZodType<T>): Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false }> {
  try {
    const parsed = schema.safeParse(await context.req.json());
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * Verify that archive and restore requests carry no payload.
 *
 * @param context - Current request context.
 * @returns Whether the body is empty.
 */
async function hasEmptyBody(context: Context<LocationEnvironment>): Promise<boolean> {
  return (await context.req.text()).length === 0;
}

/**
 * Map an expected service conflict to the documented HTTP response.
 *
 * @param context - Current request context.
 * @param error - Typed service error.
 * @returns Standard Location error response.
 */
function serviceErrorResponse(context: Context<LocationEnvironment>, error: LocationServiceError): Response {
  return errorResponse(context, error);
}

/**
 * Render one stable Location error code with its status and safe message.
 *
 * @param context - Current request context.
 * @param code - Stable Location API error code.
 * @returns Strict validated JSON response.
 */
function errorResponse(context: Context<LocationEnvironment>, code: LocationErrorCode): Response {
  const details = locationErrorDetails[code];
  return context.json(locationErrorResponseSchema.parse({ code, message: details.message }), details.status as 400);
}

const locationErrorDetails: Readonly<Record<LocationErrorCode, { readonly status: number; readonly message: string }>> = {
  VALIDATION_ERROR: { status: 400, message: "Request is invalid" },
  ADMIN_ROLE_REQUIRED: { status: 403, message: "Administrator access is required" },
  LOCATION_NOT_FOUND: { status: 404, message: "Location was not found" },
  PARENT_LOCATION_NOT_FOUND: { status: 404, message: "Parent location was not found" },
  LOCATION_ALREADY_EXISTS: { status: 409, message: "A location with this name already exists at this level" },
  LOCATION_ARCHIVED: { status: 409, message: "Archived locations cannot be moved" },
  PARENT_LOCATION_ARCHIVED: { status: 409, message: "Parent location is archived" },
  LOCATION_CYCLE: { status: 409, message: "Location move would create an invalid hierarchy" },
  LOCATION_ARCHIVED_BY_ANCESTOR: { status: 409, message: "Location is archived by an ancestor" },
  UNAUTHENTICATED: { status: 401, message: "Authentication is required" },
  AUTH_UNAVAILABLE: { status: 503, message: "Authentication is temporarily unavailable" },
  INTERNAL_ERROR: { status: 500, message: "Internal server error" },
};
