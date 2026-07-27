import { createBrandRequestSchema } from "@product-repos/contracts";
import { Hono } from "hono";
import { trimRequired } from "../domain";
import { findBrandById, findOrCreateBrand, searchBrands } from "../repositories/brands.repository";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function brandRoutes() {
  const router = new Hono();

  router.get("/brands", (c) => c.json(searchBrands(c.req.query("query") ?? "")));

  router.get("/brands/:brandId", (c) => {
    const brandId = c.req.param("brandId");
    if (!uuidPattern.test(brandId)) return c.json({ code: "BRAND_NOT_FOUND", message: "Brand not found" }, 404);
    const foundBrand = findBrandById(brandId);
    if (!foundBrand) return c.json({ code: "BRAND_NOT_FOUND", message: "Brand not found" }, 404);
    return c.json(foundBrand, 200);
  });

  router.post("/brands", async (c) => {
    const parsed = createBrandRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const name = trimRequired(parsed.data.name, "name");
    if (!name.ok) return c.json(name.error, 400);
    const result = findOrCreateBrand(name.value);
    return c.json(result.brand, result.created ? 201 : 200);
  });

  return router;
}
