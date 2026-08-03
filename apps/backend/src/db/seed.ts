import { loadBackendConfig } from "../config.ts";
import { createDatabase } from "./index.ts";
import { seedCategories } from "./seeds/categories.seed.ts";
import { seedPackageTypes } from "./seeds/package-types.seed.ts";
import { seedUnitTypes } from "./seeds/unit-types.seed.ts";

const resources = createDatabase(loadBackendConfig(process.env));
try {
  const seededCategories = await seedCategories(resources.database);
  const seededUnitTypes = await seedUnitTypes(resources.database);
  const seededPackageTypes = await seedPackageTypes(resources.database);
  console.log([
    `${seededCategories} categorieën gecontroleerd/geseed`,
    `${seededUnitTypes} eenheden gecontroleerd/geseed`,
    `${seededPackageTypes} verpakkingstypes gecontroleerd/geseed`,
  ].join("; "));
} finally {
  resources.close();
}
