import { createBrandRequestSchema } from "@product-repos/contracts";
import { Hono } from "hono";
import { trimRequired } from "../domain";
import { findOrCreateBrand, searchBrands } from "../repositories/brands.repository";

export function brandRoutes() {
  const router = new Hono();

  router.get("/brands", (c) => c.json(searchBrands(c.req.query("query") ?? "")));

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
