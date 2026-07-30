import { createProductRequestSchema, productPackageRequestSchema, updateProductRequestSchema } from "@product-repos/contracts";
import { Hono } from "hono";
import { canonicalDecimal, positiveInt, trimRequired } from "../domain";
import { browseProductCatalog, searchProductCatalog } from "../repositories/product-catalog.repository";
import { addProductPackage, getProductPackage, updateProductPackage } from "../repositories/product-packages.repository";
import { createNewProduct, getProductById, updateExistingProduct } from "../services/products.service";

const status = {
  VALIDATION_ERROR: 400,
  REFERENCE_NOT_FOUND: 400,
  BRAND_NOT_FOUND: 404,
  CATEGORY_ALREADY_EXISTS: 409,
  CATEGORY_HAS_CHILDREN: 409,
  CATEGORY_HAS_PRODUCTS: 409,
  PRODUCT_ALREADY_EXISTS: 409,
  PRODUCT_NOT_FOUND: 404,
  PRODUCT_PACKAGE_ALREADY_EXISTS: 409,
  PRODUCT_PACKAGE_NOT_FOUND: 404,
  PRODUCT_MACRO_PROFILE_INVALID: 409,
  UNIT_DIMENSION_INCOMPATIBLE: 400,
} as const;

/** Create the product catalog HTTP routes. */
export function productRoutes() {
  const router = new Hono();

  router.get("/products/search", (c) => {
    return c.json(searchProductCatalog({
      query: c.req.query("query") ?? "",
      productLimit: parseLimit(c.req.query("productLimit"), 20, 200),
      brandLimit: parseLimit(c.req.query("brandLimit"), 10, 100),
      categoryLimit: parseLimit(c.req.query("categoryLimit"), 10, 100),
    }));
  });

  router.get("/products", (c) => {
    const categoryId = parseOptionalPositiveInt(c.req.query("categoryId"));
    if (categoryId === "invalid") return c.json({ code: "VALIDATION_ERROR", message: "Category id is invalid" }, 400);

    const result = browseProductCatalog({
      categoryId,
      brandId: c.req.query("brandId") || undefined,
      limit: parseLimit(c.req.query("limit"), 50, 500),
    });
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value);
  });

  router.post("/products", async (c) => {
    const parsed = createProductRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const name = trimRequired(parsed.data.name, "name");
    if (!name.ok) return c.json(name.error, 400);
    const packageInput = parsePackageInput(parsed.data.package);
    if (!packageInput.ok) return c.json(packageInput.error, 400);
    const result = createNewProduct({
      name: name.value,
      categoryId: parsed.data.categoryId,
      brandId: parsed.data.brandId ?? null,
      consumptionType: parsed.data.consumptionType,
      macroProfile: parsed.data.macroProfile ?? null,
      package: packageInput.value,
    });
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value, 201);
  });

  router.get("/products/:productId", (c) => {
    const result = getProductById(c.req.param("productId"));
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value);
  });

  router.patch("/products/:productId", async (c) => {
    const parsed = updateProductRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const name = trimRequired(parsed.data.name, "name");
    if (!name.ok) return c.json(name.error, 400);

    const result = updateExistingProduct(c.req.param("productId"), {
      name: name.value,
      categoryId: parsed.data.categoryId,
      brandId: parsed.data.brandId,
      consumptionType: parsed.data.consumptionType,
      macroProfile: parsed.data.macroProfile,
    });
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value);
  });

  router.post("/products/:productId/packages", async (c) => {
    const parsed = productPackageRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const packageInput = parsePackageInput(parsed.data);
    if (!packageInput.ok) return c.json(packageInput.error, 400);

    const result = addProductPackage(c.req.param("productId"), packageInput.value);
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value, 201);
  });

  router.get("/products/:productId/packages/:packageId", (c) => {
    const packageId = parseRequiredPositiveInt(c.req.param("packageId"));
    if (packageId === null) return c.json({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" }, 404);
    const result = getProductPackage(c.req.param("productId"), packageId);
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value);
  });

  router.patch("/products/:productId/packages/:packageId", async (c) => {
    const packageId = parseRequiredPositiveInt(c.req.param("packageId"));
    if (packageId === null) return c.json({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" }, 404);
    const parsed = productPackageRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const packageInput = parsePackageInput(parsed.data);
    if (!packageInput.ok) return c.json(packageInput.error, 400);

    const result = updateProductPackage(c.req.param("productId"), packageId, packageInput.value);
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value);
  });

  return router;
}

/** Parse a bounded positive result limit. */
function parseLimit(value: string | undefined, fallback: number, max: number): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return fallback;
  return Math.min(number, max);
}

/** Parse an optional positive integer query parameter. */
function parseOptionalPositiveInt(value: string | undefined): number | undefined | "invalid" {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return "invalid";
  return parsed;
}

/** Parse a required positive integer path parameter. */
function parseRequiredPositiveInt(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

/** Parse package decimals and counts for application use. */
function parsePackageInput(input: { readonly packageTypeId: number; readonly amount: string; readonly unitTypeId: number; readonly unitsPerPackage: number }) {
  const amount = canonicalDecimal(input.amount);
  if (!amount.ok) return amount;
  const unitsPerPackage = positiveInt(input.unitsPerPackage, "unitsPerPackage");
  if (!unitsPerPackage.ok) return unitsPerPackage;
  return { ok: true as const, value: { packageTypeId: input.packageTypeId, amount: amount.value, unitTypeId: input.unitTypeId, unitsPerPackage: unitsPerPackage.value } };
}
