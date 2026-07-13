import { eq } from 'drizzle-orm';
import type { CreateBrandInput, UpdateBrandInput } from '@product-repos/contracts';
import { db } from '../db/index';
import { brands } from '../db/schema';

export function findAllBrands() {
  return db.select().from(brands).all();
}

export function findBrandById(id: string) {
  return db.select().from(brands).where(eq(brands.id, id)).get();
}

export function createBrand(input: CreateBrandInput) {
  return db.insert(brands).values(input).returning().get();
}

export function updateBrand(id: string, input: UpdateBrandInput) {
  return db.update(brands).set(input).where(eq(brands.id, id)).returning().get();
}

export function deleteBrand(id: string) {
  return db.delete(brands).where(eq(brands.id, id)).returning().get();
}
