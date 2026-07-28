import type { CatalogReferenceData } from "./reference-data.model";

/** Product create page model. */
export type ProductCreateModel = CatalogReferenceData & {
  /** Prefilled explicit brand context. */
  readonly selectedBrand: { readonly id: string; readonly name: string } | null;
  /** Prefilled explicit category context. */
  readonly selectedCategoryId: number | null;
};
