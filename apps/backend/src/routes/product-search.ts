import { Hono } from 'hono';
import { getProductSearchResults } from '../services/product-search.service';

export function productSearchRoutes() {
  const router = new Hono();

  router.get('/api/product-search', (c) => {
    return c.json(getProductSearchResults(c.req.query('q')));
  });

  return router;
}
