/** Product form input parsed from an HTML form. */
export type ProductFormInput = {
  /** Product name. */
  readonly name: string;
  /** Selected category. */
  readonly categoryId: number;
  /** Visible brand name typed by the user. */
  readonly brandName: string | null;
  /** Existing brand id selected by the user. */
  readonly brandId: string | null;
  /** New brand name confirmed by the user. */
  readonly newBrandName: string | null;
  /** First package fields for product creation. */
  readonly package: PackageFormInput;
};

/** Product identity edit input parsed from an HTML form. */
export type ProductEditInput = Omit<ProductFormInput, "package">;

/** Package form input parsed from an HTML form. */
export type PackageFormInput = {
  /** Selected package type. */
  readonly packageTypeId: number;
  /** Positive decimal content amount, canonicalized with a dot separator. */
  readonly amount: string;
  /** Selected content unit type. */
  readonly unitTypeId: number;
  /** Number of units contained by this package. */
  readonly unitsPerPackage: number;
};
