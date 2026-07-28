import { type ProductCreatedDto, type ProductDetailDto } from "@product-repos/contracts";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { product, productPackage, unitContent } from "../db/schema";
import { err, ok, type Result } from "../domain";
import { findBrandById } from "./brands.repository";
import { findCategoryById, findCategoryPath } from "./category.repository";
import { isSqliteUniqueConstraintViolation } from "../helpers/sqlite-errors";
import { findPackageTypeById, findUnitTypeById } from "./units.repository";
import { findProductPackages, makeProductPackageDto } from "./product-packages.repository";

export type CreateProductInput = {
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
  readonly package: { readonly packageTypeId: number; readonly amount: string; readonly unitTypeId: number; readonly unitsPerPackage: number };
};

export type UpdateProductInput = {
  readonly productId: string;
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
};

export function createProduct(input: CreateProductInput): Result<ProductCreatedDto> {
  const categoryRow = findCategoryById(input.categoryId);
  const brandRow = input.brandId === null ? null : findBrandById(input.brandId);
  const unitTypeRow = findUnitTypeById(input.package.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.package.packageTypeId);
  if (!categoryRow || (input.brandId !== null && !brandRow) || !unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const duplicate = findDuplicateProduct(input);
  if (duplicate) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: duplicate.id });

  const created = (() => {
    try {
      return ok(db.transaction((tx) => {
        const amountNumber = Number(input.package.amount);
        let unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.package.unitTypeId), eq(unitContent.amount, amountNumber))).get();
        if (!unitContentRow) {
          try {
            unitContentRow = tx.insert(unitContent).values({ unitTypeId: input.package.unitTypeId, amount: amountNumber }).returning().get();
          } catch (error) {
            if (!isSqliteUniqueConstraintViolation(error)) throw error;
            unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.package.unitTypeId), eq(unitContent.amount, amountNumber))).get();
            if (!unitContentRow) throw error;
          }
        }
        const productRow = tx.insert(product).values({ name: input.name, categoryId: input.categoryId, brandId: input.brandId }).returning().get();
        const productPackageRow = tx.insert(productPackage).values({ productId: productRow.id, unitContentId: unitContentRow.id, packageTypeId: input.package.packageTypeId, unitsPerPackage: input.package.unitsPerPackage }).returning().get();
        return { productRow, unitContentRow, productPackageRow };
      }));
    } catch (error) {
      if (!isSqliteUniqueConstraintViolation(error)) throw error;
      const existingProduct = findDuplicateProduct(input);
      return existingProduct
        ? err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: existingProduct.id })
        : err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists" });
    }
  })();
  if (!created.ok) return created;

  return ok({
    id: created.value.productRow.id,
    name: created.value.productRow.name,
    category: { id: categoryRow.id, name: categoryRow.name, parentId: categoryRow.parentId },
    brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
    package: makeProductPackageDto({
      id: created.value.productPackageRow.id,
      packageType: { id: packageTypeRow.id, name: packageTypeRow.name },
      unitContent: { id: created.value.unitContentRow.id, amount: input.package.amount, unitType: { id: unitTypeRow.id, name: unitTypeRow.name } },
      unitsPerPackage: created.value.productPackageRow.unitsPerPackage,
    }),
  });
}

/** Update product identity fields and return the refreshed detail projection. */
export function updateProduct(input: UpdateProductInput): Result<ProductDetailDto> {
  const productRow = db.select().from(product).where(eq(product.id, input.productId)).get();
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const categoryRow = findCategoryById(input.categoryId);
  const brandRow = input.brandId === null ? null : findBrandById(input.brandId);
  if (!categoryRow || (input.brandId !== null && !brandRow)) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const duplicate = findDuplicateProduct(input, input.productId);
  if (duplicate) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: duplicate.id });

  try {
    db.update(product)
      .set({ name: input.name, categoryId: input.categoryId, brandId: input.brandId })
      .where(eq(product.id, input.productId))
      .run();
  } catch (error) {
    if (!isSqliteUniqueConstraintViolation(error)) throw error;
    const existingProduct = findDuplicateProduct(input, input.productId);
    return existingProduct
      ? err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: existingProduct.id })
      : err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists" });
  }

  return findProductDetailById(input.productId);
}

/** Find one product detail projection by product UUID. */
export function findProductDetailById(productId: string): Result<ProductDetailDto> {
  const productRow = db.select().from(product).where(eq(product.id, productId)).get();
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const categoryRow = findCategoryById(productRow.categoryId);
  const brandRow = productRow.brandId === null ? null : findBrandById(productRow.brandId);
  if (!categoryRow || (productRow.brandId !== null && !brandRow)) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  return ok({
    id: productRow.id,
    name: productRow.name,
    displayName: formatProductDisplayName(productRow.name, brandRow?.name ?? null),
    category: { id: categoryRow.id, name: categoryRow.name, parentId: categoryRow.parentId },
    categoryPath: findCategoryPath(categoryRow.id),
    brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
    packages: findProductPackages(productRow.id),
  });
}

type ProductIdentityInput = {
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
};

function findDuplicateProduct(input: ProductIdentityInput, excludedProductId?: string): typeof product.$inferSelect | undefined {
  const normalizedName = input.name.trim().toLowerCase();
  const rows = input.brandId === null
    ? db.select().from(product).where(sql`${product.brandId} IS NULL AND ${product.categoryId} = ${input.categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).all()
    : db.select().from(product).where(sql`${product.brandId} = ${input.brandId} AND ${product.categoryId} = ${input.categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).all();
  return rows.find((row) => row.id !== excludedProductId);
}

function formatProductDisplayName(name: string, brandName: string | null): string {
  return brandName ? `${brandName} ${name}` : name;
}
