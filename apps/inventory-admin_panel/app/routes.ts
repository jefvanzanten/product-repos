import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

// export default [index("routes/home.tsx")] satisfies RouteConfig;

export default [
  layout("../features/shared/layout/layout.tsx", [
    index("routes/inventory.tsx"),
    // route("home", "routes/home.tsx"),

    layout("../features/admin/shared/layout/layout.tsx", [
      route("admin", "routes/admin/index.tsx", [
        route("brand-lookup", "routes/admin/brand-lookup.ts"),
        route("product-catalogus/producten", "routes/admin/product-catalog/product-catalog.tsx"),
        route("product-catalogus/producten/nieuw", "routes/admin/new-product/new-product.tsx"),
        route("locations", "routes/admin/locations.tsx"),
      ]),
    ]),
  ]),
] satisfies RouteConfig;
