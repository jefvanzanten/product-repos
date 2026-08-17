import {
  browserTimezoneSchema,
  consumptionTypeFilterSchema,
  createConsumptionLogSchema,
  localDateSchema,
  nutritionGoalSchema,
  productSearchResultSchema,
  unifiedSearchResultSchema,
  updateConsumptionLogSchema,
  upsertNutritionGoalSchema,
} from "@product-repos/contracts/calorie-tracker";
import { z } from "zod/v4";
import { Hono, type Context, type Next } from "hono";
import { reportAuthenticationStoreUnavailable, type SessionResolver } from "../../auth/services/session-resolution.service.ts";
import type { CalorieTrackerResult } from "../services/calorie-tracker-service-support.ts";
import type { ConsumptionLogService } from "../services/consumption-log.service.ts";
import type { NutritionSummaryService } from "../services/nutrition-summary.service.ts";
import type { PackageSelectionService } from "../services/package-selection.service.ts";
import type { UnifiedSearchService } from "../services/unified-search.service.ts";
import { isAllowedLocalDate, parseTimezone } from "../domain/calorie-tracker-domain.ts";

const packageSearchQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
}).strict();

const logListQuerySchema = z.object({
  date: localDateSchema,
  type: consumptionTypeFilterSchema.default("all"),
}).strict();

const statisticsQuerySchema = z.object({ date: localDateSchema }).strict();
const uuidPathSchema = z.string().uuid();

type CalorieTrackerVariables = {
  calorieTrackerUserId: string;
};

export type CalorieTrackerEnvironment = {
  Variables: CalorieTrackerVariables;
};

const errorStatus = {
  VALIDATION_ERROR: 400,
  REFERENCE_NOT_FOUND: 400,
  PRODUCT_NOT_FOUND: 404,
  PRODUCT_ARCHIVED: 409,
  DISH_UNAVAILABLE: 409,
  LOG_NOT_FOUND: 404,
  LOG_ALREADY_EXISTS: 409,
  LOG_CREATE_CONFLICT: 409,
  LOG_UPDATE_CONFLICT: 409,
  LOG_RESTORE_WINDOW_EXPIRED: 409,
  DISH_NOT_FOUND: 404,
  DISH_ALREADY_EXISTS: 409,
  IMAGE_NOT_FOUND: 404,
  UNAUTHENTICATED: 401,
  AUTH_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
} as const;

