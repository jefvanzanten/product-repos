import { and, asc, countDistinct, eq, isNotNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { db } from '../db/index';
import {
  brands,
  packagingTypes,
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
  productId: string;
  productTypeId: string;
  productTypeName: string;
  name: string;
  variantCount: number;
};

export type ProductVariantSearchRow = {
  id: string;
  productName: string;
  brandName: string | null;
  productTypeName: string;
  variantName: string;
  productSkuId: string | null;
  unitContentId: number | null;
  amount: number | null;
  barcode: string | null;
  packagingTypeName: string | null;
  unit: string | null;
  unitsPerPackage: number | null;
};

function contains(column: AnySQLiteColumn | SQL, query: string): SQL {
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
  const displayName = sql<string>`coalesce(${products.name}, ${brands.name})`;

  return db
    .select({
      brandId: products.brandId,
      productId: products.id,
      productTypeId: products.productTypeId,
      productTypeName: productTypes.name,
      name: displayName,
      variantCount: countDistinct(productVariants.id),
    })
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .innerJoin(productTypes, eq(products.productTypeId, productTypes.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(and(
      isNotNull(products.brandId),
      contains(brands.name, query),
    ))
    .groupBy(
      products.id,
      products.brandId,
      products.productTypeId,
      productTypes.name,
      products.name,
      brands.name,
    )
    .orderBy(asc(displayName))
    .all();
}

export function searchProductVariants(query: string): ProductVariantSearchRow[] {
  const productDisplayName =
    sql<string>`coalesce(${products.name}, ${brands.name}, ${productTypes.name})`;
  const variantDisplayName =
    sql<string>`${productDisplayName} || ' — ' || ${productVariants.name}`;

  return db
    .select({
      id: productVariants.id,
      productName: productDisplayName,
      brandName: brands.name,
      productTypeName: productTypes.name,
      variantName: productVariants.name,
      productSkuId: productSkus.id,
      unitContentId: unitContents.id,
      amount: unitContents.amount,
      barcode: productSkus.barcode,
      packagingTypeName: packagingTypes.name,
      unit: unitTypes.name,
      unitsPerPackage: productSkus.unitsPerPackage,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(productTypes, eq(products.productTypeId, productTypes.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(productSkus, eq(productSkus.productVariantId, productVariants.id))
    .leftJoin(unitContents, eq(productSkus.unitContentId, unitContents.id))
    .leftJoin(unitTypes, eq(unitContents.unitTypeId, unitTypes.id))
    .leftJoin(packagingTypes, eq(productSkus.packagingTypeId, packagingTypes.id))
    .where(or(
      contains(products.name, query),
      contains(productVariants.name, query),
      contains(variantDisplayName, query),
      contains(productTypes.name, query),
      contains(brands.name, query),
    ))
    .orderBy(
      asc(productDisplayName),
      asc(productVariants.name),
      asc(unitContents.amount),
    )
    .all();
}
