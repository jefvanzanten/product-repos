import { eq } from 'drizzle-orm';
import type { CreateProductTypeInput, UpdateProductTypeInput } from '@product-repos/contracts/product-types';
import { db } from '../db/index';
import { productTypes } from '../db/schema';

export function findAllProductTypes() {
  return db.select().from(productTypes).all();
}

export function findProductTypeById(id: string) {
  return db.select().from(productTypes).where(eq(productTypes.id, id)).get();
}

export function findProductTypeByName(name: string) {
  return db.select().from(productTypes).where(eq(productTypes.name, name)).get();
}

export function createProductType(input: CreateProductTypeInput) {
  return db.insert(productTypes).values(input).returning().get();
}

export function updateProductType(id: string, input: UpdateProductTypeInput) {
  return db.update(productTypes).set(input).where(eq(productTypes.id, id)).returning().get();
}

export function deleteProductType(id: string) {
  return db.delete(productTypes).where(eq(productTypes.id, id)).returning().get();
}
