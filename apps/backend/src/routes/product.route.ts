import { createProductPackageRequestSchema, createProductRequestSchema, updateProductPackageRequestSchema, updateProductRequestSchema } from "@product-repos/contracts";
import { Hono } from "hono";
import { canonicalDecimal, positiveInt, trimRequired } from "../domain";
import { browseCatalog, searchCatalog } from "../repositories/catalog.repository";
import { createProductPackage, findProductPackageDetailById, updateProductPackage } from "../repositories/product-packages.repository";
import { createProduct, findProductDetailById, updateProduct } from "../repositories/products.repository";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const status = { VALIDATION_ERROR: 400, REFERENCE_NOT_FOUND: 400, CATEGORY_ALREADY_EXISTS: 409, CATEGORY_HAS_CHILDREN: 409, CATEGORY_HAS_PRODUCTS: 409, PRODUCT_ALREADY_EXISTS: 409, PRODUCT_NOT_FOUND: 404, PRODUCT_PACKAGE_ALREADY_EXISTS: 409, PRODUCT_PACKAGE_NOT_FOUND: 404 } as const;

export function productRoutes() {
  const router = new Hono();

  router.get("/products/search", (c) => {
    const query = c.req.query("query") ?? "";
    return c.json(searchCatalog({
      query,
      productLimit: parseLimit(c.req.query("productLimit"), 20, 200),
      brandLimit: parseLimit(c.req.query("brandLimit"), 10, 100),
      categoryLimit: parseLimit(c.req.query("categoryLimit"), 10, 100),
    }), 200);
  });

  router.get("/products", (c) => {
    const categoryId = parseOptionalPositiveInt(c.req.query("categoryId"));
    if (!categoryId.ok) return c.json(categoryId.error, 400);
    const brandId = c.req.query("brandId")?.trim();
    if (brandId && !uuidPattern.test(brandId)) return c.json({ code: "REFERENCE_NOT_FOUND", message: "Brand not found" }, 400);
    const limit = parseLimit(c.req.query("limit"), 50, 500);

    const result = browseCatalog({
      ...(categoryId.value === undefined ? {} : { categoryId: categoryId.value }),
      ...(brandId ? { brandId } : {}),
      limit,
    });
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value, 200);
  });

  router.post("/products", async (c) => {
    const parsed = createProductRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const name = trimRequired(parsed.data.name, "name");
    if (!name.ok) return c.json(name.error, 400);
    const amount = canonicalDecimal(parsed.data.package.amount);
    if (!amount.ok) return c.json(amount.error, 400);
    const unitsPerPackage = positiveInt(parsed.data.package.unitsPerPackage, "unitsPerPackage");
    if (!unitsPerPackage.ok) return c.json(unitsPerPackage.error, 400);
    const result = createProduct({
      name: name.value,
      categoryId: parsed.data.categoryId,
      brandId: parsed.data.brandId ?? null,
      package: { packageTypeId: parsed.data.package.packageTypeId, amount: amount.value, unitTypeId: parsed.data.package.unitTypeId, unitsPerPackage: unitsPerPackage.value },
    });
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value, 201);
  });

  router.patch("/products/:productId", async (c) => {
    const productId = c.req.param("productId");
    if (!uuidPattern.test(productId)) return c.json({ code: "PRODUCT_NOT_FOUND", message: "Product not found" }, 404);

    const parsed = updateProductRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const name = trimRequired(parsed.data.name, "name");
    if (!name.ok) return c.json(name.error, 400);

    const result = updateProduct({
      productId,
      name: name.value,
      categoryId: parsed.data.categoryId,
      brandId: parsed.data.brandId ?? null,
    });
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value, 200);
  });

  router.post("/products/:productId/packages", async (c) => {
    const productId = c.req.param("productId");
    if (!uuidPattern.test(productId)) return c.json({ code: "PRODUCT_NOT_FOUND", message: "Product not found" }, 404);

    const parsed = createProductPackageRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const amount = canonicalDecimal(parsed.data.amount);
    if (!amount.ok) return c.json(amount.error, 400);
    const unitsPerPackage = positiveInt(parsed.data.unitsPerPackage, "unitsPerPackage");
    if (!unitsPerPackage.ok) return c.json(unitsPerPackage.error, 400);

    const result = createProductPackage({
      productId,
      packageTypeId: parsed.data.packageTypeId,
      amount: amount.value,
      unitTypeId: parsed.data.unitTypeId,
      unitsPerPackage: unitsPerPackage.value,
    });
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value, 201);
  });

  router.get("/products/:productId/packages/:packageId", (c) => {
    const productId = c.req.param("productId");
    if (!uuidPattern.test(productId)) return c.json({ code: "PRODUCT_NOT_FOUND", message: "Product not found" }, 404);
    const packageId = c.req.param("packageId");
    if (!uuidPattern.test(packageId)) return c.json({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" }, 404);

    const result = findProductPackageDetailById(productId, packageId);
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value, 200);
  });

  router.patch("/products/:productId/packages/:packageId", async (c) => {
    const productId = c.req.param("productId");
    if (!uuidPattern.test(productId)) return c.json({ code: "PRODUCT_NOT_FOUND", message: "Product not found" }, 404);
    const packageId = c.req.param("packageId");
    if (!uuidPattern.test(packageId)) return c.json({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" }, 404);

    const parsed = updateProductPackageRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const amount = canonicalDecimal(parsed.data.amount);
    if (!amount.ok) return c.json(amount.error, 400);
    const unitsPerPackage = positiveInt(parsed.data.unitsPerPackage, "unitsPerPackage");
    if (!unitsPerPackage.ok) return c.json(unitsPerPackage.error, 400);

    const result = updateProductPackage({
      productId,
      packageId,
      packageTypeId: parsed.data.packageTypeId,
      amount: amount.value,
      unitTypeId: parsed.data.unitTypeId,
      unitsPerPackage: unitsPerPackage.value,
    });
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value, 200);
  });

  router.get("/products/:productId", (c) => {
    const productId = c.req.param("productId");
    if (!uuidPattern.test(productId)) return c.json({ code: "PRODUCT_NOT_FOUND", message: "Product not found" }, 404);

    const result = findProductDetailById(productId);
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value, 200);
  });

  return router;
}

function parseLimit(value: string | undefined, fallback: number, maximum: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function parseOptionalPositiveInt(value: string | undefined) {
  if (value === undefined || value.trim() === "") return { ok: true, value: undefined } as const;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return { ok: false, error: { code: "VALIDATION_ERROR", message: "Category is invalid" } } as const;
  return { ok: true, value: parsed } as const;
}
