import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

// export default [index("routes/home.tsx")] satisfies RouteConfig;

export default [
  layout("../features/shared/layout.tsx", [
    index("routes/inventory.tsx"),
    // route("home", "routes/home.tsx"),

    layout("../features/admin/shared/layout.tsx", [
      route("admin", "routes/admin/index.tsx", [
        route("product-management", "routes/admin/product-management.tsx"),
        route("locations", "routes/admin/locations.tsx"),
      ]),
    ]),
  ]),
] satisfies RouteConfig;