/** Require a Better Auth session and expose only its user identifier to handlers. */
async function requireCalorieTrackerSession(
  sessionResolver: SessionResolver,
  context: Context<CalorieTrackerEnvironment>,
  next: Next,
): Promise<Response | void> {
  const session = await sessionResolver.resolveSession(context.req.raw.headers);
  if (session._tag === "Unavailable") {
    const correlationId = reportAuthenticationStoreUnavailable(session.error, "calorieTracker");
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
  context.set("calorieTrackerUserId", session.principal.userId);
  await next();
}

/** Create the authenticated Calorie Tracker HTTP route adapter. */
export function calorieTrackerRoutes(dependencies: {
  readonly consumptionLogs: ConsumptionLogService;
  readonly nutritionSummary: NutritionSummaryService;
  readonly packageSelection: PackageSelectionService;
  readonly unifiedSearch: UnifiedSearchService;
  readonly sessionResolver: SessionResolver;
}): Hono<CalorieTrackerEnvironment> {
  const { consumptionLogs, nutritionSummary, packageSelection, unifiedSearch } = dependencies;
  const router = new Hono<CalorieTrackerEnvironment>();

  router.use("*", (context, next) => requireCalorieTrackerSession(dependencies.sessionResolver, context, next));

  router.get("/products/search", (context) => {
    const url = new URL(context.req.url);
    const parsed = packageSearchQuerySchema.safeParse({
      query: url.searchParams.has("query") ? url.searchParams.get("query") ?? "" : undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return validationResponse(context);
    const result = packageSelection.searchPackages(context.get("calorieTrackerUserId"), parsed.data.query, parsed.data.limit);
    if (!result.ok) return errorResponse(context, result);
    return context.json(productSearchResultSchema.array().parse(result.value));
  });

  router.get("/search", (context) => {
    const url = new URL(context.req.url);
    const parsed = packageSearchQuerySchema.safeParse({
      query: url.searchParams.has("query") ? url.searchParams.get("query") ?? "" : undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return validationResponse(context);
    const result = unifiedSearch.search(context.get("calorieTrackerUserId"), parsed.data.query, parsed.data.limit);
    if (!result.ok) return errorResponse(context, result);
    return context.json(unifiedSearchResultSchema.array().parse(result.value));
  });

  router.get("/products/:productId/input-units", (context) => {
    const productId = uuidPathSchema.safeParse(context.req.param("productId"));
    if (!productId.success) return context.json({ code: "PRODUCT_NOT_FOUND", message: "Product not found" }, 404);
    const result = packageSelection.getAvailableInputUnits(productId.data);
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  router.get("/logs", (context) => {
    const boundary = parseDateBoundary(context, logListQuerySchema);
    if (!boundary.ok) return boundary.response;
    const result = consumptionLogs.listLogs(
      context.get("calorieTrackerUserId"),
      boundary.value.query.date,
      boundary.value.timezone,
      boundary.value.query.type,
    );
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  router.post("/logs", async (context) => {
    const timezone = parseTimezoneHeader(context);
    if (!timezone.ok) return timezone.response;
    const body = createConsumptionLogSchema.safeParse(await readJson(context));
    if (!body.success) return validationResponse(context);
    const result = consumptionLogs.createLog(context.get("calorieTrackerUserId"), timezone.value, body.data);
    if (!result.ok) return errorResponse(context, result);
    return context.json(result.value.log, result.value.state === "created" ? 201 : 200);
  });

  router.get("/logs/:logId", (context) => {
    const logId = uuidPathSchema.safeParse(context.req.param("logId"));
    if (!logId.success) return context.json({ code: "LOG_NOT_FOUND", message: "Log not found" }, 404);
    const result = consumptionLogs.getLog(context.get("calorieTrackerUserId"), logId.data);
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  /** Replace all editable log input fields under optimistic concurrency. */
  const replaceLog = async (context: Context<CalorieTrackerEnvironment>): Promise<Response> => {
    const logId = uuidPathSchema.safeParse(context.req.param("logId"));
    if (!logId.success) return context.json({ code: "LOG_NOT_FOUND", message: "Log not found" }, 404);
    const timezone = parseTimezoneHeader(context);
    if (!timezone.ok) return timezone.response;
    const body = updateConsumptionLogSchema.safeParse(await readJson(context));
    if (!body.success) return validationResponse(context);
    const result = consumptionLogs.updateLog(context.get("calorieTrackerUserId"), logId.data, timezone.value, body.data);
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  };
  router.put("/logs/:logId", replaceLog);
  // Temporary compatibility alias for clients released before full-replacement semantics became explicit.
  router.patch("/logs/:logId", replaceLog);

  router.delete("/logs/:logId", (context) => {
    const logId = uuidPathSchema.safeParse(context.req.param("logId"));
    if (!logId.success) return context.json({ code: "LOG_NOT_FOUND", message: "Log not found" }, 404);
    const result = consumptionLogs.deleteLog(context.get("calorieTrackerUserId"), logId.data);
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  router.post("/logs/:logId/restore", (context) => {
    const logId = uuidPathSchema.safeParse(context.req.param("logId"));
    if (!logId.success) return context.json({ code: "LOG_NOT_FOUND", message: "Log not found" }, 404);
    const result = consumptionLogs.restoreLog(context.get("calorieTrackerUserId"), logId.data);
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  router.get("/goals", (context) => {
    const result = nutritionSummary.getGoals(context.get("calorieTrackerUserId"));
    return result.ok ? context.json(nutritionGoalSchema.parse(result.value)) : errorResponse(context, result);
  });

  router.put("/goals", async (context) => {
    const body = upsertNutritionGoalSchema.safeParse(await readJson(context));
    if (!body.success) return validationResponse(context);
    const result = nutritionSummary.replaceGoals(context.get("calorieTrackerUserId"), body.data);
    return result.ok ? context.json(nutritionGoalSchema.parse(result.value)) : errorResponse(context, result);
  });

  router.get("/statistics", (context) => {
    const boundary = parseDateBoundary(context, statisticsQuerySchema);
    if (!boundary.ok) return boundary.response;
    const result = nutritionSummary.getDailyStatistics(
      context.get("calorieTrackerUserId"),
      boundary.value.query.date,
      boundary.value.timezone,
    );
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  return router;
}

/** Read JSON without allowing parser exceptions to cross the inbound adapter. */
async function readJson(context: Context<CalorieTrackerEnvironment>): Promise<unknown> {
  return context.req.json().catch(() => null);
}

/** Parse and resolve the required browser timezone header. */
function parseTimezoneHeader(context: Context<CalorieTrackerEnvironment>):
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly response: Response } {
  const schemaResult = browserTimezoneSchema.safeParse(context.req.header("X-Browser-Timezone"));
  if (!schemaResult.success) return { ok: false, response: validationResponse(context, "Browser timezone is required") };
  const parsed = parseTimezone(schemaResult.data);
  if (!parsed.ok) return { ok: false, response: context.json(parsed.error, 400) };
  return { ok: true, value: parsed.value };
}

/** Parse a date-scoped query together with its required timezone header. */
function parseDateBoundary<T extends z.ZodType<{ readonly date: string }>>(
  context: Context<CalorieTrackerEnvironment>,
  schema: T,
):
  | { readonly ok: true; readonly value: { readonly query: z.infer<T>; readonly timezone: string } }
  | { readonly ok: false; readonly response: Response } {
  const timezone = parseTimezoneHeader(context);
  if (!timezone.ok) return timezone;
  const queryObject = Object.fromEntries(new URL(context.req.url).searchParams.entries());
  const query = schema.safeParse(queryObject);
  if (!query.success) return { ok: false, response: validationResponse(context) };
  if (!isAllowedLocalDate(query.data.date, timezone.value, new Date())) {
    return { ok: false, response: validationResponse(context, "Date must be today or in the past") };
  }
  return { ok: true, value: { query: query.data, timezone: timezone.value } };
}

/** Render a standard strict validation error response. */
function validationResponse(context: Context<CalorieTrackerEnvironment>, message = "Request is invalid"): Response {
  return context.json({ code: "VALIDATION_ERROR", message }, 400);
}

/** Translate a typed expected application failure into its documented HTTP status. */
function errorResponse<T>(context: Context<CalorieTrackerEnvironment>, result: Extract<CalorieTrackerResult<T>, { readonly ok: false }>): Response {
  if (result.error.code === "INTERNAL_ERROR") {
    const correlationId = crypto.randomUUID();
    console.error("Calorie Tracker invariant failure", {
      operation: `${context.req.method} ${new URL(context.req.url).pathname}`,
      errorTag: "INTERNAL_ERROR",
      correlationId,
    });
    return context.json({
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      fields: { correlationId },
    }, 500);
  }
  return context.json(result.error, errorStatus[result.error.code]);
}
