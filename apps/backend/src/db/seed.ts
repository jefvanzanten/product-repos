import { closeDatabase } from "./index.ts";
import { seedCategories } from "./seeds/categories.seed.ts";
import { seedPackageTypes } from "./seeds/package-types.seed.ts";
import { seedUnitTypes } from "./seeds/unit-types.seed.ts";

try {
  const seededCategories = await seedCategories();
  const seededUnitTypes = await seedUnitTypes();
  const seededPackageTypes = await seedPackageTypes();

  console.log(
    [
      `${seededCategories} categorieën gecontroleerd/geseed`,
      `${seededUnitTypes} eenheden gecontroleerd/geseed`,
      `${seededPackageTypes} verpakkingstypes gecontroleerd/geseed`,
    ].join("; "),
  );
} finally {
  closeDatabase();
}
