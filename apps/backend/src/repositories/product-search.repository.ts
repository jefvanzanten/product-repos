import { and, asc, countDistinct, eq, isNotNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { db } from '../db/index';
import {
  brands,
  productSkus,
  products,
  productTypes,
  productVariants,
  unitContents,
  unitTypes,
} from '../db/schema';

export type ProductTypeSearchRow = {
  id: string;
  name: string;
  brandProductCount: number;
};

export type BrandProductSearchRow = {
  brandId: string | null;
  productTypeId: string;
  name: string;
  variantCount: number;
};

export type ProductVariantSearchRow = {
  id: string;
  productName: string;
  variantName: string;
  unitContentId: number | null;
  amount: number | null;
  unit: string | null;
};

function contains(column: AnySQLiteColumn, query: string): SQL {
  return sql`instr(lower(${column}), lower(${query})) > 0`;
}

export function searchProductTypes(query: string): ProductTypeSearchRow[] {
  return db
    .select({
      id: productTypes.id,
      name: productTypes.name,
      brandProductCount: countDistinct(products.id),
    })
    .from(productTypes)
    .leftJoin(products, eq(products.productTypeId, productTypes.id))
    .where(contains(productTypes.name, query))
    .groupBy(productTypes.id, productTypes.name)
    .orderBy(asc(productTypes.name))
    .all();
}

export function searchBrandProducts(query: string): BrandProductSearchRow[] {
  return db
    .select({
      brandId: products.brandId,
      productTypeId: products.productTypeId,
      name: products.name,
      variantCount: countDistinct(productVariants.id),
    })
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .innerJoin(productTypes, eq(products.productTypeId, productTypes.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(and(
      isNotNull(products.brandId),
      or(
        contains(products.name, query),
        contains(brands.name, query),
        contains(productTypes.name, query),
      ),
    ))
    .groupBy(products.brandId, products.productTypeId, products.name)
    .orderBy(asc(products.name))
    .all();
}

export function searchProductVariants(query: string): ProductVariantSearchRow[] {
  return db
    .select({
      id: productVariants.id,
      productName: products.name,
      variantName: productVariants.name,
      unitContentId: unitContents.id,
      amount: unitContents.amount,
      unit: unitTypes.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(productTypes, eq(products.productTypeId, productTypes.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(productSkus, eq(productSkus.productVariantId, productVariants.id))
    .leftJoin(unitContents, eq(productSkus.unitContentId, unitContents.id))
    .leftJoin(unitTypes, eq(unitContents.unitTypeId, unitTypes.id))
    .where(or(
      contains(products.name, query),
      contains(productVariants.name, query),
      contains(productTypes.name, query),
      contains(brands.name, query),
    ))
    .orderBy(asc(products.name), asc(productVariants.name), asc(unitContents.amount))
    .all();
}
