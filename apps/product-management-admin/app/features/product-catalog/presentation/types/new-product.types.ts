import type { Brand, Category, ConcreteProductDetail, PackageType, ProductComposition, UnitType } from "../../domain/product-catalog";

/** Field errors returned by product creation and retained category helpers. */
export type FormErrors = Record<string, string>;

/** Data loaded for concrete-product creation. */
export type NewProductLoaderData = {
  readonly brandId?: string;
  readonly brandQuery: string;
  readonly categories: ReadonlyArray<Category>;
  readonly categoryId?: string;
  readonly brands: ReadonlyArray<Brand>;
  readonly packageTypes: ReadonlyArray<PackageType>;
  readonly selectedBrand: Brand | null;
  readonly unitTypes: ReadonlyArray<UnitType>;
  readonly selectedComposition: ProductComposition | null;
};

/** Result returned when concrete-product creation fails validation. */
export type NewProductActionResult = {
  readonly errors?: FormErrors;
  readonly values?: Record<string, string>;
  readonly product?: ConcreteProductDetail;
  readonly createdCategory?: Category;
  readonly deletedCategoryId?: number;
};

export type { Brand, ProductComposition };
