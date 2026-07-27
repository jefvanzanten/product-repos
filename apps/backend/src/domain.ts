export type ApiErrorCode = "VALIDATION_ERROR" | "REFERENCE_NOT_FOUND" | "CATEGORY_ALREADY_EXISTS" | "CATEGORY_HAS_CHILDREN" | "CATEGORY_HAS_PRODUCTS" | "PRODUCT_ALREADY_EXISTS" | "PRODUCT_NOT_FOUND" | "PRODUCT_PACKAGE_ALREADY_EXISTS" | "PRODUCT_PACKAGE_NOT_FOUND";

export type ApiError = {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly fields?: Record<string, string>;
  readonly existingProductId?: string;
};

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ApiError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (error: ApiError): Result<never> => ({ ok: false, error });

export function trimRequired(value: unknown, field: string): Result<string> {
  if (typeof value !== "string") return err({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { [field]: "Required text is invalid" } });
  const trimmed = value.trim();
  if (trimmed.length === 0) return err({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { [field]: "Required text is invalid" } });
  return ok(trimmed);
}

export function canonicalDecimal(value: unknown): Result<string> {
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value)) return err({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { amount: "Amount must be a positive decimal string" } });
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return err({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { amount: "Amount must be positive" } });
  return ok(String(number));
}

export function positiveInt(value: unknown, field: string): Result<number> {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return err({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { [field]: "Must be an integer >= 1" } });
  return ok(value);
}
