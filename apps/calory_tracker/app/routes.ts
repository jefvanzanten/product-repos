import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("layout.tsx", [
    index("routes/dashboard.tsx"),
    layout("routes/admin-layout.tsx", [
      route("admin", "routes/admin/index.tsx", [
        route("brand-lookup", "routes/admin/brand-lookup.ts"),
        route(
          "product-catalogus",
          "routes/admin/product-catalog/product-catalog.tsx",
        ),
        route(
          "product-catalogus/categorieen/:categoryId/bewerken",
          "routes/admin/product-catalog/edit-category.tsx",
        ),
        route(
          "product-catalogus/nieuw",
          "routes/admin/new-product/new-product.tsx",
        ),
        route(
          "product-catalogus/:productId/verpakkingen/nieuw",
          "routes/admin/product-package/package-form.tsx",
        ),
        route(
          "product-catalogus/:productId/verpakkingen/:packageId",
          "routes/admin/product-package/package-detail.tsx",
        ),
        route(
          "product-catalogus/:productId",
          "routes/admin/product-detail/product-detail.tsx",
        ),
        route("locations", "routes/admin/locations.tsx"),
      ]),
    ]),
  ]),
] satisfies RouteConfig;
