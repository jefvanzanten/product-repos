import type { ProductPackageDto, ProductPackagePortionRequest, ProductPackageRequest } from "@product-repos/contracts";
import { and, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { BackendDatabase } from "../../../db/index.ts";
import { consumptionLog, packageType, product, productConsumption, productMacroProfile, productPackage, productPackagePortion, unitContent, unitType } from "../../../db/schema";
import { err, ok, type Result } from "../domain/catalog-domain.ts";
import { requiredDimensionForReferenceBasis } from "../domain/product-macro-profile.ts";
import type { ReferenceDataRepository } from "./units.repository.ts";

/** Minimal Drizzle executor used by package transactions and the default database. */
export type ProductPackageExecutor = Pick<BackendDatabase, "select" | "insert" | "update" | "delete">;
/** Raw package-type persistence row. */
export type PackageTypeRow = typeof packageType.$inferSelect;
/** Raw unit-type persistence row. */
export type UnitTypeRow = typeof unitType.$inferSelect;
/** Raw unit-content persistence row. */
export type UnitContentRow = typeof unitContent.$inferSelect;
/** Raw product-package persistence row. */
export type ProductPackageRow = typeof productPackage.$inferSelect;
/** Raw package-portion persistence row. */
export type ProductPackagePortionRow = typeof productPackagePortion.$inferSelect;

/** Joined persistence rows required to project a product package. */
export type ProductPackageFullRow = {
  readonly productPackage: ProductPackageRow;
  readonly packageType: PackageTypeRow;
  readonly unitContent: UnitContentRow;
  readonly unitType: UnitTypeRow;
  readonly portion: ProductPackagePortionRow | null;
  readonly portionUnitContent: UnitContentRow | null;
  readonly portionUnitType: UnitTypeRow | null;
};

/** Parsed values required to insert a product package. */
export type InsertProductPackageInput = {
  readonly productId: string;
  readonly unitContentId: number;
  readonly packageTypeId: number;
  readonly imageUrl?: string | null;
};

/** Product-package persistence operations required by current catalog use cases. */
export type ProductPackageRepository = {
  readonly addProductPackage: (productId: string, input: ProductPackageRequest) => Result<ProductPackageDto & { readonly productId: string }>;
  readonly getProductPackage: (productId: string, packageId: number) => Result<ProductPackageDto & { readonly productId: string }>;
  readonly updateProductPackage: (productId: string, packageId: number, input: ProductPackageRequest) => Result<ProductPackageDto & { readonly productId: string }>;
  readonly findOrCreateUnitContent: (executor: ProductPackageExecutor, unitTypeId: number, amount: string) => UnitContentRow;
  readonly insertProductPackage: (executor: ProductPackageExecutor, input: InsertProductPackageInput) => ProductPackageRow;
  readonly persistProductPackagePortion: (executor: ProductPackageExecutor, productPackageId: number, portion: ProductPackagePortionRequest | null) => void;
  readonly findProductPackageFullRows: (productId: string) => ProductPackageFullRow[];
  readonly findProductPackageFullRow: (productId: string, packageId: number) => ProductPackageFullRow | undefined;
  readonly toProductPackageDto: (row: ProductPackageFullRow) => ProductPackageDto;
};

/** Create product-package persistence operations for one injected database. */
export function createDrizzleProductPackageRepository(
  database: BackendDatabase,
  referenceData: Pick<ReferenceDataRepository, "findPackageTypeById" | "findUnitTypeById">,
): ProductPackageRepository {
  const { findPackageTypeById, findUnitTypeById } = referenceData;

/** Add a package when references, duplicates, portions, and macro dimensions are valid. */
function addProductPackage(productId: string, input: ProductPackageRequest): Result<ProductPackageDto & { readonly productId: string }> {
  if (!productExists(productId)) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const references = findPackageReferences(input);
  if (!references.ok) return references;
  if (!isPackageDimensionCompatible(productId, references.value.unitTypeRow.dimension)) {
    return err({ code: "UNIT_DIMENSION_INCOMPATIBLE", message: "Package unit dimension is incompatible with the macro profile" });
  }

  const created = database.transaction((tx) => {
    const totalUnitContent = findOrCreateUnitContent(tx, input.unitTypeId, input.amount);
    const duplicate = tx.select().from(productPackage).where(packageDuplicatePredicate(productId, totalUnitContent.id, input)).get();
    if (duplicate) return { duplicate: true as const, packageId: duplicate.id };

    const packageRow = insertProductPackage(tx, {
      productId,
      unitContentId: totalUnitContent.id,
      packageTypeId: input.packageTypeId,
      imageUrl: input.imageUrl ?? null,
    });
    persistProductPackagePortion(tx, packageRow.id, input.portion);
    return { duplicate: false as const, packageId: packageRow.id };
  });

  if (created.duplicate) return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });
  const fullRow = findProductPackageFullRow(productId, created.packageId);
  if (fullRow === undefined) throw new Error("Created product package could not be projected");
  return ok({ productId, ...toProductPackageDto(fullRow) });
}

