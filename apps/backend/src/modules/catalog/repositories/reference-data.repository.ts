import { asc, eq, sql } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { packageType, unitType } from "../../../db/schema.ts";

/** Unit and package reference persistence operations. */
export type ReferenceDataRepository = {
  readonly findAllUnitTypes: () => Array<typeof unitType.$inferSelect>;
  readonly findUnitTypeById: (id: number) => typeof unitType.$inferSelect | undefined;
  readonly findAllPackageTypes: () => Array<typeof packageType.$inferSelect>;
  readonly findPackageTypeById: (id: number) => typeof packageType.$inferSelect | undefined;
};

/** Create reference-data operations for one injected database. */
export function createReferenceDataRepository(database: BackendDatabase): ReferenceDataRepository {
  /** Read unit types in stable display order. */
  function findAllUnitTypes(): Array<typeof unitType.$inferSelect> {
    return database.select().from(unitType).orderBy(asc(sql`lower(${unitType.name})`)).all();
  }

  /** Find one unit type. */
  function findUnitTypeById(id: number): typeof unitType.$inferSelect | undefined {
    return database.select().from(unitType).where(eq(unitType.id, id)).get();
  }

  /** Read package types in stable display order. */
  function findAllPackageTypes(): Array<typeof packageType.$inferSelect> {
    return database.select().from(packageType).orderBy(asc(sql`lower(${packageType.singularName})`)).all();
  }

  /** Find one package type. */
  function findPackageTypeById(id: number): typeof packageType.$inferSelect | undefined {
    return database.select().from(packageType).where(eq(packageType.id, id)).get();
  }

  return { findAllUnitTypes, findUnitTypeById, findAllPackageTypes, findPackageTypeById };
}
