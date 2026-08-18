import {
  createRecipeSchema,
  recipeArchiveResultSchema,
  recipeDetailSchema,
  recipeIngredientInputOptionsSchema,
  recipePageSchema,
  recipeProductSearchResultSchema,
  recipeSortSchema,
  updateRecipeSchema,
} from "@product-repos/contracts/recipes";
import { Hono, type Context, type Next } from "hono";
import { z } from "zod/v4";
import {
  reportAuthenticationStoreUnavailable,
  type SessionResolver,
} from "../../auth/services/session-resolution.service.ts";
import type {
  RecipeResult,
  RecipeService,
} from "../services/recipe.service.ts";

/** Request variables resolved by optional and required recipe authentication. */
type RecipeVariables = {
  recipeViewerUserId: string | undefined;
};

/** Hono environment for recipe routes. */
export type RecipeEnvironment = { Variables: RecipeVariables };

const listQuerySchema = z
  .object({
    query: z.string().max(200).optional().default(""),
    sort: recipeSortSchema.optional().default("newest"),
    cursor: z.string().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(30),
    archived: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();
const productSearchQuerySchema = z
  .object({
    query: z.string(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .strict();
const uuidSchema = z.string().uuid();
const userIdSchema = z.string().min(1).max(255);

const errorStatus = {
  VALIDATION_ERROR: 400,
  REFERENCE_NOT_FOUND: 400,
  DISH_NOT_FOUND: 404,
  DISH_ALREADY_EXISTS: 409,
  PRODUCT_ARCHIVED: 409,
  PRODUCT_NOT_CONSUMABLE: 409,
  DISH_UPDATE_CONFLICT: 409,
  UNAUTHENTICATED: 401,
  AUTH_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
} as const;

/** Create public-read and owner-management recipe endpoints. */
export function recipeRoutes(dependencies: {
  readonly recipes: RecipeService;
  readonly sessionResolver: SessionResolver;
}): Hono<RecipeEnvironment> {
  const router = new Hono<RecipeEnvironment>();
  router.use("*", (context, next) =>
    resolveOptionalSession(dependencies.sessionResolver, context, next),
  );

  router.get("/recipes", (context) => {
    const query = parseListQuery(context);
    if (!query.success) return validationResponse(context);
    const result = dependencies.recipes.listPublic(query.data);
    if (!result.ok) return errorResponse(context, result);
    setReadCacheHeaders(context);
    return context.json(recipePageSchema.parse(result.value));
  });

  router.get("/recipes/users/:userId", (context) => {
    const userId = userIdSchema.safeParse(context.req.param("userId"));
    const query = parseListQuery(context);
    if (!userId.success || !query.success) return validationResponse(context);
    const result = dependencies.recipes.listForUser(
      context.get("recipeViewerUserId"),
      userId.data,
      query.data,
    );
    if (!result.ok) return errorResponse(context, result);
    setReadCacheHeaders(context);
    return context.json(recipePageSchema.parse(result.value));
  });

  router.get("/recipes/users/:userId/:dishId", (context) => {
    const userId = userIdSchema.safeParse(context.req.param("userId"));
    const dishId = uuidSchema.safeParse(context.req.param("dishId"));
    if (!userId.success || !dishId.success) return neutralNotFound(context);
    const result = dependencies.recipes.getRecipe(
      context.get("recipeViewerUserId"),
      userId.data,
      dishId.data,
    );
    if (!result.ok) return errorResponse(context, result);
    setReadCacheHeaders(context);
    return context.json(recipeDetailSchema.parse(result.value));
  });

  router.post("/recipes", requireSession, async (context) => {
    const body = createRecipeSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!body.success) return validationResponse(context);
    const result = dependencies.recipes.createRecipe(
      context.get("recipeViewerUserId")!,
      body.data,
    );
    return result.ok
      ? context.json(recipeDetailSchema.parse(result.value), 201)
      : errorResponse(context, result);
  });

  router.put("/recipes/:dishId", requireSession, async (context) => {
    const dishId = uuidSchema.safeParse(context.req.param("dishId"));
    const body = updateRecipeSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!dishId.success || !body.success) return validationResponse(context);
    const result = dependencies.recipes.updateRecipe(
      context.get("recipeViewerUserId")!,
      dishId.data,
      body.data,
    );
    return result.ok
      ? context.json(recipeDetailSchema.parse(result.value))
      : errorResponse(context, result);
  });

  router.post("/recipes/:dishId/archive", requireSession, (context) => {
    const dishId = uuidSchema.safeParse(context.req.param("dishId"));
    if (!dishId.success) return neutralNotFound(context);
    const result = dependencies.recipes.archiveRecipe(
      context.get("recipeViewerUserId")!,
      dishId.data,
    );
    return result.ok
      ? context.json(recipeArchiveResultSchema.parse(result.value))
      : errorResponse(context, result);
  });

  router.post("/recipes/:dishId/restore", requireSession, (context) => {
    const dishId = uuidSchema.safeParse(context.req.param("dishId"));
    if (!dishId.success) return neutralNotFound(context);
    const result = dependencies.recipes.restoreRecipe(
      context.get("recipeViewerUserId")!,
      dishId.data,
    );
    return result.ok
      ? context.json(recipeDetailSchema.parse(result.value))
      : errorResponse(context, result);
  });

  router.get("/recipes/products/search", requireSession, (context) => {
    const query = productSearchQuerySchema.safeParse(
      Object.fromEntries(new URL(context.req.url).searchParams.entries()),
    );
    if (!query.success) return validationResponse(context);
    const result = dependencies.recipes.searchProducts(
      query.data.query,
      query.data.limit,
    );
    return result.ok
      ? context.json(
          recipeProductSearchResultSchema.array().parse(result.value),
        )
      : errorResponse(context, result);
  });

  router.get(
    "/recipes/products/:productId/input-units",
    requireSession,
    (context) => {
      const productId = uuidSchema.safeParse(context.req.param("productId"));
      if (!productId.success)
        return context.json(
          { code: "REFERENCE_NOT_FOUND", message: "Product not found" },
          400,
        );
      const result = dependencies.recipes.getInputOptions(productId.data);
      return result.ok
        ? context.json(recipeIngredientInputOptionsSchema.parse(result.value))
        : errorResponse(context, result);
    },
  );

  return router;
}

/** Resolve an optional session while keeping anonymous public reads available. */
async function resolveOptionalSession(
  sessionResolver: SessionResolver,
  context: Context<RecipeEnvironment>,
  next: Next,
): Promise<Response | void> {
  const session = await sessionResolver.resolveSession(context.req.raw.headers);
  if (session.tag === "Unavailable") {
    const correlationId = reportAuthenticationStoreUnavailable(
      session.error,
      "recipes",
    );
    return context.json(
      {
        code: "AUTH_UNAVAILABLE",
        message: "Authentication is temporarily unavailable",
        fields: { correlationId },
      },
      503,
    );
  }
  context.set(
    "recipeViewerUserId",
    session.tag === "Authenticated" ? session.principal.userId : undefined,
  );
  await next();
}

/** Reject a write or product-selection request without an authenticated viewer. */
async function requireSession(
  context: Context<RecipeEnvironment>,
  next: Next,
): Promise<Response | void> {
  if (context.get("recipeViewerUserId") === undefined)
    return context.json(
      { code: "UNAUTHENTICATED", message: "Authentication is required" },
      401,
    );
  await next();
}

/** Parse list search parameters without accepting unknown query keys. */
function parseListQuery(context: Context<RecipeEnvironment>) {
  return listQuerySchema.safeParse(
    Object.fromEntries(new URL(context.req.url).searchParams.entries()),
  );
}

/** Set cache policy according to whether the response depended on a session. */
function setReadCacheHeaders(context: Context<RecipeEnvironment>): void {
  context.header("Vary", "Cookie");
  context.header(
    "Cache-Control",
    context.get("recipeViewerUserId") === undefined
      ? "public, max-age=60, stale-while-revalidate=300"
      : "private, no-store",
  );
}

/** Render a strict request validation response. */
function validationResponse(context: Context<RecipeEnvironment>): Response {
  return context.json(
    { code: "VALIDATION_ERROR", message: "Request is invalid" },
    400,
  );
}

/** Render the shared neutral recipe-not-found response. */
function neutralNotFound(context: Context<RecipeEnvironment>): Response {
  return context.json(
    { code: "DISH_NOT_FOUND", message: "Recipe not found" },
    404,
  );
}

/** Translate an expected recipe failure into a documented HTTP response. */
function errorResponse<T>(
  context: Context<RecipeEnvironment>,
  result: Extract<RecipeResult<T>, { readonly ok: false }>,
): Response {
  if (result.error.code === "INTERNAL_ERROR") {
    const correlationId = crypto.randomUUID();
    console.error("Recipe projection invariant failure", {
      correlationId,
      operation: `${context.req.method} ${new URL(context.req.url).pathname}`,
    });
    return context.json(
      {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        fields: { correlationId },
      },
      500,
    );
  }
  return context.json(result.error, errorStatus[result.error.code]);
}
