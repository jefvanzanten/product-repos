import { createCategoryRequestSchema } from "@product-repos/contracts";
import { Hono } from "hono";
import type { CatalogReferenceService } from "../services/catalog-reference.service.ts";
import { trimRequired } from "../domain/catalog-domain.ts";

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

/** Create category routes with injected catalog use cases. */
export function categoryRoutes(service: Pick<CatalogReferenceService, "createCategory" | "deleteCategory" | "findAllCategories" | "updateCategoryName">): Hono {
  const { createCategory, deleteCategory, findAllCategories, updateCategoryName } = service;
  const router = new Hono();

  router.get("/categories", (c) =>
    c.json(
      findAllCategories().map((x) => ({
        id: x.id,
        name: x.name,
        parentId: x.parentId,
      })),
    ),
  );

  router.patch("/categories/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id < 1) {
      return c.json({ code: "VALIDATION_ERROR", message: "Category id is invalid" }, 400);
    }

    const body = await c.req.json().catch(() => null) as { name?: unknown } | null;
    const name = trimRequired(body?.name, "name");
    if (!name.ok) return c.json(name.error, 400);

    const result = updateCategoryName(id, name.value);
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json({ id: result.value.id, name: result.value.name, parentId: result.value.parentId });
  });

  router.delete("/categories/:id", (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id < 1) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Category id is invalid" },
        400,
      );
    }

    const result = deleteCategory(id);
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(result.value);
  });

  router.post("/categories", async (c) => {
    const parsed = createCategoryRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success)
      return c.json(
        { code: "VALIDATION_ERROR", message: "Request is invalid" },
        400,
      );
    const name = trimRequired(parsed.data.name, "name");
    if (!name.ok) return c.json(name.error, 400);
    const result = createCategory({
      name: name.value,
      parentId: parsed.data.parentId ?? null,
    });
    if (!result.ok) return c.json(result.error, status[result.error.code]);
    return c.json(
      {
        id: result.value.id,
        name: result.value.name,
        parentId: result.value.parentId,
      },
      201,
    );
  });

  return router;
}
