import { db } from "../index.ts";
import { unitType } from "../schema.ts";

const commonUnitTypes = [
  "gram",
  "kilogram",
  "milliliter",
  "centiliter",
  "liter",
  "stuk",
].map((name) => ({ name }));

/** Seed the reference unit types used by the product catalog form. */
export async function seedUnitTypes(): Promise<number> {
  await db.insert(unitType).values(commonUnitTypes).onConflictDoNothing();

  return commonUnitTypes.length;
}
