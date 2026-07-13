import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { CreateProductInput, UpdateProductInput } from '@product-repos/contracts';
import { db } from '../db/index';
import { brands, products, productTypes, unitContents, unitType } from '../db/schema';

const contentUnitTypeAlias = alias(unitType, 'contentUnitType');

function withRelationsQuery() {
  return db
    .select({
      id: products.id,
      name: products.name,
      productTypeId: products.productTypeId,
      brandId: products.brandId,
      unitContentId: products.unitContentId,
      barcode: products.barcode,
      brand: brands,
      productType: productTypes,
      unitContent: unitContents,
      unitType: contentUnitTypeAlias,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(productTypes, eq(products.productTypeId, productTypes.id))
    .leftJoin(unitContents, eq(products.unitContentId, unitContents.id))
    .leftJoin(contentUnitTypeAlias, eq(unitContents.unitTypeId, contentUnitTypeAlias.id));
}

export function findAllProducts() {
  return withRelationsQuery().all();
}

export function findProductById(id: string) {
  return withRelationsQuery().where(eq(products.id, id)).get();
}

export function createProduct(input: CreateProductInput) {
  return db.insert(products).values(input).returning().get();
}

export function updateProduct(id: string, input: UpdateProductInput) {
  return db.update(products).set(input).where(eq(products.id, id)).returning().get();
}

export function deleteProduct(id: string) {
  return db.delete(products).where(eq(products.id, id)).returning().get();
}
