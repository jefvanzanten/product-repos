import type { CalorieTrackerBrand, CalorieTrackerProduct, CalorieTrackerUnit } from './legacy-types';

export interface Consumption {
  id: number;
  name: string;
}

export interface ConsumptionLog {
  id: number;
  productId: number;
  timestamp: string;
  amount: number | null;
  unitsId: number;
}

export interface ConsumptionLogWithRelations extends ConsumptionLog {
  brand: CalorieTrackerBrand | null;
  consumption: Consumption | null;
  unit: CalorieTrackerUnit | null;
}

export type CreateConsumptionLogInput = Omit<ConsumptionLog, 'id'>;

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } })) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  products: {
    getAll: () => get<CalorieTrackerProduct[]>('/products'),
    getById: (id: number) => get<CalorieTrackerProduct>(`/products/${id}`),
  },
  brands: {
    getAll: () => get<CalorieTrackerBrand[]>('/brands'),
  },
  consumptions: {
    getAll: () => get<Consumption[]>('/consumptions'),
  },
  units: {
    getAll: () => get<CalorieTrackerUnit[]>('/units'),
  },
  consumptionLogs: {
    getAll: () => get<ConsumptionLogWithRelations[]>('/consumption-logs'),
    create: (input: CreateConsumptionLogInput) => post<ConsumptionLog>('/consumption-logs', input),
  },
};
