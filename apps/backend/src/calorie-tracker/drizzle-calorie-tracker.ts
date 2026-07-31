import { and, asc, desc, eq, gte, isNotNull, isNull, lt, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "../db/index.ts";
import {
  brand,
  consumptionLog,
  packageType,
  product,
  productMacroProfile,
  productPackage,
  productPackagePortion,
  unitContent,
  unitType,
  userNutritionGoal,
} from "../db/schema.ts";

/** Joined catalog package record kept inside the Calorie Tracker persistence boundary. */
export type CatalogPackageRecord = {
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
  readonly macroProfile: ProductMacroProfileRecord | null;
};

/** Product macro-profile persistence projection. */
export type ProductMacroProfileRecord = {
  readonly referenceBasis: "PER_100_G" | "PER_100_ML" | "PER_UNIT";
  readonly caloriesKcal: string | null;
  readonly proteinG: string | null;
  readonly carbohydratesG: string | null;
  readonly fatG: string | null;
};

/** Unit-type persistence projection. */
export type UnitTypeRecord = {
  readonly id: number;
  readonly name: string;
  readonly symbol: string;
  readonly dimension: "MASS" | "VOLUME" | "COUNT";
  readonly conversionToBase: string;
};

/** Consumption-log persistence record. */
export type ConsumptionLogRecord = typeof consumptionLog.$inferSelect;

/** Nutrition-goal persistence record. */
export type NutritionGoalRecord = typeof userNutritionGoal.$inferSelect;

/** Values required to insert a parsed consumption log. */
export type InsertConsumptionLogRecord = typeof consumptionLog.$inferInsert;

/** Values required to update a parsed consumption log. */
export type UpdateConsumptionLogRecord = Pick<InsertConsumptionLogRecord, "productPackageId" | "quantity" | "inputMode" | "inputUnitTypeId" | "consumedAt" | "timezone" | "updatedAt">;

/** SQLite/Drizzle adapter for the cohesive Calorie Tracker persistence capability. */
export class DrizzleCalorieTracker {
  /** Read all catalog packages with current product, unit, brand, and macro data. */
  findCatalogPackages(): ReadonlyArray<CatalogPackageRecord> {
    const portionContent = alias(unitContent, "portion_content");
    const portionUnit = alias(unitType, "portion_unit");
    const rows = db.select({
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
      .all();

    return rows.map((row) => ({
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
    }));
  }

  /** Read one current catalog package by integer identifier. */
  findCatalogPackage(packageId: number): CatalogPackageRecord | undefined {
    return this.findCatalogPackages().find((row) => row.packageId === packageId);
  }

  /** Read all unit types ordered by stable identifier. */
  findUnitTypes(): ReadonlyArray<UnitTypeRecord> {
    return db.select().from(unitType).orderBy(asc(unitType.id)).all();
  }

  /** Read one unit type by integer identifier. */
  findUnitType(unitTypeId: number): UnitTypeRecord | undefined {
    return db.select().from(unitType).where(eq(unitType.id, unitTypeId)).get();
  }

  /** Read active user logs from a bounded UTC window in stable chronological order. */
  findUserLogsInWindow(userId: string, startInclusive: string, endExclusive: string): ReadonlyArray<ConsumptionLogRecord> {
    return db.select().from(consumptionLog).where(and(
      eq(consumptionLog.userId, userId),
      isNull(consumptionLog.deletedAt),
      gte(consumptionLog.consumedAt, startInclusive),
      lt(consumptionLog.consumedAt, endExclusive),
    )).orderBy(asc(consumptionLog.consumedAt), asc(consumptionLog.createdAt), asc(consumptionLog.id)).all();
  }

  /** Read any user's log by globally unique identifier for idempotency checks. */
  findLogById(logId: string): ConsumptionLogRecord | undefined {
    return db.select().from(consumptionLog).where(eq(consumptionLog.id, logId)).get();
  }

  /** Insert a parsed consumption log unless its globally unique client identifier already exists. */
  insertLog(input: InsertConsumptionLogRecord): ConsumptionLogRecord | undefined {
    return db.insert(consumptionLog).values(input).onConflictDoNothing({ target: consumptionLog.id }).returning().get();
  }

  /** Update an active user-owned log only when its concurrency token still matches. */
  updateLog(userId: string, logId: string, expectedUpdatedAt: string, input: UpdateConsumptionLogRecord): ConsumptionLogRecord | undefined {
    return db.update(consumptionLog).set(input).where(and(
      eq(consumptionLog.id, logId),
      eq(consumptionLog.userId, userId),
      eq(consumptionLog.updatedAt, expectedUpdatedAt),
      isNull(consumptionLog.deletedAt),
    )).returning().get();
  }

  /** Soft-delete an active user-owned log. */
  deleteLog(userId: string, logId: string, deletedAt: string, updatedAt: string): ConsumptionLogRecord | undefined {
    return db.update(consumptionLog).set({ deletedAt, updatedAt }).where(and(
      eq(consumptionLog.id, logId),
      eq(consumptionLog.userId, userId),
      isNull(consumptionLog.deletedAt),
    )).returning().get();
  }

  /** Restore a deleted user-owned log when its deletion timestamp still matches. */
  restoreLog(userId: string, logId: string, expectedDeletedAt: string, updatedAt: string): ConsumptionLogRecord | undefined {
    return db.update(consumptionLog).set({ deletedAt: null, updatedAt }).where(and(
      eq(consumptionLog.id, logId),
      eq(consumptionLog.userId, userId),
      eq(consumptionLog.deletedAt, expectedDeletedAt),
    )).returning().get();
  }

  /** Read current nutrition goals for one user. */
  findGoals(userId: string): NutritionGoalRecord | undefined {
    return db.select().from(userNutritionGoal).where(eq(userNutritionGoal.userId, userId)).get();
  }

  /** Atomically insert or replace all current nutrition goals for one user. */
  upsertGoals(input: typeof userNutritionGoal.$inferInsert): NutritionGoalRecord {
    db.insert(userNutritionGoal).values(input).onConflictDoUpdate({
      target: userNutritionGoal.userId,
      set: {
        caloriesKcal: input.caloriesKcal,
        proteinG: input.proteinG,
        carbohydratesG: input.carbohydratesG,
        fatG: input.fatG,
        updatedAt: input.updatedAt,
      },
    }).run();
    const stored = this.findGoals(input.userId);
    if (stored === undefined) throw new Error("Nutrition goals were not persisted");
    return stored;
  }

  /** Read package identifiers ordered by a user's latest active consumption. */
  findRecentPackageIds(userId: string): ReadonlyArray<number> {
    const logs = db.select({ packageId: consumptionLog.productPackageId, consumedAt: consumptionLog.consumedAt, createdAt: consumptionLog.createdAt })
      .from(consumptionLog)
      .where(and(eq(consumptionLog.userId, userId), isNull(consumptionLog.deletedAt)))
      .orderBy(desc(consumptionLog.consumedAt), desc(consumptionLog.createdAt), desc(consumptionLog.id))
      .all();
    return [...new Set(logs.map((row) => row.packageId))];
  }

  /** Physically delete soft-deleted logs whose retention deadline has elapsed. */
  deleteExpiredLogs(cutoffInclusive: string): number {
    return db.delete(consumptionLog).where(and(
      isNotNull(consumptionLog.deletedAt),
      lte(consumptionLog.deletedAt, cutoffInclusive),
    )).returning({ id: consumptionLog.id }).all().length;
  }
}

/** Default Drizzle adapter wired to the process SQLite connection. */
export const calorieTrackerStore = new DrizzleCalorieTracker();
