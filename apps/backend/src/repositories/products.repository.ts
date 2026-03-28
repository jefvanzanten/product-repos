import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { brands, consumptions, products, unitType } from '@product-repos/db-schema';
import type { CreateProductInput, UpdateProductInput } from '@product-repos/contracts';
import { db } from '../db/index';

const servingUnitAlias = alias(unitType, 'servingUnit');
const contentUnitAlias = alias(unitType, 'contentUnit');

function withRelationsQuery() {
  return db
    .select({
      id: products.id,
      consumptionsId: products.consumptionsId,
      brandId: products.brandId,
      servingContent: products.servingContent,
      servingUnitId: products.servingUnitId,
      content: products.content,
      contentunitId: products.contentunitId,
      brand: brands,
      consumption: consumptions,
      servingUnit: servingUnitAlias,
      contentUnit: contentUnitAlias,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(consumptions, eq(products.consumptionsId, consumptions.id))
    .leftJoin(servingUnitAlias, eq(products.servingUnitId, servingUnitAlias.id))
    .leftJoin(contentUnitAlias, eq(products.contentunitId, contentUnitAlias.id));
}

export function findAllProducts() {
  return withRelationsQuery().all();
}

export function findProductById(id: number) {
  return withRelationsQuery().where(eq(products.id, id)).get();
}

export function createProduct(input: CreateProductInput) {
  return db.insert(products).values(input).returning().get();
}

export function updateProduct(id: number, input: UpdateProductInput) {
  return db.update(products).set(input).where(eq(products.id, id)).returning().get();
}

export function deleteProduct(id: number) {
  return db.delete(products).where(eq(products.id, id)).returning().get();
}
