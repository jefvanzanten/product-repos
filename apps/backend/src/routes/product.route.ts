import { createProductRequestSchema } from "@product-repos/contracts";
import { Hono } from "hono";
import { canonicalDecimal, positiveInt, trimRequired } from "../domain";
import { createProduct } from "../repositories/products.repository";

const status = { VALIDATION_ERROR: 400, REFERENCE_NOT_FOUND: 400, CATEGORY_ALREADY_EXISTS: 409, CATEGORY_HAS_CHILDREN: 409, CATEGORY_HAS_PRODUCTS: 409, PRODUCT_ALREADY_EXISTS: 409 } as const;

export function productRoutes() {
  const router = new Hono();

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

  return router;
}
