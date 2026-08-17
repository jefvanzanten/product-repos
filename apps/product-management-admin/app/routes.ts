import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("routes/layout/layout.tsx", [
    index("routes/index.tsx"),
    route("brand-lookup", "routes/brand-lookup.ts"),
    route("composition-lookup", "routes/composition-lookup.ts"),
    route("product-catalogus", "routes/product-catalog/product-catalog.tsx"),
    route(
      "product-catalogus/categorieen/:categoryId/bewerken",
      "routes/product-catalog/edit-category.tsx",
    ),
    route("product-catalogus/nieuw", "routes/new-product/new-product.tsx"),
    route(
      "product-catalogus/:productId",
      "routes/product-detail/product-detail.tsx",
    ),
    route("locations", "routes/locations.tsx"),
  ]),
] satisfies RouteConfig;
