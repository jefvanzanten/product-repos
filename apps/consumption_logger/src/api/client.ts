import type { Brand, Consumption, ProductWithRelations, UnitType } from '@product-repos/contracts';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
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
};
