import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { BackendConfig } from "./config.ts";
import type { CalorieTrackerEnvironment } from "./modules/calorie-tracker/routes/calorie-tracker.routes.ts";
import type { InventoryEnvironment } from "./modules/inventory/routes/inventory.routes.ts";
import type { LocationEnvironment } from "./modules/locations/routes/location.routes.ts";

/** Already-composed dependencies mounted by the global HTTP shell. */
export type AppDependencies = {
  readonly config: BackendConfig;
  readonly authHandler: (request: Request) => Response | Promise<Response>;
  readonly catalogRoutes: Hono;
  readonly calorieTrackerRoutes: Hono<CalorieTrackerEnvironment>;
  readonly inventoryRoutes: Hono<InventoryEnvironment>;
  readonly locationRoutes: Hono<LocationEnvironment>;
  readonly healthRoutes: Hono;
};

/**
 * Create the global Hono shell around already-composed module routes.
 *
 * @param dependencies - Configuration and composed route dependencies.
 * @returns The complete backend Hono application.
 */
export function createApp(dependencies: AppDependencies): Hono {
  const app = new Hono();
  app.use("*", logger());
  app.use("*", cors({
    origin: (origin) => (dependencies.config.corsOrigins.includes(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization", "X-Browser-Timezone"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }));

  app.on(["GET", "POST"], "/api/auth/*", (context) => dependencies.authHandler(context.req.raw));
  app.get("/", (context) => context.json({ message: "Backend API is running", version: "1.0.0", timestamp: new Date().toISOString() }));
  app.route("/", dependencies.healthRoutes);
  app.route("/", dependencies.catalogRoutes);
  app.route("/calorie-tracker", dependencies.calorieTrackerRoutes);
  app.route("/", dependencies.inventoryRoutes);
  app.route("/", dependencies.locationRoutes);

  app.notFound((context) => context.json({ error: { message: "Route not found", statusCode: 404, path: new URL(context.req.url).pathname } }, 404));
  app.onError((error, context) => {
    const correlationId = crypto.randomUUID();
    console.error("Unhandled backend defect", {
      operation: `${context.req.method} ${new URL(context.req.url).pathname}`,
      errorTag: "INTERNAL_ERROR",
      defectName: error.name || "UnknownError",
      correlationId,
    });
    return context.json({ code: "INTERNAL_ERROR", message: "Internal server error", fields: { correlationId } }, 500);
  });
  return app;
}
