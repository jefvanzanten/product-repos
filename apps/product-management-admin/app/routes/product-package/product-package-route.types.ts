import type {
  PackageTypeDto,
  ProductDetailDto,
  ProductPackageDto,
  UnitTypeDto,
} from "@product-repos/contracts";

/** Product package detail enriched with its owning product id. */
export type ProductPackageWithProductId = ProductPackageDto & {
  readonly productId: string;
};

/** Data loaded for the add-package page. */
export type PackageFormLoaderData =
  | {
      readonly found: true;
      readonly product: ProductDetailDto;
      readonly packageTypes: ReadonlyArray<PackageTypeDto>;
      readonly unitTypes: ReadonlyArray<UnitTypeDto>;
      readonly context: string;
    }
  | { readonly found: false; readonly context: string };

/** Result returned after attempting to add a package. */
export type PackageFormActionResult = {
  readonly errors?: Record<string, string>;
  readonly values?: Record<string, string>;
};

/** Data loaded for the package-detail page. */
export type PackageDetailLoaderData =
  | {
      readonly found: true;
      readonly product: ProductDetailDto;
      readonly packageDetail: ProductPackageWithProductId;
      readonly packageTypes: ReadonlyArray<PackageTypeDto>;
      readonly unitTypes: ReadonlyArray<UnitTypeDto>;
      readonly context: string;
    }
  | {
      readonly found: false;
      readonly productFound: boolean;
      readonly productId: string;
      readonly context: string;
    };

/** Result returned after attempting to update a package. */
export type PackageDetailActionResult = {
  readonly ok?: true;
  readonly errors?: Record<string, string>;
  readonly packageDetail?: ProductPackageWithProductId;
  readonly values?: Record<string, string>;
};

export type { PackageTypeDto, ProductDetailDto, UnitTypeDto };
