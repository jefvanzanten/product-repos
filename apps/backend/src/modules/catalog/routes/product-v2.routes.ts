import { concreteProductInputSchema, macroProfileSchema, productCompositionInputSchema } from "@product-repos/contracts";
import { Hono, type Context } from "hono";
import type { ProductV2Service } from "../services/product-v2.service.ts";

const errorStatus = {
  VALIDATION_ERROR: 400,
  REFERENCE_NOT_FOUND: 400,
  BRAND_NOT_FOUND: 404,
  CATEGORY_ALREADY_EXISTS: 409,
  CATEGORY_HAS_CHILDREN: 409,
  CATEGORY_HAS_PRODUCTS: 409,
  PRODUCT_ALREADY_EXISTS: 409,
  PRODUCT_NOT_FOUND: 404,
  PRODUCT_COMPOSITION_ALREADY_EXISTS: 409,
  PRODUCT_COMPOSITION_NOT_FOUND: 404,
  BARCODE_ALREADY_EXISTS: 409,
  REFERENCE_BASIS_IN_USE: 409,
  PRODUCT_MACRO_PROFILE_INVALID: 409,
  UNIT_DIMENSION_INCOMPATIBLE: 400,
} as const;

/** Create product-composition and concrete-product routes. */
export function productV2Routes(service: ProductV2Service): Hono {
  const router = new Hono();

  router.get("/product-compositions/search", (context) => {
    const query = context.req.query("query")?.trim() ?? "";
    if (query.length < 2) return context.json([]);
    return context.json(service.searchCompositions(query, parseLimit(context.req.query("limit"), 20, 100)));
  });

  router.post("/product-compositions", async (context) => {
    const input = parseCompositionInput(await context.req.json().catch(() => null));
    if (!input.ok) return context.json(input.error, 400);
    const result = service.createComposition(input.value);
    return result.ok ? context.json(result.value, 201) : context.json(result.error, errorStatus[result.error.code]);
  });

  router.put("/product-compositions/:compositionId", async (context) => {
    const input = parseCompositionInput(await context.req.json().catch(() => null));
    if (!input.ok) return context.json(input.error, 400);
    const result = service.updateComposition(context.req.param("compositionId"), input.value);
    return result.ok ? context.json(result.value) : context.json(result.error, errorStatus[result.error.code]);
  });

  router.put("/product-compositions/:compositionId/macro-profile", async (context) => {
    const parsed = macroProfileSchema.nullable().safeParse(await context.req.json().catch(() => undefined));
    if (!parsed.success) return context.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const result = service.updateMacroProfile(context.req.param("compositionId"), parsed.data);
    return result.ok ? context.json(result.value.macroProfile) : context.json(result.error, errorStatus[result.error.code]);
  });

  router.get("/products", (context) => {
    const categoryId = parseOptionalInteger(context.req.query("categoryId"));
    const archived = parseOptionalBoolean(context.req.query("archived"));
    if (categoryId === "invalid" || archived === "invalid") return context.json({ code: "VALIDATION_ERROR", message: "Query is invalid" }, 400);
    return context.json(service.listProducts({ query: context.req.query("query"), categoryId, brandId: context.req.query("brandId"), archived, cursor: context.req.query("cursor"), limit: parseLimit(context.req.query("limit"), 50, 200) }));
  });

  router.post("/products", async (context) => {
    const input = parseConcreteProductInput(await context.req.json().catch(() => null));
    if (!input.ok) return context.json(input.error, 400);
    const result = service.createProduct(input.value);
    return result.ok ? context.json(result.value, 201) : context.json(result.error, errorStatus[result.error.code]);
  });

  router.get("/products/:productId", (context) => {
    const result = service.getProduct(context.req.param("productId"));
    return result.ok ? context.json(result.value) : context.json(result.error, errorStatus[result.error.code]);
  });

  router.put("/products/:productId", async (context) => {
    const input = parseConcreteProductInput(await context.req.json().catch(() => null));
    if (!input.ok) return context.json(input.error, 400);
    const result = service.updateProduct(context.req.param("productId"), input.value);
    return result.ok ? context.json(result.value) : context.json(result.error, errorStatus[result.error.code]);
  });

  router.post("/products/:productId/archive", (context) => projectArchiveResult(context, service.setArchived(context.req.param("productId"), true)));
  router.post("/products/:productId/restore", (context) => projectArchiveResult(context, service.setArchived(context.req.param("productId"), false)));

  return router;
}

/** Parse one composition request body at the HTTP boundary. */
function parseCompositionInput(value: unknown) {
  const parsed = productCompositionInputSchema.safeParse(value);
  return parsed.success
    ? { ok: true as const, value: parsed.data }
    : { ok: false as const, error: { code: "VALIDATION_ERROR" as const, message: "Request is invalid" } };
}

/** Parse one concrete-product request body at the HTTP boundary. */
function parseConcreteProductInput(value: unknown) {
  const parsed = concreteProductInputSchema.safeParse(value);
  return parsed.success
    ? { ok: true as const, value: parsed.data }
    : { ok: false as const, error: { code: "VALIDATION_ERROR" as const, message: "Request is invalid" } };
}

/** Parse a bounded HTTP result limit. */
function parseLimit(value: string | undefined, fallback: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

/** Parse an optional positive integer. */
function parseOptionalInteger(value: string | undefined): number | undefined | "invalid" {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : "invalid";
}

/** Parse an optional boolean query value. */
function parseOptionalBoolean(value: string | undefined): boolean | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return "invalid";
}

/** Project an archive service result through the HTTP boundary. */
function projectArchiveResult(context: Context, result: ReturnType<ProductV2Service["setArchived"]>): Response {
  return result.ok ? context.json(result.value) : context.json(result.error, errorStatus[result.error.code]);
}