/** Read one package belonging to a product. */
function getProductPackage(productId: string, packageId: number): Result<ProductPackageDto & { readonly productId: string }> {
  if (!productExists(productId)) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
  const fullRow = findProductPackageFullRow(productId, packageId);
  if (!fullRow) return err({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });
  return ok({ productId, ...toProductPackageDto(fullRow) });
}

/** Update a package when references, duplicates, portions, and macro dimensions are valid. */
function updateProductPackage(productId: string, packageId: number, input: ProductPackageRequest): Result<ProductPackageDto & { readonly productId: string }> {
  if (!productExists(productId)) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
  const existingPackage = findProductPackageFullRow(productId, packageId);
  if (!existingPackage) return err({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });

  const references = findPackageReferences(input);
  if (!references.ok) return references;
  if (!isPackageDimensionCompatible(productId, references.value.unitTypeRow.dimension)) {
    return err({ code: "UNIT_DIMENSION_INCOMPATIBLE", message: "Package unit dimension is incompatible with the macro profile" });
  }
  if (existingPackage.unitType.dimension !== references.value.unitTypeRow.dimension && hasRetainedExplicitContentLogs(packageId)) {
    return err({ code: "UNIT_DIMENSION_INCOMPATIBLE", message: "Package dimension cannot change while explicit content-unit logs reference it" });
  }
  if (input.portion === null && hasRetainedIndividualLogs(packageId)) {
    return err({ code: "VALIDATION_ERROR", message: "Portion data cannot be removed while consumption logs reference it", fields: { portion: "Deze portie wordt gebruikt door consumptielogs." } });
  }

  const updated = database.transaction((tx) => {
    const totalUnitContent = findOrCreateUnitContent(tx, input.unitTypeId, input.amount);
    const duplicate = tx.select().from(productPackage).where(and(
      ne(productPackage.id, packageId),
      packageDuplicatePredicate(productId, totalUnitContent.id, input),
    )).get();
    if (duplicate) return { duplicate: true as const };

    tx.update(productPackage).set({
      packageTypeId: input.packageTypeId,
      unitContentId: totalUnitContent.id,
      imageUrl: input.imageUrl ?? null,
      archivedAt: shouldActivateCorrectedLegacyPackage(existingPackage, input) ? null : existingPackage.productPackage.archivedAt,
      updatedAt: new Date().toISOString(),
    }).where(eq(productPackage.id, packageId)).run();
    persistProductPackagePortion(tx, packageId, input.portion);
    return { duplicate: false as const };
  });

  if (updated.duplicate) return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });
  const fullRow = findProductPackageFullRow(productId, packageId);
  if (fullRow === undefined) throw new Error("Updated product package could not be projected");
  return ok({ productId, ...toProductPackageDto(fullRow) });
}

/** Find or create canonical unit content through the active executor. */
function findOrCreateUnitContent(executor: ProductPackageExecutor, unitTypeId: number, amount: string): UnitContentRow {
  const existing = executor.select().from(unitContent).where(and(eq(unitContent.unitTypeId, unitTypeId), eq(unitContent.amount, amount))).get();
  if (existing) return existing;
  return executor.insert(unitContent).values({ unitTypeId, amount }).returning().get();
}

