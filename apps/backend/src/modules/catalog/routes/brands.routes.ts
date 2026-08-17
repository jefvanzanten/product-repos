import { createBrandRequestSchema } from "@product-repos/contracts";
import { Hono } from "hono";
import type { CatalogReferenceService } from "../services/catalog-reference.service.ts";

/** Create brand routes with injected catalog use cases. */
export function brandRoutes(service: Pick<CatalogReferenceService, "findBrandById" | "findOrCreateBrand" | "searchBrands">): Hono {
  const { findBrandById, findOrCreateBrand, searchBrands } = service;
  const router = new Hono();

  router.get("/brands", (c) => c.json(searchBrands(c.req.query("query") ?? "")));

  router.get("/brands/:brandId", (c) => {
    const brand = findBrandById(c.req.param("brandId"));
    if (!brand) return c.json({ code: "BRAND_NOT_FOUND", message: "Brand not found" }, 404);
    return c.json(brand);
  });

  router.post("/brands", async (c) => {
    const parsed = createBrandRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ code: "VALIDATION_ERROR", message: "Request is invalid" }, 400);
    const result = findOrCreateBrand(parsed.data.name);
    if (!result.ok) return c.json(result.error, 400);
    return c.json(result.value.brand, result.value.created ? 201 : 200);
  });

  return router;
}
