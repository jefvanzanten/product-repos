import type { ProductCreatedDto } from "@product-repos/contracts";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { product, productPackage, unitContent } from "../db/schema";
import { err, ok, type Result } from "../domain";
import { findBrandById } from "./brands.repository";
import { findCategoryById } from "./category.repository";
import { findPackageTypeById, findUnitTypeById } from "./units.repository";

export type CreateProductInput = {
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
  readonly package: { readonly packageTypeId: number; readonly amount: string; readonly unitTypeId: number; readonly unitsPerPackage: number };
};

export function createProduct(input: CreateProductInput): Result<ProductCreatedDto> {
  const categoryRow = findCategoryById(input.categoryId);
  const brandRow = input.brandId === null ? null : findBrandById(input.brandId);
  const unitTypeRow = findUnitTypeById(input.package.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.package.packageTypeId);
  if (!categoryRow || (input.brandId !== null && !brandRow) || !unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const normalizedName = input.name.trim().toLowerCase();
  const duplicate = input.brandId === null
    ? db.select().from(product).where(sql`${product.brandId} IS NULL AND ${product.categoryId} = ${input.categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).get()
    : db.select().from(product).where(sql`${product.brandId} = ${input.brandId} AND ${product.categoryId} = ${input.categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).get();
  if (duplicate) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: duplicate.id });

  const created = db.transaction((tx) => {
    const amountNumber = Number(input.package.amount);
    let unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.package.unitTypeId), eq(unitContent.amount, amountNumber))).get();
    if (!unitContentRow) unitContentRow = tx.insert(unitContent).values({ unitTypeId: input.package.unitTypeId, amount: amountNumber }).returning().get();
    const productRow = tx.insert(product).values({ name: input.name, categoryId: input.categoryId, brandId: input.brandId }).returning().get();
    const productPackageRow = tx.insert(productPackage).values({ productId: productRow.id, unitContentId: unitContentRow.id, packageTypeId: input.package.packageTypeId, unitsPerPackage: input.package.unitsPerPackage }).returning().get();
    return { productRow, unitContentRow, productPackageRow };
  });

  return ok({
    id: created.productRow.id,
    name: created.productRow.name,
    category: { id: categoryRow.id, name: categoryRow.name, parentId: categoryRow.parentId },
    brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
    package: {
      id: created.productPackageRow.id,
      packageType: { id: packageTypeRow.id, name: packageTypeRow.name },
      unitContent: { id: created.unitContentRow.id, amount: input.package.amount, unitType: { id: unitTypeRow.id, name: unitTypeRow.name } },
      unitsPerPackage: created.productPackageRow.unitsPerPackage,
    },
  });
}
