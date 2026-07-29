import type { CatalogBrowseResponse, CatalogSearchResponse, CategoryDto } from "@product-repos/contracts";
import type { FormErrors } from "../../../../features/admin/product-catalog/services/productCatalogService.server";

/** Data required to render the product catalog route. */
export type LoaderData = {
  readonly query: string;
  readonly mode: "browse" | "search";
  readonly browse: CatalogBrowseResponse | null;
  readonly search: CatalogSearchResponse | null;
  readonly categories: ReadonlyArray<CategoryDto>;
  readonly editCategory: CategoryDto | null;
};

/** Category mutation result returned by the product catalog action. */
export type ActionResult = { readonly ok?: true; readonly errors?: FormErrors; readonly createdCategory?: CategoryDto; readonly updatedCategory?: CategoryDto };
