import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db/index";
import { packageType, unitType } from "../db/schema";

export function findAllUnitTypes() {
  return db.select().from(unitType).orderBy(asc(sql`lower(${unitType.name})`)).all();
}

export function findUnitTypeById(id: number) {
  return db.select().from(unitType).where(eq(unitType.id, id)).get();
}

export function findAllPackageTypes() {
  return db.select().from(packageType).orderBy(asc(sql`lower(${packageType.name})`)).all();
}

export function findPackageTypeById(id: number) {
  return db.select().from(packageType).where(eq(packageType.id, id)).get();
}
