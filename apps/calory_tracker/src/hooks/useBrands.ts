import { useEffect, useState } from 'react';
import type { CalorieTrackerBrand } from '../api/legacy-types';
import { api } from '../api/client';

export function useBrands() {
  const [brands, setBrands] = useState<CalorieTrackerBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.brands
      .getAll()
      .then(setBrands)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { brands, loading, error };
}
