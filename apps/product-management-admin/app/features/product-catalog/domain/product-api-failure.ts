/** Classified product-catalog failure exposed by the data boundary. */
export type ProductApiFailure = Error & {
  readonly kind: "ProductApiFailure";
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string>;
};

/** Determine whether an unknown failure is a classified product API failure. */
export function isProductApiFailure(error: unknown): error is ProductApiFailure {
  return error instanceof Error && Reflect.get(error, "kind") === "ProductApiFailure";
}
