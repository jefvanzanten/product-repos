import { Hono } from "hono";

export function productPackageRoutes() {
  const router = new Hono();

  // Product Packages
  router.post("product-package", async (c) => {
    const body = await c.req.json();
    const productPackage = createNewProductPackage(body);
    return c.json(productPackage, 201);
  });

  // Packaging Types
  router.get("/packaging-types", (c) => {
    const data = getAllPackagingTypes();
    return c.json(data);
  });

  return router;
}
