import type { ApiError, Result } from "../../domain";
import { DuplicateCategory, DuplicatePackage, DuplicateProduct, InvalidCatalogForm, PackageNotFound, ProductNotFound, ReferenceNotFound, type CatalogError, type CatalogResult } from "../models/product-catalog-result.model";

/** Create a successful catalog result. */
export function catalogOk<T>(value: T): CatalogResult<T> {
  return { ok: true, value };
}

/** Create a failed catalog result. */
export function catalogErr(error: CatalogError): CatalogResult<never> {
  return { ok: false, error };
}

/** Lift an existing repository result into the catalog result type while preserving expected errors as typed values. */
export function fromResult<T>(result: Result<T>): CatalogResult<T> {
  if (result.ok) return catalogOk(result.value);
  return catalogErr(apiErrorToCatalogError(result.error));
}

function apiErrorToCatalogError(error: ApiError): CatalogError {
  switch (error.code) {
    case "VALIDATION_ERROR":
      return new InvalidCatalogForm(error.fields ?? {}, error.message);
    case "REFERENCE_NOT_FOUND":
      return new ReferenceNotFound();
    case "CATEGORY_ALREADY_EXISTS":
      return new DuplicateCategory();
    case "PRODUCT_ALREADY_EXISTS":
      return new DuplicateProduct(error.existingProductId);
    case "PRODUCT_NOT_FOUND":
      return new ProductNotFound("");
    case "PRODUCT_PACKAGE_ALREADY_EXISTS":
      return new DuplicatePackage();
    case "PRODUCT_PACKAGE_NOT_FOUND":
      return new PackageNotFound("", "");
    case "CATEGORY_HAS_CHILDREN":
    case "CATEGORY_HAS_PRODUCTS":
      return new InvalidCatalogForm({}, error.message);
  }
}
