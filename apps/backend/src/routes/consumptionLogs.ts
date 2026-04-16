import { Hono } from 'hono';
import { consumptionLogInsertSchema } from '@product-repos/contracts';
import {
  createNewConsumptionLog,
  getAllConsumptionLogs,
} from '../services/consumptionLogs.service';

export function consumptionLogRoutes() {
  const router = new Hono();

  router.get('/consumption-logs', (c) => {
    const data = getAllConsumptionLogs();
    return c.json(data);
  });

  router.post('/consumption-logs', async (c) => {
    const body = await c.req.json();
    const parsed = consumptionLogInsertSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { message: 'Validatiefout', issues: parsed.error.issues, statusCode: 422 } }, 422);
    }
    const log = createNewConsumptionLog(parsed.data);
    return c.json(log, 201);
  });

  return router;
}
