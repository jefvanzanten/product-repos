import { and, asc, desc, eq, inArray, isNull, max, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { BackendDatabase } from "../../../db/index.ts";
import { brand, consumptionLog, packageType, product, productMacroProfile, productPackage, productPackagePortion, unitContent, unitType } from "../../../db/schema.ts";
import type { CatalogPackageRecord, ConsumptionCatalogReader, UnitTypeRecord } from "./consumption-catalog-reader.ts";

/** Create the consumption-facing catalog reader for one injected database. */
export function createDrizzleConsumptionCatalogReader(db: BackendDatabase): ConsumptionCatalogReader {
  /** Search active packages in SQL with deterministic ranking and a storage-level limit. */
  function searchActiveCatalogPackages(query: string, limit: number): ReadonlyArray<CatalogPackageRecord> {
    const matchesQuery = or(
      sql<number>`instr(lower(${product.name}), lower(${query})) > 0`,
      sql<number>`instr(lower(coalesce(${brand.name}, '')), lower(${query})) > 0`,
    );
    return readCatalogPackages(
      and(isNull(product.archivedAt), isNull(productPackage.archivedAt), matchesQuery),
      limit,
      true,
    );
  }

  /** Read recent active packages using bounded grouped log identifiers before projection. */
  function findRecentActiveCatalogPackages(userId: string, limit: number): ReadonlyArray<CatalogPackageRecord> {
    const recentIds = db.select({
      packageId: consumptionLog.productPackageId,
      latestConsumedAt: max(consumptionLog.consumedAt),
      latestCreatedAt: max(consumptionLog.createdAt),
    }).from(consumptionLog)
      .innerJoin(productPackage, eq(consumptionLog.productPackageId, productPackage.id))
      .innerJoin(product, eq(productPackage.productId, product.id))
      .where(and(
        eq(consumptionLog.userId, userId),
        isNull(consumptionLog.deletedAt),
        isNull(productPackage.archivedAt),
        isNull(product.archivedAt),
      ))
      .groupBy(consumptionLog.productPackageId)
      .orderBy(
        desc(max(consumptionLog.consumedAt)),
        desc(max(consumptionLog.createdAt)),
        desc(consumptionLog.productPackageId),
      )
      .limit(limit)
      .all()
      .map((row) => row.packageId);
    const byId = new Map(findCatalogPackagesByIds(recentIds).map((row) => [row.packageId, row]));
    return recentIds.flatMap((packageId) => {
      const record = byId.get(packageId);
      return record === undefined ? [] : [record];
    });
  }

  /** Read one current catalog package with a targeted identifier predicate. */
  function findCatalogPackage(packageId: number): CatalogPackageRecord | undefined {
    return readCatalogPackages(eq(productPackage.id, packageId), 1)[0];
  }

  /** Read only the current package projections required by found logs. */
  function findCatalogPackagesByIds(packageIds: ReadonlyArray<number>): ReadonlyArray<CatalogPackageRecord> {
    const distinctIds = [...new Set(packageIds)];
    return distinctIds.length === 0 ? [] : readCatalogPackages(inArray(productPackage.id, distinctIds));
  }

  /** Read compatible unit types ordered by stable identifier. */
  function findCompatibleUnitTypes(dimension: UnitTypeRecord["dimension"]): ReadonlyArray<UnitTypeRecord> {
    return db.select().from(unitType).where(eq(unitType.dimension, dimension)).orderBy(asc(unitType.id)).all();
  }

  /** Read one unit type by integer identifier. */
  function findUnitType(unitTypeId: number): UnitTypeRecord | undefined {
    return db.select().from(unitType).where(eq(unitType.id, unitTypeId)).get();
  }

  /** Read only unit types referenced by projected logs. */
  function findUnitTypesByIds(unitTypeIds: ReadonlyArray<number>): ReadonlyArray<UnitTypeRecord> {
    const distinctIds = [...new Set(unitTypeIds)];
    if (distinctIds.length === 0) return [];
    return db.select().from(unitType).where(inArray(unitType.id, distinctIds)).orderBy(asc(unitType.id)).all();
  }

  /** Execute the shared package projection with optional predicate, limit, and search order. */
  function readCatalogPackages(
    condition?: SQL,
    limit?: number,
    useSearchOrder = false,
  ): ReadonlyArray<CatalogPackageRecord> {
    const portionContent = alias(unitContent, "portion_content");
    const portionUnit = alias(unitType, "portion_unit");
    let query = db.select({
      packageId: productPackage.id,
      productId: product.id,
      productName: product.name,
      brandId: brand.id,
      brandName: brand.name,
      consumptionType: product.consumptionType,
      productArchivedAt: product.archivedAt,
      packageArchivedAt: productPackage.archivedAt,
      packageTypeId: packageType.id,
      packageTypeName: packageType.name,
      contentAmount: unitContent.amount,
      contentUnitId: unitType.id,
      contentUnitName: unitType.name,
      contentUnitSymbol: unitType.symbol,
      contentUnitDimension: unitType.dimension,
      contentUnitConversionToBase: unitType.conversionToBase,
      portionName: productPackagePortion.name,
      portionContentAmount: portionContent.amount,
      portionContentUnitId: portionUnit.id,
      portionContentUnitName: portionUnit.name,
      portionContentUnitSymbol: portionUnit.symbol,
      portionContentUnitDimension: portionUnit.dimension,
      portionContentUnitConversionToBase: portionUnit.conversionToBase,
      portionsPerPackage: productPackagePortion.portionsPerPackage,
      macroReferenceBasis: productMacroProfile.referenceBasis,
      macroCaloriesKcal: productMacroProfile.caloriesKcal,
      macroProteinG: productMacroProfile.proteinG,
      macroCarbohydratesG: productMacroProfile.carbohydratesG,
      macroFatG: productMacroProfile.fatG,
    }).from(productPackage)
      .innerJoin(product, eq(productPackage.productId, product.id))
      .leftJoin(brand, eq(product.brandId, brand.id))
      .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
      .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
      .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
      .leftJoin(productPackagePortion, eq(productPackage.id, productPackagePortion.productPackageId))
      .leftJoin(portionContent, eq(productPackagePortion.unitContentId, portionContent.id))
      .leftJoin(portionUnit, eq(portionContent.unitTypeId, portionUnit.id))
      .leftJoin(productMacroProfile, eq(product.id, productMacroProfile.productId))
      .$dynamic();
    if (condition !== undefined) query = query.where(condition);
    query = useSearchOrder
      ? query.orderBy(
          sql`CASE WHEN ${productPackagePortion.productPackageId} IS NULL THEN 0 ELSE 1 END`,
          sql`${product.name} COLLATE NOCASE`,
          sql`coalesce(${brand.name}, '') COLLATE NOCASE`,
          asc(productPackage.id),
        )
      : query.orderBy(asc(productPackage.id));
    if (limit !== undefined) query = query.limit(limit);
    return query.all().map(toCatalogPackageRecord);
  }

  return { searchActiveCatalogPackages, findRecentActiveCatalogPackages, findCatalogPackage, findCatalogPackagesByIds, findCompatibleUnitTypes, findUnitType, findUnitTypesByIds };
}

/** Convert one joined Drizzle row into the persistence-port package record. */
function toCatalogPackageRecord(row: {
  readonly packageId: number;
  readonly productId: string;
  readonly productName: string;
  readonly brandId: string | null;
  readonly brandName: string | null;
  readonly consumptionType: "FOOD" | "DRINK" | "SUPPLEMENT";
  readonly productArchivedAt: string | null;
  readonly packageArchivedAt: string | null;
  readonly packageTypeId: number;
  readonly packageTypeName: string;
  readonly contentAmount: string;
  readonly contentUnitId: number;
  readonly contentUnitName: string;
  readonly contentUnitSymbol: string;
  readonly contentUnitDimension: "MASS" | "VOLUME" | "COUNT";
  readonly contentUnitConversionToBase: string;
  readonly portionName: string | null;
  readonly portionContentAmount: string | null;
  readonly portionContentUnitId: number | null;
  readonly portionContentUnitName: string | null;
  readonly portionContentUnitSymbol: string | null;
  readonly portionContentUnitDimension: "MASS" | "VOLUME" | "COUNT" | null;
  readonly portionContentUnitConversionToBase: string | null;
  readonly portionsPerPackage: number | null;
  readonly macroReferenceBasis: "PER_100_G" | "PER_100_ML" | "PER_UNIT" | null;
  readonly macroCaloriesKcal: string | null;
  readonly macroProteinG: string | null;
  readonly macroCarbohydratesG: string | null;
  readonly macroFatG: string | null;
}): CatalogPackageRecord {
  return {
    packageId: row.packageId,
    productId: row.productId,
    productName: row.productName,
    brandId: row.brandId,
    brandName: row.brandName,
    consumptionType: row.consumptionType,
    productArchivedAt: row.productArchivedAt,
    packageArchivedAt: row.packageArchivedAt,
    packageTypeId: row.packageTypeId,
    packageTypeName: row.packageTypeName,
    contentAmount: row.contentAmount,
    contentUnitId: row.contentUnitId,
    contentUnitName: row.contentUnitName,
    contentUnitSymbol: row.contentUnitSymbol,
    contentUnitDimension: row.contentUnitDimension,
    contentUnitConversionToBase: row.contentUnitConversionToBase,
    portionName: row.portionName,
    portionContentAmount: row.portionContentAmount,
    portionContentUnitId: row.portionContentUnitId,
    portionContentUnitName: row.portionContentUnitName,
    portionContentUnitSymbol: row.portionContentUnitSymbol,
    portionContentUnitDimension: row.portionContentUnitDimension,
    portionContentUnitConversionToBase: row.portionContentUnitConversionToBase,
    portionsPerPackage: row.portionsPerPackage,
    macroProfile: row.macroReferenceBasis === null ? null : {
      referenceBasis: row.macroReferenceBasis,
      caloriesKcal: row.macroCaloriesKcal,
      proteinG: row.macroProteinG,
      carbohydratesG: row.macroCarbohydratesG,
      fatG: row.macroFatG,
    },
  };
}
