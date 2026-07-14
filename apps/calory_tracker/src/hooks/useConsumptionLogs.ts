import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useConsumptionLogs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['consumption-logs'],
    queryFn: api.consumptionLogs.getAll,
  });

  return {
    logs: data ?? [],
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
