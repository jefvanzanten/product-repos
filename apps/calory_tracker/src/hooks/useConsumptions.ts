import { useEffect, useState } from 'react';
import { api, type Consumption } from '../api/client';

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
