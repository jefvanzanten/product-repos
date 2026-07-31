import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index";

/** Create liveness and database-readiness HTTP routes. */
export function healthRoutes() {
  const router = new Hono();

  router.get("/health", (context) => {
    return context.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  router.get("/health/db", (context) => {
    db.get(sql`SELECT 1 as healthy`);
    return context.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
