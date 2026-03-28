import { Hono } from 'hono';
import {
  createNewUnit,
  getAllUnits,
  getUnitById,
  removeUnit,
  updateExistingUnit,
} from '../services/units.service';

export function unitRoutes() {
  const router = new Hono();

  router.get('/units', (c) => {
    const data = getAllUnits();
    return c.json(data);
  });

  router.get('/units/:id', (c) => {
    const id = Number(c.req.param('id'));
    const unit = getUnitById(id);
    if (!unit) return c.json({ error: { message: 'Unit not found', statusCode: 404 } }, 404);
    return c.json(unit);
  });

  router.post('/units', async (c) => {
    const body = await c.req.json();
    const unit = createNewUnit(body);
    return c.json(unit, 201);
  });

  router.put('/units/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const unit = updateExistingUnit(id, body);
    if (!unit) return c.json({ error: { message: 'Unit not found', statusCode: 404 } }, 404);
    return c.json(unit);
  });

  router.delete('/units/:id', (c) => {
    const id = Number(c.req.param('id'));
    const unit = removeUnit(id);
    if (!unit) return c.json({ error: { message: 'Unit not found', statusCode: 404 } }, 404);
    return c.json(unit);
  });

  return router;
}
