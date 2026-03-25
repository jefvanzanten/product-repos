import { Hono } from 'hono';
import { db } from '../db/index';
import { sql } from 'drizzle-orm';

export function healthRoutes() {
  const router = new Hono();

  router.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  router.get('/health/db', (c) => {
    try {
      db.get(sql`SELECT 1 as healthy`);
      return c.json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      return c.json({
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 500);
    }
  });

  return router;
}
