import { Hono } from "hono";

export function productRoutes() {
  const router = new Hono();

  // Products
  router.get("/products", (c) => {
    const data = getAllProducts();
    return c.json(data);
  });

  router.post("/products", async (c) => {
    const body = await c.req.json();
    const product = createNewProduct(body);
    return c.json(product, 201);
  });

  router.get("/products/:id", (c) => {
    const id = c.req.param("id");
    const product = getProductById(id);
    if (!product)
      return c.json(
        { error: { message: "Product not found", statusCode: 404 } },
        404,
      );
    return c.json(product);
  });

  router.put("/products/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const product = updateExistingProduct(id, body);
    if (!product)
      return c.json(
        { error: { message: "Product not found", statusCode: 404 } },
        404,
      );
    return c.json(product);
  });

  router.delete("/products/:id", (c) => {
    const id = c.req.param("id");
    const product = removeProduct(id);
    if (!product)
      return c.json(
        { error: { message: "Product not found", statusCode: 404 } },
        404,
      );
    return c.json(product);
  });

  return router;
}
