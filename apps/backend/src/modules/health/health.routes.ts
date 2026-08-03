import { Hono } from "hono";
import type { HealthService } from "./health.service.ts";

/** Create liveness and database-readiness HTTP routes. */
export function healthRoutes(service: HealthService): Hono {
  const router = new Hono();

  router.get("/health", (context) => {
    return context.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  router.get("/health/db", (context) => {
    service.assertDatabaseReady();
    return context.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
