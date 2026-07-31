import type { ProductPackageDto, ProductPackageRequest } from "@product-repos/contracts";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { packageType, product, productMacroProfile, productPackage, unitContent, unitType } from "../db/schema";
import { err, ok, type Result } from "../domain";
import { requiredDimensionForReferenceBasis } from "../product-catalog/product-macro-profile";
import { findPackageTypeById, findUnitTypeById } from "./units.repository";

/** Minimal Drizzle executor used by package transactions and the default database. */
export type ProductPackageExecutor = Pick<typeof db, "select" | "insert">;
/** Raw package-type persistence row. */
export type PackageTypeRow = typeof packageType.$inferSelect;
/** Raw unit-type persistence row. */
export type UnitTypeRow = typeof unitType.$inferSelect;
/** Raw unit-content persistence row. */
export type UnitContentRow = typeof unitContent.$inferSelect;
/** Raw product-package persistence row. */
export type ProductPackageRow = typeof productPackage.$inferSelect;

/** Joined persistence rows required to project a product package. */
export type ProductPackageFullRow = {
  readonly productPackage: ProductPackageRow;
  readonly packageType: PackageTypeRow;
  readonly unitContent: UnitContentRow;
  readonly unitType: UnitTypeRow;
};

/** Parsed values required to insert a product package. */
export type InsertProductPackageInput = {
  readonly productId: string;
  readonly unitContentId: number;
  readonly packageTypeId: number;
  readonly unitsPerPackage: number;
};

/** Add a package when references, duplicates, and macro dimensions are valid. */
export function addProductPackage(productId: string, input: ProductPackageRequest): Result<ProductPackageDto & { readonly productId: string }> {
  if (!productExists(productId)) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const unitTypeRow = findUnitTypeById(input.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.packageTypeId);
  if (!unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });
  if (!isPackageDimensionCompatible(productId, unitTypeRow.dimension)) return err({ code: "UNIT_DIMENSION_INCOMPATIBLE", message: "Package unit dimension is incompatible with the macro profile" });

  const created = db.transaction((tx) => {
    const unitContentRow = findOrCreateUnitContent(tx, input.unitTypeId, input.amount);

    const duplicate = tx.select().from(productPackage).where(and(eq(productPackage.productId, productId), eq(productPackage.packageTypeId, input.packageTypeId), eq(productPackage.unitContentId, unitContentRow.id), eq(productPackage.unitsPerPackage, input.unitsPerPackage))).get();
    if (duplicate) return { duplicate: true as const, unitContentRow, productPackageRow: duplicate };

    return { duplicate: false as const, unitContentRow, productPackageRow: insertProductPackage(tx, { productId, unitContentId: unitContentRow.id, packageTypeId: input.packageTypeId, unitsPerPackage: input.unitsPerPackage }) };
  });

  if (created.duplicate) return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });
  return ok({ productId, ...toProductPackageDto({ productPackage: created.productPackageRow, packageType: packageTypeRow, unitContent: created.unitContentRow, unitType: unitTypeRow }) });
}

/** Read one package belonging to a product. */
export function getProductPackage(productId: string, packageId: number): Result<ProductPackageDto & { readonly productId: string }> {
  if (!productExists(productId)) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
  const fullRow = findProductPackageFullRow(productId, packageId);
  if (!fullRow) return err({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });
  return ok({ productId, ...toProductPackageDto(fullRow) });
}

/** Update a package when references, duplicates, and macro dimensions are valid. */
export function updateProductPackage(productId: string, packageId: number, input: ProductPackageRequest): Result<ProductPackageDto & { readonly productId: string }> {
  if (!productExists(productId)) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
  const existingPackage = db.select().from(productPackage).where(and(eq(productPackage.id, packageId), eq(productPackage.productId, productId))).get();
  if (!existingPackage) return err({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });

  const unitTypeRow = findUnitTypeById(input.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.packageTypeId);
  if (!unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });
  if (!isPackageDimensionCompatible(productId, unitTypeRow.dimension)) return err({ code: "UNIT_DIMENSION_INCOMPATIBLE", message: "Package unit dimension is incompatible with the macro profile" });

  const updated = db.transaction((tx) => {
    const unitContentRow = findOrCreateUnitContent(tx, input.unitTypeId, input.amount);

    const duplicate = tx.select().from(productPackage).where(sql`${productPackage.id} <> ${packageId} AND ${productPackage.productId} = ${productId} AND ${productPackage.packageTypeId} = ${input.packageTypeId} AND ${productPackage.unitContentId} = ${unitContentRow.id} AND ${productPackage.unitsPerPackage} = ${input.unitsPerPackage}`).get();
    if (duplicate) return { duplicate: true as const, unitContentRow, productPackageRow: duplicate };

    return { duplicate: false as const, unitContentRow, productPackageRow: tx.update(productPackage).set({
      packageTypeId: input.packageTypeId,
      individualPackageTypeId: input.unitsPerPackage > 1 ? input.packageTypeId : null,
      unitContentId: unitContentRow.id,
      unitsPerPackage: input.unitsPerPackage,
      updatedAt: new Date().toISOString(),
    }).where(eq(productPackage.id, packageId)).returning().get() };
  });

  if (updated.duplicate) return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });
  return ok({ productId, ...toProductPackageDto({ productPackage: updated.productPackageRow, packageType: packageTypeRow, unitContent: updated.unitContentRow, unitType: unitTypeRow }) });
}

