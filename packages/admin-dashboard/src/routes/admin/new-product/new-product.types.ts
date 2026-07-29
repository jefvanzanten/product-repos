import type {
  BrandDto,
  CategoryDto,
  PackageTypeDto,
  UnitTypeDto,
} from "@product-repos/contracts";

/** Field and form errors returned by admin mutations. */
export type FormErrors = Record<string, string>;

/** Data loaded for the shared new-product page. */
export type NewProductLoaderData = {
  readonly brandId?: string;
  readonly categoryId?: string;
  readonly brandQuery: string;
  readonly brands: ReadonlyArray<BrandDto>;
  readonly selectedBrand: BrandDto | null;
  readonly categories: ReadonlyArray<CategoryDto>;
  readonly packageTypes: ReadonlyArray<PackageTypeDto>;
  readonly unitTypes: ReadonlyArray<UnitTypeDto>;
};

/** Form values preserved after a failed new-product action. */
export type SubmittedValues = Record<string, string>;

/** Result returned by new-product and inline category actions. */
export type NewProductActionResult = {
  readonly errors?: FormErrors;
  readonly createdCategory?: CategoryDto;
  readonly deletedCategoryId?: number;
  readonly values?: SubmittedValues;
};

export type { BrandDto };
