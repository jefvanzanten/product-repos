import { useEffect, useState } from 'react';
import type { CalorieTrackerProduct } from '../api/legacy-types';
import { api } from '../api/client';

export function useProducts() {
  const [products, setProducts] = useState<CalorieTrackerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.products
      .getAll()
      .then(setProducts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { products, loading, error };
}
