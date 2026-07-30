import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("../features/shared/layout/layout.tsx", [
    index("routes/inventory.tsx"),
  ]),
] satisfies RouteConfig;
