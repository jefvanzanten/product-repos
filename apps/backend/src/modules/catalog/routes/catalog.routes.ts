import { Hono, type MiddlewareHandler } from "hono";
import type { CatalogReferenceService } from "../services/catalog-reference.service.ts";
import type { CatalogProductRouteService } from "../services/products.service.ts";
import type { PackageImageService } from "../services/package-image.service.ts";
import { brandRoutes } from "./brands.routes.ts";
import { categoryRoutes } from "./categories.routes.ts";
import { productRoutes } from "./products.routes.ts";
import { unitRoutes } from "./units.routes.ts";

/** Create the authorized catalog router from current route capabilities. */
export function catalogRoutes(dependencies: {
  readonly authorization: MiddlewareHandler;
  readonly packageImages: PackageImageService;
  readonly references: CatalogReferenceService;
  readonly products: CatalogProductRouteService;
}): Hono {
  const router = new Hono();
  router.use("/brands/*", dependencies.authorization);
  router.use("/categories/*", dependencies.authorization);
  router.use("/package-types/*", dependencies.authorization);
  router.use("/products/*", dependencies.authorization);
  router.use("/unit-types/*", dependencies.authorization);
  router.route("/", brandRoutes(dependencies.references));
  router.route("/", categoryRoutes(dependencies.references));
  router.route("/", unitRoutes(dependencies.references));
  router.route("/", productRoutes(dependencies.products, dependencies.packageImages));
  return router;
}
