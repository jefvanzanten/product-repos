import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useUnits() {
  const { data, isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: api.units.getAll,
  });

  return {
    units: data ?? [],
    isLoading,
  };
}
