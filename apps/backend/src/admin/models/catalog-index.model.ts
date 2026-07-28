import type { CatalogBrowseResponse, CatalogCategoryRow, CatalogSearchResponse } from "@product-repos/contracts";
import type { CatalogUrlState } from "./catalog-navigation.model";
import type { CategoryAccordionNode } from "./category-tree.model";

/** Model for the catalog overview page. */
export type CatalogIndexModel = {
  /** Parsed URL state echoed back to the UI. */
  readonly state: CatalogUrlState;
  /** Search results when text search mode is active. */
  readonly search: CatalogSearchResponse | null;
  /** Browse response for root, category, or brand state. */
  readonly browse: CatalogBrowseResponse | null;
  /** Root categories, including roots that do not yet have products. */
  readonly rootCategories: ReadonlyArray<CatalogCategoryRow>;
  /** Full category tree used by the root accordion. */
  readonly categoryTree: ReadonlyArray<CategoryAccordionNode>;
};
