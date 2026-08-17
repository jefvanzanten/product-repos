import type { BackendDatabase } from "../index.ts";
import { packageType } from "../schema.ts";

const commonPackageTypes = ([
  ["fles", "flessen"],
  ["blik", "blikken"],
  ["pot", "potten"],
  ["zak", "zakken"],
  ["doos", "dozen"],
  ["pak", "pakken"],
  ["tube", "tubes"],
  ["bus", "bussen"],
  ["tray", "trays"],
  ["multipack", "multipacks"],
  ["los stuk", "losse stuks"],
  ["overig", "overige"],
] as const).map(([singularName, pluralName]) => ({ singularName, pluralName }));

/** Seed the reference package types used by the product catalog form. */
export async function seedPackageTypes(database: BackendDatabase): Promise<number> {
  await database.insert(packageType).values(commonPackageTypes).onConflictDoNothing();

  return commonPackageTypes.length;
}
