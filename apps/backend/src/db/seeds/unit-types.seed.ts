import { db } from "../index.ts";
import { unitType } from "../schema.ts";

const commonUnitTypes: Array<typeof unitType.$inferInsert> = [
  { name: "gram", symbol: "g", dimension: "MASS", conversionToBase: 1 },
  { name: "kilogram", symbol: "kg", dimension: "MASS", conversionToBase: 1000 },
  { name: "milliliter", symbol: "ml", dimension: "VOLUME", conversionToBase: 1 },
  { name: "centiliter", symbol: "cl", dimension: "VOLUME", conversionToBase: 10 },
  { name: "liter", symbol: "l", dimension: "VOLUME", conversionToBase: 1000 },
  { name: "stuk", symbol: "st", dimension: "COUNT", conversionToBase: 1 },
];

/** Seed the reference unit types used by the product catalog form. */
export async function seedUnitTypes(): Promise<number> {
  await db.insert(unitType).values(commonUnitTypes).onConflictDoNothing();
  return commonUnitTypes.length;
}
