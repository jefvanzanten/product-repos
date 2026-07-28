import type { PackageTypeDto, UnitTypeDto } from "@product-repos/contracts";
import type { CategoryWithPath } from "./category.model";

/** Reference data required to render product and package forms. */
export type CatalogReferenceData = {
  /** Catalog categories in display order. */
  readonly categories: ReadonlyArray<CategoryWithPath>;
  /** Available packaging types. */
  readonly packageTypes: ReadonlyArray<PackageTypeDto>;
  /** Available unit types. */
  readonly unitTypes: ReadonlyArray<UnitTypeDto>;
};
