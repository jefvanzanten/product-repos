import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { brandRoutes } from "./routes/brands";
import { healthRoutes } from "./routes/health";
import { categoryRoutes } from "./routes/categories";
import { productRoutes } from "./routes/product.route";
import { unitRoutes } from "./routes/units";

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
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  );

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

  app.onError((err, c) => {
    console.error(err);
    const statusCode = (err as { status?: number }).status ?? 500;
    return c.json(
      {
        error: {
          message: err.message || "Internal Server Error",
          statusCode,
        },
      },
      statusCode as 500,
    );
  });

  return app;
}
