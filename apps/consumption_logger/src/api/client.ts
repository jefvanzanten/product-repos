import type { Brand, Consumption, ConsumptionLog, ConsumptionLogWithRelations, CreateConsumptionLogInput, ProductWithRelations, UnitType } from '@product-repos/contracts';

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
    getAll: () => get<ProductWithRelations[]>('/products'),
    getById: (id: number) => get<ProductWithRelations>(`/products/${id}`),
  },
  brands: {
    getAll: () => get<Brand[]>('/brands'),
  },
  consumptions: {
    getAll: () => get<Consumption[]>('/consumptions'),
  },
  units: {
    getAll: () => get<UnitType[]>('/units'),
  },
  consumptionLogs: {
    getAll: () => get<ConsumptionLogWithRelations[]>('/consumption-logs'),
    create: (input: CreateConsumptionLogInput) => post<ConsumptionLog>('/consumption-logs', input),
  },
};
