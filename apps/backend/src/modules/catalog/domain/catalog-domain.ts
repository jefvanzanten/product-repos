import { err, ok, type Result as GenericResult } from "../../../result.ts";

/** Stable API error codes returned by backend application operations. */
export type ApiErrorCode = "VALIDATION_ERROR" | "REFERENCE_NOT_FOUND" | "BRAND_NOT_FOUND" | "CATEGORY_ALREADY_EXISTS" | "CATEGORY_HAS_CHILDREN" | "CATEGORY_HAS_PRODUCTS" | "PRODUCT_ALREADY_EXISTS" | "PRODUCT_NOT_FOUND" | "PRODUCT_COMPOSITION_ALREADY_EXISTS" | "PRODUCT_COMPOSITION_NOT_FOUND" | "BARCODE_ALREADY_EXISTS" | "REFERENCE_BASIS_IN_USE" | "PRODUCT_MACRO_PROFILE_INVALID" | "UNIT_DIMENSION_INCOMPATIBLE";

/** Safe API error projection. */
export type ApiError = {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly fields?: Record<string, string>;
  readonly existingProductId?: string;
};

/** Result of a catalog application operation. */
export type Result<T> = GenericResult<T, ApiError>;

export { err, ok };

/** Parse required text after trimming it. */
export function trimRequired(value: unknown, field: string): Result<string> {
  if (typeof value !== "string") return err({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { [field]: "Required text is invalid" } });
  const trimmed = value.trim();
  if (trimmed.length === 0) return err({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { [field]: "Required text is invalid" } });
  return ok(trimmed);
}

/** Parse a positive canonical decimal string for one named request field. */
export function canonicalDecimal(value: unknown, field = "amount"): Result<string> {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return err({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { [field]: "Amount must be a positive decimal string" } });
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return err({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { [field]: "Amount must be positive" } });
  return ok(String(number));
}

/** Parse a positive integer field. */
export function positiveInt(value: unknown, field: string): Result<number> {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return err({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { [field]: "Must be an integer >= 1" } });
  return ok(value);
}
