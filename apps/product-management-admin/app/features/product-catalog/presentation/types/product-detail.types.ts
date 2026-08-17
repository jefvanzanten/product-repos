import type { Brand, Category, ConcreteProductDetail, PackageType, UnitType } from "../../domain/product-catalog";

/** Data required by the concrete product detail page. */
export type ProductDetailLoaderData =
  | { readonly found: true; readonly product: ConcreteProductDetail; readonly categories: ReadonlyArray<Category>; readonly brands: ReadonlyArray<Brand>; readonly packageTypes: ReadonlyArray<PackageType>; readonly unitTypes: ReadonlyArray<UnitType>; readonly backUrl: string }
  | { readonly found: false; readonly backUrl: string };

/** Independently editable product-detail compartments and lifecycle actions. */
export type ProductDetailEditIntent = "composition" | "nutrition" | "product" | "archive" | "restore";

/** Product-detail mutation result. */
export type ProductDetailActionResult = {
  readonly intent: ProductDetailEditIntent;
  readonly ok?: true;
  readonly errors?: Record<string, string>;
  readonly product?: ConcreteProductDetail;
  readonly values?: Record<string, string>;
};

export type { ConcreteProductDetail };
