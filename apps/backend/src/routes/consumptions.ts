import { Hono } from 'hono';
import {
  createNewConsumption,
  getAllConsumptions,
  getConsumptionById,
  removeConsumption,
  updateExistingConsumption,
} from '../services/consumptions.service';

export function consumptionRoutes() {
  const router = new Hono();

  router.get('/consumptions', (c) => {
    const data = getAllConsumptions();
    return c.json(data);
  });

  router.get('/consumptions/:id', (c) => {
    const id = Number(c.req.param('id'));
    const consumption = getConsumptionById(id);
    if (!consumption) {
      return c.json({ error: { message: 'Consumption not found', statusCode: 404 } }, 404);
    }
    return c.json(consumption);
  });

  router.post('/consumptions', async (c) => {
    const body = await c.req.json();
    const consumption = createNewConsumption(body);
    return c.json(consumption, 201);
  });

  router.put('/consumptions/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const consumption = updateExistingConsumption(id, body);
    if (!consumption) return c.json({ error: { message: 'Consumption not found', statusCode: 404 } }, 404);
    return c.json(consumption);
  });

  router.delete('/consumptions/:id', (c) => {
    const id = Number(c.req.param('id'));
    const consumption = removeConsumption(id);
    if (!consumption) return c.json({ error: { message: 'Consumption not found', statusCode: 404 } }, 404);
    return c.json(consumption);
  });

  return router;
}
