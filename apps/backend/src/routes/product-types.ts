import { Hono } from 'hono';
import {
  createNewProductType,
  getAllProductTypes,
  getProductTypeById,
  removeProductType,
  updateExistingProductType,
} from '../services/product-types.service';

export function productTypeRoutes() {
  const router = new Hono();

  router.get('/product-types', (c) => {
    const data = getAllProductTypes();
    return c.json(data);
  });

  router.get('/product-types/:id', (c) => {
    const id = c.req.param('id');
    const productType = getProductTypeById(id);
    if (!productType) return c.json({ error: { message: 'Product type not found', statusCode: 404 } }, 404);
    return c.json(productType);
  });

  router.post('/product-types', async (c) => {
    const body = await c.req.json();
    const productType = createNewProductType(body);
    return c.json(productType, 201);
  });

  router.put('/product-types/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const productType = updateExistingProductType(id, body);
    if (!productType) return c.json({ error: { message: 'Product type not found', statusCode: 404 } }, 404);
    return c.json(productType);
  });

  router.delete('/product-types/:id', (c) => {
    const id = c.req.param('id');
    const productType = removeProductType(id);
    if (!productType) return c.json({ error: { message: 'Product type not found', statusCode: 404 } }, 404);
    return c.json(productType);
  });

  return router;
}