/** Find or create canonical unit content through the active executor. */
export function findOrCreateUnitContent(executor: ProductPackageExecutor, unitTypeId: number, amount: string): UnitContentRow {
  const existing = executor.select().from(unitContent).where(and(eq(unitContent.unitTypeId, unitTypeId), eq(unitContent.amount, amount))).get();
  if (existing) return existing;
  return executor.insert(unitContent).values({ unitTypeId, amount }).returning().get();
}

/** Insert one product package through the active executor. */
export function insertProductPackage(executor: ProductPackageExecutor, input: InsertProductPackageInput): ProductPackageRow {
  return executor.insert(productPackage).values({
    ...input,
    individualPackageTypeId: input.unitsPerPackage > 1 ? input.packageTypeId : null,
  }).returning().get();
}

/** Read all package relation rows for one product. */
export function findProductPackageFullRows(productId: string): ProductPackageFullRow[] {
  return db.select({ productPackage, packageType, unitContent, unitType })
    .from(productPackage)
    .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
    .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
    .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
    .where(eq(productPackage.productId, productId))
    .all();
}

/** Read one package relation row for one product. */
export function findProductPackageFullRow(productId: string, packageId: number): ProductPackageFullRow | undefined {
  return db.select({ productPackage, packageType, unitContent, unitType })
    .from(productPackage)
    .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
    .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
    .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
    .where(and(eq(productPackage.productId, productId), eq(productPackage.id, packageId)))
    .get();
}

/** Project package persistence rows into the public protocol shape. */
export function toProductPackageDto(row: ProductPackageFullRow): ProductPackageDto {
  return {
    id: row.productPackage.id,
    packageType: { id: row.packageType.id, name: row.packageType.name },
    unitContent: {
      id: row.unitContent.id,
      amount: String(row.unitContent.amount),
      unitType: {
        id: row.unitType.id,
        name: row.unitType.name,
        symbol: row.unitType.symbol,
        dimension: row.unitType.dimension,
        conversionToBase: String(row.unitType.conversionToBase),
      },
    },
    unitsPerPackage: row.productPackage.unitsPerPackage,
    summary: formatPackageSummary(row.productPackage, row.packageType, row.unitContent, row.unitType),
  };
}

/** Check whether a product exists before package operations. */
function productExists(productId: string): boolean {
  return db.select({ id: product.id }).from(product).where(eq(product.id, productId)).get() !== undefined;
}

/** Check a package dimension against the product's optional macro profile. */
function isPackageDimensionCompatible(productId: string, dimension: UnitTypeRow["dimension"]): boolean {
  const profile = db.select({ referenceBasis: productMacroProfile.referenceBasis }).from(productMacroProfile).where(eq(productMacroProfile.productId, productId)).get();
  return !profile || requiredDimensionForReferenceBasis(profile.referenceBasis) === dimension;
}

/** Format a product package summary for catalog display. */
function formatPackageSummary(productPackageRow: ProductPackageRow, packageTypeRow: PackageTypeRow, unitContentRow: UnitContentRow, unitTypeRow: UnitTypeRow): string {
  const amount = String(unitContentRow.amount);
  if (productPackageRow.unitsPerPackage <= 1) return `${packageTypeRow.name} ${amount} ${unitTypeRow.name}`;
  return `${packageTypeRow.name} ${productPackageRow.unitsPerPackage} x ${amount} ${unitTypeRow.name}`;
}
