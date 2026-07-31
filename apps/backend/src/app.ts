import type { CalorieTrackerErrorResponse } from "@product-repos/contracts/calorie-tracker";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth/auth.ts";
import { requireCatalogAccess } from "./auth/catalog-authorization.ts";
import { brandRoutes } from "./routes/brands";
import { healthRoutes } from "./routes/health";
import { categoryRoutes } from "./routes/categories";
import { calorieTrackerRoutes } from "./routes/calorie-tracker.ts";
import { productRoutes } from "./routes/product.route";
import { unitRoutes } from "./routes/units";

/** Create the configured Hono API application. */
export function createApp() {
  const app = new Hono();

  app.use("*", logger());

  const allowedOrigins = (
    process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3001"
  )
    .split(",")
    .map((o) => o.trim());

  app.use(
    "*",
    cors({
      origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
      allowHeaders: ["Content-Type", "Authorization", "X-Browser-Timezone"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  );

  app.on(["GET", "POST"], "/api/auth/*", (context) => {
    return auth.handler(context.req.raw);
  });

  app.use("*", requireCatalogAccess);

  app.get("/", (c) => {
    return c.json({
      message: "Backend API is running",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  app.route("/", healthRoutes());
  app.route("/", brandRoutes());
  app.route("/", categoryRoutes());
  app.route("/", unitRoutes());
  app.route("/", productRoutes());
  app.route("/", calorieTrackerRoutes());

  app.notFound((c) => {
    return c.json(
      {
        error: {
          message: "Route not found",
          statusCode: 404,
          path: new URL(c.req.url).pathname,
        },
      },
      404,
    );
  });

  app.onError((_error, context) => {
    const correlationId = crypto.randomUUID();
    console.error("Unhandled backend defect", {
      operation: `${context.req.method} ${new URL(context.req.url).pathname}`,
      errorTag: "INTERNAL_ERROR",
      correlationId,
    });
    const response: CalorieTrackerErrorResponse = {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      fields: { correlationId },
    };
    return context.json(response, 500);
  });

  return app;
}
