import type { BackendDatabase } from "../index.ts";
import { packageType } from "../schema.ts";

const commonPackageTypes = [
  "fles",
  "blik",
  "pot",
  "zak",
  "doos",
  "pak",
  "tube",
  "bus",
  "tray",
  "multipack",
  "los stuk",
  "overig",
].map((name) => ({ name }));

/** Seed the reference package types used by the product catalog form. */
export async function seedPackageTypes(database: BackendDatabase): Promise<number> {
  await database.insert(packageType).values(commonPackageTypes).onConflictDoNothing();

  return commonPackageTypes.length;
}
