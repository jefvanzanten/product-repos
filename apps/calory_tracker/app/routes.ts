import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("layout.tsx", [
    index("routes/dashboard.tsx"),
  ]),
] satisfies RouteConfig;
