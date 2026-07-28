/** Parsed URL state for the catalog overview. */
export type CatalogUrlState = {
  /** Search query from `q`; one-character terms intentionally do not search. */
  readonly q: string;
  /** Explicit brand result context. */
  readonly brandId: string | undefined;
  /** Explicit category browse context. */
  readonly categoryId: number | undefined;
  /** Cumulative product limit for browse states. */
  readonly limit: number;
};
