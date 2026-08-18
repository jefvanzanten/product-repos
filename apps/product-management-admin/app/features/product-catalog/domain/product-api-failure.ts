/** Classified product-catalog failure exposed by the data boundary. */
export type ProductApiFailure = Error & {
  readonly kind: "ProductApiFailure";
  readonly status: number;
  readonly code?: string;
  readonly fields?: Readonly<Record<string, string>>;
};

/** Determine whether a failure is a classified product API failure. */
export function isProductApiFailure(error: Error): error is ProductApiFailure {
  return "kind" in error && error.kind === "ProductApiFailure";
}
