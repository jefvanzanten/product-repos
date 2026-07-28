import type { CatalogCategoryBrowseResponse, CatalogCategoryRow } from "@product-repos/contracts";

/** One category row in the root-category accordion tree. */
export type CategoryAccordionNode = {
  /** Category rendered by this tree node. */
  readonly category: CatalogCategoryRow;
  /** Direct child categories rendered when this node is opened or is on the open path. */
  readonly children: ReadonlyArray<CategoryAccordionNode>;
};

/** Model for the lazily loaded root-category accordion. */
export type RootCategoryAccordionModel = {
  /** Root category nodes rendered as accordion rows. */
  readonly categoryTree: ReadonlyArray<CategoryAccordionNode>;
  /** Category ids from the root to the currently opened category. */
  readonly openPathIds: ReadonlyArray<number>;
  /** The currently opened category; `null` means all rows are closed. */
  readonly openCategory: CatalogCategoryBrowseResponse | null;
  /** Cumulative product limit for products rendered inside the opened category panel. */
  readonly limit: number;
};
