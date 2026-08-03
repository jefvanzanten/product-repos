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

/** Product-detail compartment that submitted a mutation. */
export type ProductDetailEditIntent = "product" | "nutrition";

/** Result returned after editing a product compartment. */
export type ProductDetailActionResult = {
  readonly intent: ProductDetailEditIntent;
  readonly ok?: true;
  readonly errors?: Record<string, string>;
  readonly product?: ProductDetailDto;
  readonly values?: Record<string, string>;
};

export type { CategoryDto, ProductDetailDto };
