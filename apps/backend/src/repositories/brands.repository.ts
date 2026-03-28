import { eq } from 'drizzle-orm';
import { brands } from '@product-repos/db-schema';
import type { CreateBrandInput, UpdateBrandInput } from '@product-repos/contracts';
import { db } from '../db/index';

export function findAllBrands() {
  return db.select().from(brands).all();
}

export function findBrandById(id: number) {
  return db.select().from(brands).where(eq(brands.id, id)).get();
}

export function createBrand(input: CreateBrandInput) {
  return db.insert(brands).values(input).returning().get();
}

export function updateBrand(id: number, input: UpdateBrandInput) {
  return db.update(brands).set(input).where(eq(brands.id, id)).returning().get();
}

export function deleteBrand(id: number) {
  return db.delete(brands).where(eq(brands.id, id)).returning().get();
}
