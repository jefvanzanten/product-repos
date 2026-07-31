import {
  browserTimezoneSchema,
  consumptionTypeFilterSchema,
  createConsumptionLogSchema,
  localDateSchema,
  nutritionGoalSchema,
  packageSearchResultSchema,
  updateConsumptionLogSchema,
  upsertNutritionGoalSchema,
} from "@product-repos/contracts/calorie-tracker";
import { z } from "zod/v4";
import { Hono, type Context, type Next } from "hono";
import { auth } from "../auth/auth.ts";
import { calorieTracker, type CalorieTrackerResult } from "../calorie-tracker/calorie-tracker.ts";
import { isAllowedLocalDate, parseTimezone } from "../calorie-tracker/domain.ts";

const packageSearchQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
}).strict();

const logListQuerySchema = z.object({
  date: localDateSchema,
  type: consumptionTypeFilterSchema.default("all"),
}).strict();

const statisticsQuerySchema = z.object({ date: localDateSchema }).strict();
const positiveIntegerPathSchema = z.coerce.number().int().positive();
const uuidPathSchema = z.string().uuid();

type CalorieTrackerVariables = {
  calorieTrackerUserId: string;
};

type CalorieTrackerEnvironment = {
  Variables: CalorieTrackerVariables;
};

const errorStatus = {
  VALIDATION_ERROR: 400,
  REFERENCE_NOT_FOUND: 400,
  PRODUCT_PACKAGE_NOT_FOUND: 404,
  PRODUCT_PACKAGE_ARCHIVED: 409,
  LOG_NOT_FOUND: 404,
  LOG_ALREADY_EXISTS: 409,
  LOG_CREATE_CONFLICT: 409,
  LOG_UPDATE_CONFLICT: 409,
  LOG_RESTORE_WINDOW_EXPIRED: 409,
  UNAUTHENTICATED: 401,
  AUTH_UNAVAILABLE: 503,
} as const;

/** Require a Better Auth session and expose only its user identifier to handlers. */
async function requireCalorieTrackerSession(
  context: Context<CalorieTrackerEnvironment>,
  next: Next,
): Promise<Response | void> {
  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    session = await auth.api.getSession({ headers: context.req.raw.headers });
  } catch (cause) {
    console.error("Authentication store unavailable", {
      operation: "calorieTracker.getSession",
      errorTag: "AUTH_UNAVAILABLE",
      cause,
    });
    return context.json({ code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable" }, 503);
  }
  if (!session) return context.json({ code: "UNAUTHENTICATED", message: "Authentication is required" }, 401);
  context.set("calorieTrackerUserId", session.user.id);
  await next();
}

/** Create the authenticated Calorie Tracker HTTP route adapter. */
export function calorieTrackerRoutes(): Hono<CalorieTrackerEnvironment> {
  const router = new Hono<CalorieTrackerEnvironment>();
  router.use("*", requireCalorieTrackerSession);

  router.get("/calorie-tracker/packages/search", (context) => {
    const url = new URL(context.req.url);
    const parsed = packageSearchQuerySchema.safeParse({
      query: url.searchParams.has("query") ? url.searchParams.get("query") ?? "" : undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return validationResponse(context);
    const result = calorieTracker.searchPackages(context.get("calorieTrackerUserId"), parsed.data.query, parsed.data.limit);
    if (!result.ok) return errorResponse(context, result);
    return context.json(packageSearchResultSchema.array().parse(result.value));
  });

  router.get("/calorie-tracker/packages/:packageId/input-units", (context) => {
    const packageId = positiveIntegerPathSchema.safeParse(context.req.param("packageId"));
    if (!packageId.success) return context.json({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" }, 404);
    const result = calorieTracker.getAvailableInputUnits(packageId.data);
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  router.get("/calorie-tracker/logs", (context) => {
    const boundary = parseDateBoundary(context, logListQuerySchema);
    if (!boundary.ok) return boundary.response;
    const result = calorieTracker.listLogs(
      context.get("calorieTrackerUserId"),
      boundary.value.query.date,
      boundary.value.timezone,
      boundary.value.query.type,
    );
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  router.post("/calorie-tracker/logs", async (context) => {
    const timezone = parseTimezoneHeader(context);
    if (!timezone.ok) return timezone.response;
    const body = createConsumptionLogSchema.safeParse(await readJson(context));
    if (!body.success) return validationResponse(context);
    const result = calorieTracker.createLog(context.get("calorieTrackerUserId"), timezone.value, body.data);
    if (!result.ok) return errorResponse(context, result);
    return context.json(result.value.log, result.value.state === "created" ? 201 : 200);
  });

  router.get("/calorie-tracker/logs/:logId", (context) => {
    const logId = uuidPathSchema.safeParse(context.req.param("logId"));
    if (!logId.success) return context.json({ code: "LOG_NOT_FOUND", message: "Log not found" }, 404);
    const result = calorieTracker.getLog(context.get("calorieTrackerUserId"), logId.data);
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  router.patch("/calorie-tracker/logs/:logId", async (context) => {
    const logId = uuidPathSchema.safeParse(context.req.param("logId"));
    if (!logId.success) return context.json({ code: "LOG_NOT_FOUND", message: "Log not found" }, 404);
    const timezone = parseTimezoneHeader(context);
    if (!timezone.ok) return timezone.response;
    const body = updateConsumptionLogSchema.safeParse(await readJson(context));
    if (!body.success) return validationResponse(context);
    const result = calorieTracker.updateLog(context.get("calorieTrackerUserId"), logId.data, timezone.value, body.data);
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  router.delete("/calorie-tracker/logs/:logId", (context) => {
    const logId = uuidPathSchema.safeParse(context.req.param("logId"));
    if (!logId.success) return context.json({ code: "LOG_NOT_FOUND", message: "Log not found" }, 404);
    const result = calorieTracker.deleteLog(context.get("calorieTrackerUserId"), logId.data);
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  router.post("/calorie-tracker/logs/:logId/restore", (context) => {
    const logId = uuidPathSchema.safeParse(context.req.param("logId"));
    if (!logId.success) return context.json({ code: "LOG_NOT_FOUND", message: "Log not found" }, 404);
    const result = calorieTracker.restoreLog(context.get("calorieTrackerUserId"), logId.data);
    return result.ok ? context.json(result.value) : errorResponse(context, result);
  });

  router.get("/calorie-tracker/goals", (context) => {
    const result = calorieTracker.getGoals(context.get("calorieTrackerUserId"));
    return result.ok ? context.json(nutritionGoalSchema.parse(result.value)) : errorResponse(context, result);
  });

  router.put("/calorie-tracker/goals", async (context) => {
    const body = upsertNutritionGoalSchema.safeParse(await readJson(context));
    if (!body.success) return validationResponse(context);
    const result = calorieTracker.replaceGoals(context.get("calorieTrackerUserId"), body.data);
    return result.ok ? context.json(nutritionGoalSchema.parse(result.value)) : errorResponse(context, result);
  });

  router.get("/calorie-tracker/statistics", (context) => {
    const boundary = parseDateBoundary(context, statisticsQuerySchema);
    if (!boundary.ok) return boundary.response;
    const result = calorieTracker.getDailyStatistics(
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
  return context.json(result.error, errorStatus[result.error.code]);
}
