import { Hono, type MiddlewareHandler } from "hono";
import type { ProductV2Service } from "../services/product-v2.service.ts";
import type { CatalogReferenceService } from "../services/catalog-reference.service.ts";
import type { ProductImageService } from "../services/product-image.service.ts";
import { brandRoutes } from "./brands.routes.ts";
import { categoryRoutes } from "./categories.routes.ts";
import { productV2Routes } from "./product-v2.routes.ts";
import { unitRoutes } from "./units.routes.ts";

/** Create the authorized target-model catalog router. */
export function catalogRoutes(dependencies: {
  readonly authorization: MiddlewareHandler;
  readonly references: CatalogReferenceService;
  readonly products: ProductV2Service;
  readonly productImages: ProductImageService;
}): Hono {
  const router = new Hono();
  router.get("/package-images/:fileName", async (context) => {
    const storedImage = await dependencies.productImages.readImage(context.req.param("fileName"));
    if (storedImage === null) return context.json({ code: "IMAGE_NOT_FOUND", message: "Image not found" }, 404);
    return new Response(storedImage.file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": storedImage.mediaType,
      },
    });
  });
  router.use("/brands/*", dependencies.authorization);
  router.use("/categories/*", dependencies.authorization);
  router.use("/package-types/*", dependencies.authorization);
  router.use("/products/*", dependencies.authorization);
  router.use("/product-compositions/*", dependencies.authorization);
  router.use("/unit-types/*", dependencies.authorization);
  router.route("/", brandRoutes(dependencies.references));
  router.route("/", categoryRoutes(dependencies.references));
  router.route("/", unitRoutes(dependencies.references));
  router.route("/", productV2Routes(dependencies.products));
  return router;
}
