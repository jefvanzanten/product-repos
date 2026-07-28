/** Expected product-catalog failure for invalid query parameters. */
export class InvalidCatalogQuery extends Error {
  /** Stable error tag. */
  readonly _tag = "InvalidCatalogQuery" as const;

  constructor(
    /** The query field that failed parsing. */
    readonly field: string,
    /** Safe user-facing failure message. */
    message: string,
  ) {
    super(message);
  }
}

/** Expected product-catalog failure for invalid form submissions. */
export class InvalidCatalogForm extends Error {
  /** Stable error tag. */
  readonly _tag = "InvalidCatalogForm" as const;

  constructor(
    /** Field-level errors keyed by HTML form field name. */
    readonly fields: Readonly<Record<string, string>>,
    /** Safe user-facing failure message. */
    message = "Het formulier bevat fouten.",
  ) {
    super(message);
  }
}

/** Expected product-catalog failure for missing catalog context. */
export class CatalogContextNotFound extends Error {
  /** Stable error tag. */
  readonly _tag = "CatalogContextNotFound" as const;

  constructor(
    /** Missing context kind. */
    readonly contextType: "brand" | "category",
    /** Missing context identifier. */
    readonly contextId: string,
  ) {
    super(`${contextType} niet gevonden`);
  }
}

/** Expected product-catalog failure for missing products. */
export class ProductNotFound extends Error {
  /** Stable error tag. */
  readonly _tag = "ProductNotFound" as const;

  constructor(
    /** Product identifier that was requested. */
    readonly productId: string,
  ) {
    super("Product niet gevonden.");
  }
}

/** Expected product-catalog failure for missing product packages. */
export class PackageNotFound extends Error {
  /** Stable error tag. */
  readonly _tag = "PackageNotFound" as const;

  constructor(
    /** Product identifier that owns the package route. */
    readonly productId: string,
    /** Package identifier that was requested. */
    readonly packageId: string,
  ) {
    super("Verpakking niet gevonden.");
  }
}

/** Expected product-catalog failure for duplicate products. */
export class DuplicateProduct extends Error {
  /** Stable error tag. */
  readonly _tag = "DuplicateProduct" as const;

  constructor(
    /** Existing product id when the backend can identify it. */
    readonly existingProductId: string | undefined,
  ) {
    super("Dit product bestaat al in deze categorie met dit merk.");
  }
}

/** Expected product-catalog failure for duplicate packages. */
export class DuplicatePackage extends Error {
  /** Stable error tag. */
  readonly _tag = "DuplicatePackage" as const;

  constructor() {
    super("Deze verpakking bestaat al voor dit product.");
  }
}

/** Expected product-catalog failure for duplicate categories. */
export class DuplicateCategory extends Error {
  /** Stable error tag. */
  readonly _tag = "DuplicateCategory" as const;

  constructor() {
    super("Er bestaat al een categorie met deze naam op dit niveau.");
  }
}

/** Expected product-catalog failure for missing referenced rows. */
export class ReferenceNotFound extends Error {
  /** Stable error tag. */
  readonly _tag = "ReferenceNotFound" as const;

  constructor() {
    super("Een gekozen referentie bestaat niet meer.");
  }
}

/** Union of expected product-catalog service failures. */
export type CatalogError =
  | InvalidCatalogQuery
  | InvalidCatalogForm
  | CatalogContextNotFound
  | ProductNotFound
  | PackageNotFound
  | DuplicateProduct
  | DuplicatePackage
  | DuplicateCategory
  | ReferenceNotFound;

/** Result type used by product-catalog services. */
export type CatalogResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: CatalogError };
