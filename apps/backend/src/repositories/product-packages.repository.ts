import type { ProductPackageDto, ProductPackageRequest } from "@product-repos/contracts";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { packageType, product, productPackage, unitContent, unitType } from "../db/schema";
import { err, ok, type Result } from "../domain";
import { findPackageTypeById, findUnitTypeById } from "./units.repository";

export type ProductPackageExecutor = Pick<typeof db, "select" | "insert">;
export type PackageTypeRow = typeof packageType.$inferSelect;
export type UnitTypeRow = typeof unitType.$inferSelect;
export type UnitContentRow = typeof unitContent.$inferSelect;
export type ProductPackageRow = typeof productPackage.$inferSelect;

export type ProductPackageFullRow = {
  readonly productPackage: ProductPackageRow;
  readonly packageType: PackageTypeRow;
  readonly unitContent: UnitContentRow;
  readonly unitType: UnitTypeRow;
};

export type InsertProductPackageInput = {
  readonly productId: string;
  readonly unitContentId: number;
  readonly packageTypeId: number;
  readonly unitsPerPackage: number;
};

export function addProductPackage(productId: string, input: ProductPackageRequest): Result<ProductPackageDto & { readonly productId: string }> {
  if (!productExists(productId)) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const unitTypeRow = findUnitTypeById(input.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.packageTypeId);
  if (!unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const amountNumber = Number(input.amount);
  const created = db.transaction((tx) => {
    const unitContentRow = findOrCreateUnitContent(tx, input.unitTypeId, amountNumber);

    const duplicate = tx.select().from(productPackage).where(and(eq(productPackage.productId, productId), eq(productPackage.packageTypeId, input.packageTypeId), eq(productPackage.unitContentId, unitContentRow.id), eq(productPackage.unitsPerPackage, input.unitsPerPackage))).get();
    if (duplicate) return { duplicate: true as const, unitContentRow, productPackageRow: duplicate };

    return { duplicate: false as const, unitContentRow, productPackageRow: insertProductPackage(tx, { productId, unitContentId: unitContentRow.id, packageTypeId: input.packageTypeId, unitsPerPackage: input.unitsPerPackage }) };
  });

  if (created.duplicate) return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });
  return ok({ productId, ...toProductPackageDto({ productPackage: created.productPackageRow, packageType: packageTypeRow, unitContent: created.unitContentRow, unitType: unitTypeRow }) });
}

export function getProductPackage(productId: string, packageId: number): Result<ProductPackageDto & { readonly productId: string }> {
  if (!productExists(productId)) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
  const fullRow = findProductPackageFullRow(productId, packageId);
  if (!fullRow) return err({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });
  return ok({ productId, ...toProductPackageDto(fullRow) });
}

export function updateProductPackage(productId: string, packageId: number, input: ProductPackageRequest): Result<ProductPackageDto & { readonly productId: string }> {
  if (!productExists(productId)) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
  const existingPackage = db.select().from(productPackage).where(and(eq(productPackage.id, packageId), eq(productPackage.productId, productId))).get();
  if (!existingPackage) return err({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });

  const unitTypeRow = findUnitTypeById(input.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.packageTypeId);
  if (!unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const amountNumber = Number(input.amount);
  const updated = db.transaction((tx) => {
    const unitContentRow = findOrCreateUnitContent(tx, input.unitTypeId, amountNumber);

    const duplicate = tx.select().from(productPackage).where(sql`${productPackage.id} <> ${packageId} AND ${productPackage.productId} = ${productId} AND ${productPackage.packageTypeId} = ${input.packageTypeId} AND ${productPackage.unitContentId} = ${unitContentRow.id} AND ${productPackage.unitsPerPackage} = ${input.unitsPerPackage}`).get();
    if (duplicate) return { duplicate: true as const, unitContentRow, productPackageRow: duplicate };

    return { duplicate: false as const, unitContentRow, productPackageRow: tx.update(productPackage).set({ packageTypeId: input.packageTypeId, unitContentId: unitContentRow.id, unitsPerPackage: input.unitsPerPackage }).where(eq(productPackage.id, packageId)).returning().get() };
  });

  if (updated.duplicate) return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });
  return ok({ productId, ...toProductPackageDto({ productPackage: updated.productPackageRow, packageType: packageTypeRow, unitContent: updated.unitContentRow, unitType: unitTypeRow }) });
}

export function findOrCreateUnitContent(executor: ProductPackageExecutor, unitTypeId: number, amount: number): UnitContentRow {
  const existing = executor.select().from(unitContent).where(and(eq(unitContent.unitTypeId, unitTypeId), eq(unitContent.amount, amount))).get();
  if (existing) return existing;
  return executor.insert(unitContent).values({ unitTypeId, amount }).returning().get();
}

export function insertProductPackage(executor: ProductPackageExecutor, input: InsertProductPackageInput): ProductPackageRow {
  return executor.insert(productPackage).values(input).returning().get();
}

export function findProductPackageFullRows(productId: string): ProductPackageFullRow[] {
  return db.select({ productPackage, packageType, unitContent, unitType })
    .from(productPackage)
    .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
    .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
    .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
    .where(eq(productPackage.productId, productId))
    .all();
}

export function findProductPackageFullRow(productId: string, packageId: number): ProductPackageFullRow | undefined {
  return db.select({ productPackage, packageType, unitContent, unitType })
    .from(productPackage)
    .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
    .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
    .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
    .where(and(eq(productPackage.productId, productId), eq(productPackage.id, packageId)))
    .get();
}

export function toProductPackageDto(row: ProductPackageFullRow): ProductPackageDto {
  return {
    id: row.productPackage.id,
    packageType: { id: row.packageType.id, name: row.packageType.name },
    unitContent: { id: row.unitContent.id, amount: String(row.unitContent.amount), unitType: { id: row.unitType.id, name: row.unitType.name } },
    unitsPerPackage: row.productPackage.unitsPerPackage,
    summary: formatPackageSummary(row.productPackage, row.packageType, row.unitContent, row.unitType),
  };
}

function productExists(productId: string): boolean {
  return db.select({ id: product.id }).from(product).where(eq(product.id, productId)).get() !== undefined;
}

function formatPackageSummary(productPackageRow: ProductPackageRow, packageTypeRow: PackageTypeRow, unitContentRow: UnitContentRow, unitTypeRow: UnitTypeRow): string {
  const amount = String(unitContentRow.amount);
  if (productPackageRow.unitsPerPackage <= 1) return `${packageTypeRow.name} ${amount} ${unitTypeRow.name}`;
  return `${packageTypeRow.name} ${productPackageRow.unitsPerPackage} x ${amount} ${unitTypeRow.name}`;
}
