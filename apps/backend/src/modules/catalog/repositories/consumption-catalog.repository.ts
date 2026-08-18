import { and, asc, desc, eq, inArray, isNotNull, isNull, max, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { BackendDatabase } from "../../../db/index.ts";
import { brand, concreteProduct, consumptionLog, packageType, productComposition, productCompositionMacroProfile, productConsumption, productPortion, unitContent, unitType } from "../../../db/schema.ts";


/** Joined concrete-product projection exposed only for consumption use cases. */
export type CatalogProductRecord = {
  readonly productId: string;
  readonly packageImageUrl: string | null;
  readonly productName: string;
  readonly brandId: string | null;
  readonly brandName: string | null;
  readonly consumptionType: "FOOD" | "DRINK" | "SUPPLEMENT" | null;
  readonly productArchivedAt: string | null;
  readonly packageTypeId: number;
  readonly packageTypeName: string;
  readonly packageTypePluralName: string;
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
  readonly portionsPerProduct: number | null;
  readonly macroProfile: ProductMacroProfileRecord | null;
};

/** Product macro profile projected for consumption calculations. */
export type ProductMacroProfileRecord = {
  readonly referenceBasis: "PER_100_G" | "PER_100_ML" | "PER_UNIT";
  readonly caloriesKcal: string | null;
  readonly proteinG: string | null;
  readonly carbohydratesG: string | null;
  readonly fatG: string | null;
};

/** Unit type projected for consumption quantity conversion. */
export type UnitTypeRecord = {
  readonly id: number;
  readonly name: string;
  readonly symbol: string;
  readonly dimension: "MASS" | "VOLUME" | "COUNT";
  readonly conversionToBase: string;
};

/** One recently consumed active concrete product with its most recent consumption instant. */
export type RecentCatalogProduct = {
  readonly record: CatalogProductRecord;
  readonly lastConsumedAt: string;
};

/** Catalog reads required by current Calorie Tracker use cases. */
export type ConsumptionCatalogReader = {
  readonly searchActiveCatalogProducts: (query: string, limit: number) => ReadonlyArray<CatalogProductRecord>;
  readonly findRecentActiveCatalogProducts: (userId: string, limit: number) => ReadonlyArray<RecentCatalogProduct>;
  readonly findCatalogProduct: (productId: string) => CatalogProductRecord | undefined;
  readonly findCatalogProductsByIds: (productIds: ReadonlyArray<string>) => ReadonlyArray<CatalogProductRecord>;
  readonly findCompatibleUnitTypes: (dimension: UnitTypeRecord["dimension"]) => ReadonlyArray<UnitTypeRecord>;
  readonly findAllUnitTypes: () => ReadonlyArray<UnitTypeRecord>;
  readonly findUnitType: (unitTypeId: number) => UnitTypeRecord | undefined;
  readonly findUnitTypesByIds: (unitTypeIds: ReadonlyArray<number>) => ReadonlyArray<UnitTypeRecord>;
};

/** Create the consumption-facing v2 catalog reader for one injected database. */
export function createConsumptionCatalogRepository(db: BackendDatabase): ConsumptionCatalogReader {
  /** Search active and complete concrete products. */
  function searchActiveCatalogProducts(query: string, limit: number): ReadonlyArray<CatalogProductRecord> {
    const matches = or(sql<number>`instr(lower(${productComposition.name}), lower(${query})) > 0`, sql<number>`instr(lower(coalesce(${brand.name}, '')), lower(${query})) > 0`);
    return readCatalogProducts(and(isNull(concreteProduct.archivedAt), isNotNull(productComposition.consumptionType), matches), limit, true);
  }

  /** Read recently consumed active concrete products. */
  function findRecentActiveCatalogProducts(userId: string, limit: number): ReadonlyArray<RecentCatalogProduct> {
    const recentRows = db.select({
      productId: productConsumption.productId,
      latestConsumedAt: max(consumptionLog.consumedAt),
      latestCreatedAt: max(consumptionLog.createdAt),
    }).from(consumptionLog)
      .innerJoin(productConsumption, eq(productConsumption.consumptionLogId, consumptionLog.id))
      .innerJoin(concreteProduct, eq(productConsumption.productId, concreteProduct.id))
      .innerJoin(productComposition, eq(concreteProduct.productCompositionId, productComposition.id))
      .where(and(eq(consumptionLog.userId, userId), isNull(consumptionLog.deletedAt), isNull(concreteProduct.archivedAt), isNotNull(productComposition.consumptionType)))
      .groupBy(productConsumption.productId)
      .orderBy(desc(max(consumptionLog.consumedAt)), desc(max(consumptionLog.createdAt)), desc(productConsumption.productId))
      .limit(limit).all();
    const records = new Map(findCatalogProductsByIds(recentRows.map((row) => row.productId)).map((row) => [row.productId, row]));
    return recentRows.flatMap((row) => {
      const record = records.get(row.productId);
      return record && row.latestConsumedAt ? [{ record, lastConsumedAt: row.latestConsumedAt }] : [];
    });
  }

  /** Read one concrete product by UUID. */
  function findCatalogProduct(productId: string): CatalogProductRecord | undefined {
    return readCatalogProducts(eq(concreteProduct.id, productId), 1)[0];
  }

  /** Read concrete products by UUID. */
  function findCatalogProductsByIds(productIds: ReadonlyArray<string>): ReadonlyArray<CatalogProductRecord> {
    const ids = [...new Set(productIds)];
    return ids.length === 0 ? [] : readCatalogProducts(inArray(concreteProduct.id, ids));
  }

  /** Read compatible unit types. */
  function findCompatibleUnitTypes(dimension: UnitTypeRecord["dimension"]): ReadonlyArray<UnitTypeRecord> {
    return db.select().from(unitType).where(eq(unitType.dimension, dimension)).orderBy(asc(unitType.id)).all();
  }

  /** Read every active unit type grouped by dimension and stable identifier. */
  function findAllUnitTypes(): ReadonlyArray<UnitTypeRecord> {
    return db.select().from(unitType).orderBy(asc(unitType.dimension), asc(unitType.id)).all();
  }

  /** Read one unit type. */
  function findUnitType(unitTypeId: number): UnitTypeRecord | undefined {
    return db.select().from(unitType).where(eq(unitType.id, unitTypeId)).get();
  }

  /** Read referenced unit types. */
  function findUnitTypesByIds(unitTypeIds: ReadonlyArray<number>): ReadonlyArray<UnitTypeRecord> {
    const ids = [...new Set(unitTypeIds)];
    return ids.length === 0 ? [] : db.select().from(unitType).where(inArray(unitType.id, ids)).orderBy(asc(unitType.id)).all();
  }

  /** Execute the shared concrete-product projection. */
  function readCatalogProducts(condition?: SQL, limit?: number, searchOrder = false): ReadonlyArray<CatalogProductRecord> {
    const portionContent = alias(unitContent, "portion_content");
    const portionUnit = alias(unitType, "portion_unit");
    let query = db.select({
      productId: concreteProduct.id,
      packageImageUrl: concreteProduct.imageUrl,
      productName: productComposition.name,
      brandId: brand.id,
      brandName: brand.name,
      consumptionType: productComposition.consumptionType,
      productArchivedAt: concreteProduct.archivedAt,
      packageTypeId: packageType.id,
      packageTypeName: packageType.singularName,
      packageTypePluralName: packageType.pluralName,
      contentAmount: unitContent.amount,
      contentUnitId: unitType.id,
      contentUnitName: unitType.name,
      contentUnitSymbol: unitType.symbol,
      contentUnitDimension: unitType.dimension,
      contentUnitConversionToBase: unitType.conversionToBase,
      portionName: productPortion.singularName,
      portionContentAmount: portionContent.amount,
      portionContentUnitId: portionUnit.id,
      portionContentUnitName: portionUnit.name,
      portionContentUnitSymbol: portionUnit.symbol,
      portionContentUnitDimension: portionUnit.dimension,
      portionContentUnitConversionToBase: portionUnit.conversionToBase,
      portionsPerProduct: productPortion.portionsPerProduct,
      macroIsActive: productCompositionMacroProfile.isActive,
      macroReferenceBasis: productCompositionMacroProfile.referenceBasis,
      macroCaloriesKcal: productCompositionMacroProfile.caloriesKcal,
      macroProteinG: productCompositionMacroProfile.proteinG,
      macroCarbohydratesG: productCompositionMacroProfile.carbohydratesG,
      macroFatG: productCompositionMacroProfile.fatG,
    }).from(concreteProduct)
      .innerJoin(productComposition, eq(concreteProduct.productCompositionId, productComposition.id))
      .leftJoin(brand, eq(productComposition.brandId, brand.id))
      .innerJoin(packageType, eq(concreteProduct.packageTypeId, packageType.id))
      .innerJoin(unitContent, eq(concreteProduct.unitContentId, unitContent.id))
      .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
      .leftJoin(productPortion, eq(concreteProduct.id, productPortion.productId))
      .leftJoin(portionContent, eq(productPortion.unitContentId, portionContent.id))
      .leftJoin(portionUnit, eq(portionContent.unitTypeId, portionUnit.id))
      .leftJoin(productCompositionMacroProfile, eq(productComposition.id, productCompositionMacroProfile.productCompositionId)).$dynamic();
    if (condition) query = query.where(condition);
    query = searchOrder
      ? query.orderBy(sql`${productComposition.name} COLLATE NOCASE`, sql`coalesce(${brand.name}, '') COLLATE NOCASE`, asc(concreteProduct.id))
      : query.orderBy(asc(concreteProduct.id));
    if (limit !== undefined) query = query.limit(limit);
    return query.all().map((row) => ({
      productId: row.productId,
      packageImageUrl: row.packageImageUrl,
      productName: row.productName,
      brandId: row.brandId,
      brandName: row.brandName,
      consumptionType: row.consumptionType,
      productArchivedAt: row.productArchivedAt,
      packageTypeId: row.packageTypeId,
      packageTypeName: row.packageTypeName,
      packageTypePluralName: row.packageTypePluralName,
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
      portionsPerProduct: row.portionsPerProduct,
      macroProfile: row.macroIsActive === true && row.macroReferenceBasis ? { referenceBasis: row.macroReferenceBasis, caloriesKcal: row.macroCaloriesKcal, proteinG: row.macroProteinG, carbohydratesG: row.macroCarbohydratesG, fatG: row.macroFatG } : null,
    }));
  }

  return { searchActiveCatalogProducts, findRecentActiveCatalogProducts, findCatalogProduct, findCatalogProductsByIds, findCompatibleUnitTypes, findAllUnitTypes, findUnitType, findUnitTypesByIds };
}
