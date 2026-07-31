import { and, asc, desc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "../db/index.ts";
import {
  brand,
  consumptionLog,
  packageType,
  product,
  productMacroProfile,
  productPackage,
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
  readonly individualPackageTypeId: number | null;
  readonly individualPackageTypeName: string | null;
  readonly contentAmount: string;
  readonly contentUnitId: number;
  readonly contentUnitName: string;
  readonly contentUnitSymbol: string;
  readonly contentUnitDimension: "MASS" | "VOLUME" | "COUNT";
  readonly contentUnitConversionToBase: string;
  readonly unitsPerPackage: number;
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
    const individualPackageType = alias(packageType, "individual_package_type");
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
      individualPackageTypeId: individualPackageType.id,
      individualPackageTypeName: individualPackageType.name,
      contentAmount: unitContent.amount,
      contentUnitId: unitType.id,
      contentUnitName: unitType.name,
      contentUnitSymbol: unitType.symbol,
      contentUnitDimension: unitType.dimension,
      contentUnitConversionToBase: unitType.conversionToBase,
      unitsPerPackage: productPackage.unitsPerPackage,
      macroReferenceBasis: productMacroProfile.referenceBasis,
      macroCaloriesKcal: productMacroProfile.caloriesKcal,
      macroProteinG: productMacroProfile.proteinG,
      macroCarbohydratesG: productMacroProfile.carbohydratesG,
      macroFatG: productMacroProfile.fatG,
    }).from(productPackage)
      .innerJoin(product, eq(productPackage.productId, product.id))
      .leftJoin(brand, eq(product.brandId, brand.id))
      .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
      .leftJoin(individualPackageType, eq(productPackage.individualPackageTypeId, individualPackageType.id))
      .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
      .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
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
      individualPackageTypeId: row.individualPackageTypeId,
      individualPackageTypeName: row.individualPackageTypeName,
      contentAmount: row.contentAmount,
      contentUnitId: row.contentUnitId,
      contentUnitName: row.contentUnitName,
      contentUnitSymbol: row.contentUnitSymbol,
      contentUnitDimension: row.contentUnitDimension,
      contentUnitConversionToBase: row.contentUnitConversionToBase,
      unitsPerPackage: row.unitsPerPackage,
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

  /** Read active and deleted logs for a user in stable chronological order. */
  findUserLogs(userId: string, includeDeleted = false): ReadonlyArray<ConsumptionLogRecord> {
    const predicate = includeDeleted
      ? eq(consumptionLog.userId, userId)
      : and(eq(consumptionLog.userId, userId), isNull(consumptionLog.deletedAt));
    return db.select().from(consumptionLog).where(predicate).orderBy(asc(consumptionLog.consumedAt), asc(consumptionLog.createdAt), asc(consumptionLog.id)).all();
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
