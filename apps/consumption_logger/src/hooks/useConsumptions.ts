import { useEffect, useState } from 'react';
import type { Consumption } from '@product-repos/contracts';
import { api } from '../api/client';

export function useConsumptions() {
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.consumptions
      .getAll()
      .then(setConsumptions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { consumptions, loading, error };
}
