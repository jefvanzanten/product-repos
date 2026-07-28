import { formatProductPackageSummary, type ProductPackageCoreDto, type ProductPackageDetailDto, type ProductPackageDto } from "@product-repos/contracts";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { packageType, product, productPackage, unitContent, unitType } from "../db/schema";
import { err, ok, type Result } from "../domain";
import { isSqliteUniqueConstraintViolation } from "../helpers/sqlite-errors";
import { findPackageTypeById, findUnitTypeById } from "./units.repository";

export type ProductPackageMutationInput = {
  readonly productId: string;
  readonly packageTypeId: number;
  readonly amount: string;
  readonly unitTypeId: number;
  readonly unitsPerPackage: number;
};

export type UpdateProductPackageInput = ProductPackageMutationInput & {
  readonly packageId: string;
};

/** Create one package for an existing product and return its detail projection. */
export function createProductPackage(input: ProductPackageMutationInput): Result<ProductPackageDetailDto> {
  const productRow = db.select({ id: product.id }).from(product).where(eq(product.id, input.productId)).get();
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const unitTypeRow = findUnitTypeById(input.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.packageTypeId);
  if (!unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const created = (() => {
    try {
      return db.transaction((tx): Result<{ readonly productPackageId: string }> => {
        const amountNumber = Number(input.amount);
        let unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.unitTypeId), eq(unitContent.amount, amountNumber))).get();
        if (!unitContentRow) {
          try {
            unitContentRow = tx.insert(unitContent).values({ unitTypeId: input.unitTypeId, amount: amountNumber }).returning().get();
          } catch (error) {
            if (!isSqliteUniqueConstraintViolation(error)) throw error;
            unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.unitTypeId), eq(unitContent.amount, amountNumber))).get();
            if (!unitContentRow) throw error;
          }
        }

        const duplicate = tx.select({ id: productPackage.id })
          .from(productPackage)
          .where(and(
            eq(productPackage.productId, input.productId),
            eq(productPackage.packageTypeId, input.packageTypeId),
            eq(productPackage.unitContentId, unitContentRow.id),
            eq(productPackage.unitsPerPackage, input.unitsPerPackage),
          ))
          .get();
        if (duplicate) return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });

        const productPackageRow = tx.insert(productPackage)
          .values({ productId: input.productId, unitContentId: unitContentRow.id, packageTypeId: input.packageTypeId, unitsPerPackage: input.unitsPerPackage })
          .returning({ id: productPackage.id })
          .get();
        return ok({ productPackageId: productPackageRow.id });
      });
    } catch (error) {
      if (!isSqliteUniqueConstraintViolation(error)) throw error;
      return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });
    }
  })();
  if (!created.ok) return created;

  return findProductPackageDetailById(input.productId, created.value.productPackageId);
}

/** Find one package detail projection for a product/package pair. */
export function findProductPackageDetailById(productId: string, packageId: string): Result<ProductPackageDetailDto> {
  const productRow = db.select({ id: product.id }).from(product).where(eq(product.id, productId)).get();
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const packageDto = findProductPackageByProductId(productId, packageId);
  if (!packageDto) return err({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });
  return ok(packageDto);
}

/** Update one package and return its refreshed detail projection. */
export function updateProductPackage(input: UpdateProductPackageInput): Result<ProductPackageDetailDto> {
  const productRow = db.select({ id: product.id }).from(product).where(eq(product.id, input.productId)).get();
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const currentPackage = db.select({ id: productPackage.id }).from(productPackage).where(and(eq(productPackage.id, input.packageId), eq(productPackage.productId, input.productId))).get();
  if (!currentPackage) return err({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });

  const unitTypeRow = findUnitTypeById(input.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.packageTypeId);
  if (!unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const updated = (() => {
    try {
      return db.transaction((tx): Result<{ readonly packageId: string }> => {
        const amountNumber = Number(input.amount);
        let unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.unitTypeId), eq(unitContent.amount, amountNumber))).get();
        if (!unitContentRow) {
          try {
            unitContentRow = tx.insert(unitContent).values({ unitTypeId: input.unitTypeId, amount: amountNumber }).returning().get();
          } catch (error) {
            if (!isSqliteUniqueConstraintViolation(error)) throw error;
            unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.unitTypeId), eq(unitContent.amount, amountNumber))).get();
            if (!unitContentRow) throw error;
          }
        }

        const duplicate = tx.select({ id: productPackage.id })
          .from(productPackage)
          .where(and(
            eq(productPackage.productId, input.productId),
            eq(productPackage.packageTypeId, input.packageTypeId),
            eq(productPackage.unitContentId, unitContentRow.id),
            eq(productPackage.unitsPerPackage, input.unitsPerPackage),
          ))
          .all()
          .find((row) => row.id !== input.packageId);
        if (duplicate) return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });

        tx.update(productPackage)
          .set({ packageTypeId: input.packageTypeId, unitContentId: unitContentRow.id, unitsPerPackage: input.unitsPerPackage })
          .where(and(eq(productPackage.id, input.packageId), eq(productPackage.productId, input.productId)))
          .run();
        return ok({ packageId: input.packageId });
      });
    } catch (error) {
      if (!isSqliteUniqueConstraintViolation(error)) throw error;
      return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });
    }
  })();
  if (!updated.ok) return updated;

  return findProductPackageDetailById(input.productId, updated.value.packageId);
}

export function findProductPackages(productId: string): ProductPackageDto[] {
  const rows = db.select({
    id: productPackage.id,
    packageTypeId: packageType.id,
    packageTypeName: packageType.name,
    unitContentId: unitContent.id,
    amount: unitContent.amount,
    unitTypeId: unitType.id,
    unitTypeName: unitType.name,
    unitsPerPackage: productPackage.unitsPerPackage,
  })
    .from(productPackage)
    .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
    .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
    .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
    .where(eq(productPackage.productId, productId))
    .orderBy(asc(sql`lower(${packageType.name})`), asc(unitContent.amount), asc(productPackage.unitsPerPackage))
    .all();

  return rows.map((row) => makeProductPackageDto({
    id: row.id,
    packageType: { id: row.packageTypeId, name: row.packageTypeName },
    unitContent: { id: row.unitContentId, amount: String(row.amount), unitType: { id: row.unitTypeId, name: row.unitTypeName } },
    unitsPerPackage: row.unitsPerPackage,
  }));
}

export function makeProductPackageDto(packageDto: ProductPackageCoreDto): ProductPackageDto {
  return { ...packageDto, summary: formatProductPackageSummary(packageDto) };
}

function findProductPackageByProductId(productId: string, packageId: string): ProductPackageDetailDto | undefined {
  const row = db.select({
    id: productPackage.id,
    productId: productPackage.productId,
    packageTypeId: packageType.id,
    packageTypeName: packageType.name,
    unitContentId: unitContent.id,
    amount: unitContent.amount,
    unitTypeId: unitType.id,
    unitTypeName: unitType.name,
    unitsPerPackage: productPackage.unitsPerPackage,
  })
    .from(productPackage)
    .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
    .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
    .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
    .where(and(eq(productPackage.id, packageId), eq(productPackage.productId, productId)))
    .get();

  if (!row) return undefined;
  return {
    ...makeProductPackageDto({
      id: row.id,
      packageType: { id: row.packageTypeId, name: row.packageTypeName },
      unitContent: { id: row.unitContentId, amount: String(row.amount), unitType: { id: row.unitTypeId, name: row.unitTypeName } },
      unitsPerPackage: row.unitsPerPackage,
    }),
    productId: row.productId,
  };
}
