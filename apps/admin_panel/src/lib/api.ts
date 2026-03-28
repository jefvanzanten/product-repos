import type {
  Brand,
  Consumption,
  CreateBrandInput,
  CreateConsumptionInput,
  CreateProductInput,
  CreateUnitTypeInput,
  Product,
  ProductWithRelations,
  UnitType,
  UpdateBrandInput,
  UpdateConsumptionInput,
  UpdateProductInput,
  UpdateUnitTypeInput,
} from '@product-repos/contracts';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  brands: {
    getAll: () => request<Brand[]>('/brands'),
    create: (body: CreateBrandInput) => request<Brand>('/brands', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: UpdateBrandInput) => request<Brand>(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<Brand>(`/brands/${id}`, { method: 'DELETE' }),
  },
  units: {
    getAll: () => request<UnitType[]>('/units'),
    create: (body: CreateUnitTypeInput) => request<UnitType>('/units', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: UpdateUnitTypeInput) => request<UnitType>(`/units/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<UnitType>(`/units/${id}`, { method: 'DELETE' }),
  },
  consumptions: {
    getAll: () => request<Consumption[]>('/consumptions'),
    create: (body: CreateConsumptionInput) => request<Consumption>('/consumptions', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: UpdateConsumptionInput) => request<Consumption>(`/consumptions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<Consumption>(`/consumptions/${id}`, { method: 'DELETE' }),
  },
  products: {
    getAll: () => request<ProductWithRelations[]>('/products'),
    create: (body: CreateProductInput) => request<Product>('/products', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: UpdateProductInput) => request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<Product>(`/products/${id}`, { method: 'DELETE' }),
  },
};
