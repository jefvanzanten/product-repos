import type { CategoryDto, ProductDetailDto } from "@product-repos/contracts";

/** Data loaded for the shared product-detail page. */
export type ProductDetailLoaderData =
  | {
      readonly found: true;
      readonly product: ProductDetailDto;
      readonly categories: ReadonlyArray<CategoryDto>;
      readonly backUrl: string;
    }
  | { readonly found: false; readonly backUrl: string };

/** Result returned after editing a product. */
export type ProductDetailActionResult = {
  readonly ok?: true;
  readonly errors?: Record<string, string>;
  readonly product?: ProductDetailDto;
  readonly values?: Record<string, string>;
};

export type { CategoryDto, ProductDetailDto };
