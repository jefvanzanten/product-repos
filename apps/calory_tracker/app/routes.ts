import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("layout.tsx", [
    index("routes/statistics.tsx"),
    route("logs", "routes/logs.tsx"),
    route("logs/nieuw", "routes/log-new.tsx"),
    route("logs/:logId", "routes/log-detail.tsx"),
    route("logs/:logId/bewerken", "routes/log-edit.tsx"),
  ]),
] satisfies RouteConfig;
