import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";
import { calorieTrackerRoutePatterns as paths } from "./core/presentation/routing/calorie-tracker-routes";

export default [
  route(paths.login, "routes/login/login.tsx"),
  route("timezone", "routes/timezone.ts"),
  route("consumable-lookup", "routes/consumable-lookup/consumable-lookup.ts"),
  route("product-input-units/:productId", "routes/product-input-units/package-input-units.ts"),
  layout("routes/layout/layout.tsx", [
    index("routes/statistics/statistics.tsx"),
    route(paths.logs, "routes/logs/logs-layout.tsx", [
      route(paths.newLog, "routes/log-new/log-new.tsx"),
      route(paths.legacyNewLog, "routes/logs/legacy-new-log-redirect.ts"),
      route(paths.logDetail, "routes/log-detail/log-detail.tsx"),
      route(paths.editLog, "routes/log-edit/log-edit.tsx"),
      route(paths.legacyEditLog, "routes/log-edit/legacy-edit-log-redirect.ts"),
    ]),
  ]),
] satisfies RouteConfig;
