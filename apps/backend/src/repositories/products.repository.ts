import { eq } from 'drizzle-orm';
import type { CreateProductInput, UpdateProductInput } from '@product-repos/contracts';
import { db } from '../db/index';
import { brands, products, productTypes } from '../db/schema';

function withRelationsQuery() {
  return db
    .select({
      id: products.id,
      name: products.name,
      productTypeId: products.productTypeId,
      brandId: products.brandId,
      brand: brands,
      productType: productTypes,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(productTypes, eq(products.productTypeId, productTypes.id));
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
