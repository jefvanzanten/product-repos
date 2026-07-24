import { Hono } from "hono";
import {
  createBrandForProductType,
  createNewBrand,
  getAllBrands,
  getBrandById,
  removeBrand,
  updateExistingBrand,
} from "../services/brands.service";

export function brandRoutes() {
  const router = new Hono();

  router.get("/brands", (c) => {
    const data = getAllBrands();
    return c.json(data);
  });

  router.get("/brands/:id", (c) => {
    const id = c.req.param("id");
    const brand = getBrandById(id);
    if (!brand)
      return c.json(
        { error: { message: "Brand not found", statusCode: 404 } },
        404,
      );
    return c.json(brand);
  });

  router.post("/brands", async (c) => {
    const body = await c.req.json();
    const brand = createNewBrand(body);
    return c.json(brand, 201);
  });

  router.put("/brands/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const brand = updateExistingBrand(id, body);
    if (!brand)
      return c.json(
        { error: { message: "Brand not found", statusCode: 404 } },
        404,
      );
    return c.json(brand);
  });

  router.delete("/brands/:id", (c) => {
    const id = c.req.param("id");
    const brand = removeBrand(id);
    if (!brand)
      return c.json(
        { error: { message: "Brand not found", statusCode: 404 } },
        404,
      );
    return c.json(brand);
  });

  return router;
}