/** Insert one product package through the active executor. */
function insertProductPackage(executor: ProductPackageExecutor, input: InsertProductPackageInput): ProductPackageRow {
  return executor.insert(productPackage).values(input).returning().get();
}

/** Insert, replace, or remove the optional portion belonging to a package. */
function persistProductPackagePortion(
  executor: ProductPackageExecutor,
  productPackageId: number,
  portion: ProductPackagePortionRequest | null,
): void {
  if (portion === null) {
    executor.delete(productPackagePortion).where(eq(productPackagePortion.productPackageId, productPackageId)).run();
    return;
  }
  const portionContent = findOrCreateUnitContent(executor, portion.unitTypeId, portion.amount);
  executor.insert(productPackagePortion).values({
    productPackageId,
    name: portion.name,
    unitContentId: portionContent.id,
    portionsPerPackage: portion.portionsPerPackage,
  }).onConflictDoUpdate({
    target: productPackagePortion.productPackageId,
    set: {
      name: portion.name,
      unitContentId: portionContent.id,
      portionsPerPackage: portion.portionsPerPackage,
    },
  }).run();
}

/** Read all package relation rows for one product. */
function findProductPackageFullRows(productId: string): ProductPackageFullRow[] {
  return packageFullRowQuery().where(eq(productPackage.productId, productId)).all();
}

/** Read one package relation row for one product. */
function findProductPackageFullRow(productId: string, packageId: number): ProductPackageFullRow | undefined {
  return packageFullRowQuery().where(and(eq(productPackage.productId, productId), eq(productPackage.id, packageId))).get();
}

/** Build the joined query used for package detail and list projections. */
function packageFullRowQuery() {
  const portionUnitContent = alias(unitContent, "portion_unit_content");
  const portionUnitType = alias(unitType, "portion_unit_type");
  return database.select({
    productPackage,
    packageType,
    unitContent,
    unitType,
    portion: productPackagePortion,
    portionUnitContent,
    portionUnitType,
  }).from(productPackage)
    .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
    .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
    .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
    .leftJoin(productPackagePortion, eq(productPackage.id, productPackagePortion.productPackageId))
    .leftJoin(portionUnitContent, eq(productPackagePortion.unitContentId, portionUnitContent.id))
    .leftJoin(portionUnitType, eq(portionUnitContent.unitTypeId, portionUnitType.id));
}

/** Project product-package persistence rows into the public protocol shape. */
function toProductPackageDto(row: ProductPackageFullRow): ProductPackageDto {
  const portion = row.portion === null || row.portionUnitContent === null || row.portionUnitType === null
    ? null
    : {
        name: row.portion.name,
        unitContent: {
          id: row.portionUnitContent.id,
          amount: String(row.portionUnitContent.amount),
          unitType: toUnitTypeDto(row.portionUnitType),
        },
        portionsPerPackage: row.portion.portionsPerPackage,
      };
  return {
    id: row.productPackage.id,
    imageUrl: row.productPackage.imageUrl,
    packageType: { id: row.packageType.id, name: row.packageType.name },
    unitContent: {
      id: row.unitContent.id,
      amount: String(row.unitContent.amount),
      unitType: toUnitTypeDto(row.unitType),
    },
    portion,
    summary: formatPackageSummary(row.productPackage, row.packageType, row.unitContent, row.unitType, portion),
  };
}

/** Project a unit-type row into the catalog protocol shape. */
function toUnitTypeDto(row: UnitTypeRow) {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    dimension: row.dimension,
    conversionToBase: String(row.conversionToBase),
  };
}

/** Resolve all package and optional portion references. */
function findPackageReferences(input: ProductPackageRequest): Result<{
  readonly packageTypeRow: PackageTypeRow;
  readonly unitTypeRow: UnitTypeRow;
  readonly portionUnitTypeRow: UnitTypeRow | null;
}> {
  const unitTypeRow = findUnitTypeById(input.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.packageTypeId);
  const portionUnitTypeRow = input.portion === null ? null : findUnitTypeById(input.portion.unitTypeId) ?? null;
  if (!unitTypeRow || !packageTypeRow || (input.portion !== null && portionUnitTypeRow === null)) {
    return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });
  }
  if (portionUnitTypeRow !== null && portionUnitTypeRow.dimension !== unitTypeRow.dimension) {
    return err({
      code: "UNIT_DIMENSION_INCOMPATIBLE",
      message: "Portion and package content must use the same unit dimension",
      fields: { "portion.unitTypeId": "Kies dezelfde soort eenheid als voor de volledige inhoud." },
    });
  }
  return ok({ packageTypeRow, unitTypeRow, portionUnitTypeRow });
}

/** Build the package identity predicate from outer type and total content. */
function packageDuplicatePredicate(productId: string, unitContentId: number, input: ProductPackageRequest) {
  return and(
    eq(productPackage.productId, productId),
    eq(productPackage.packageTypeId, input.packageTypeId),
    eq(productPackage.unitContentId, unitContentId),
  );
}

/** Determine whether a corrected quarantined legacy package can become selectable again. */
function shouldActivateCorrectedLegacyPackage(existing: ProductPackageFullRow, input: ProductPackageRequest): boolean {
  return existing.productPackage.archivedAt !== null
    && existing.portion?.name.trim().toLocaleLowerCase("nl-NL") === "individueel type controleren"
    && input.portion?.name.trim().toLocaleLowerCase("nl-NL") !== "individueel type controleren";
}

/** Determine whether a retained explicit content-unit log requires the package's current dimension. */
function hasRetainedExplicitContentLogs(packageId: number): boolean {
  return database.select({ id: consumptionLog.id }).from(consumptionLog)
    .innerJoin(productConsumption, eq(productConsumption.consumptionLogId, consumptionLog.id))
    .where(and(
      eq(productConsumption.productPackageId, packageId),
      eq(productConsumption.inputMode, "CONTENT_UNIT"),
    )).limit(1).get() !== undefined;
}

/** Determine whether retained individual-unit logs require current portion metadata. */
function hasRetainedIndividualLogs(packageId: number): boolean {
  return database.select({ id: consumptionLog.id }).from(consumptionLog)
    .innerJoin(productConsumption, eq(productConsumption.consumptionLogId, consumptionLog.id))
    .where(and(
      eq(productConsumption.productPackageId, packageId),
      eq(productConsumption.inputMode, "INDIVIDUAL_UNIT"),
    )).limit(1).get() !== undefined;
}

/** Check whether a product exists before package operations. */
function productExists(productId: string): boolean {
  return database.select({ id: product.id }).from(product).where(eq(product.id, productId)).get() !== undefined;
}

/** Check a package dimension against the product's optional macro profile. */
function isPackageDimensionCompatible(productId: string, dimension: UnitTypeRow["dimension"]): boolean {
  const profile = database.select({ referenceBasis: productMacroProfile.referenceBasis }).from(productMacroProfile).where(eq(productMacroProfile.productId, productId)).get();
  return !profile || requiredDimensionForReferenceBasis(profile.referenceBasis) === dimension;
}

/** Format total package content and optional portion metadata for catalog display. */
function formatPackageSummary(
  _productPackageRow: ProductPackageRow,
  packageTypeRow: PackageTypeRow,
  totalContentRow: UnitContentRow,
  totalUnitTypeRow: UnitTypeRow,
  portion: ProductPackageDto["portion"],
): string {
  const total = `${packageTypeRow.name} ${String(totalContentRow.amount)} ${totalUnitTypeRow.name}`;
  if (portion === null) return total;
  const portionSize = `${portion.unitContent.amount} ${portion.unitContent.unitType.name} per ${portion.name}`;
  return portion.portionsPerPackage === null
    ? `${total} (${portionSize})`
    : `${total} (${portion.portionsPerPackage} × ${portionSize})`;
}

  return { addProductPackage, getProductPackage, updateProductPackage, findOrCreateUnitContent, insertProductPackage, persistProductPackagePortion, findProductPackageFullRows, findProductPackageFullRow, toProductPackageDto };
}
