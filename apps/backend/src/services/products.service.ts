import type { CreateProductRequest, ProductCreatedDto, ProductDetailDto, ProductPackageRequest, UpdateProductRequest } from "@product-repos/contracts";
import { err, type Result } from "../domain";
import { checkMacroProfileDimensions, parseProductMacroProfile } from "../product-catalog/product-macro-profile";
import {
  createProduct,
  findProductPackageDimensions,
  getProductDetail,
  updateProduct,
} from "../repositories/products.repository";
import { findUnitTypeById } from "../repositories/units.repository";

/** Parsed application input for product creation. */
export type CreateProductInput = Omit<CreateProductRequest, "brandId" | "package"> & {
  readonly brandId: string | null;
  readonly package: ProductPackageRequest;
};

/** Create a product after applying macro-profile and unit compatibility rules. */
export function createNewProduct(input: CreateProductInput): Result<ProductCreatedDto> {
  const profile = parseProductMacroProfile(input.macroProfile);
  if (!profile.ok) return profile;

  const unitType = findUnitTypeById(input.package.unitTypeId);
  if (!unitType) return err({ code: "REFERENCE_NOT_FOUND", message: "Unit type not found" });
  const compatibility = checkMacroProfileDimensions(profile.value, [unitType.dimension]);
  if (!compatibility.ok) return compatibility;

  return createProduct({
    name: input.name,
    categoryId: input.categoryId,
    brandId: input.brandId,
    consumptionType: input.consumptionType,
    macroProfile: profile.value,
    package: input.package,
  });
}

/** Read a complete product detail projection. */
export function getProductById(productId: string): Result<ProductDetailDto> {
  return getProductDetail(productId);
}

/** Update a product and macro profile after validating every existing package. */
export function updateExistingProduct(productId: string, input: UpdateProductRequest): Result<ProductDetailDto> {
  const existing = getProductDetail(productId);
  if (!existing.ok) return existing;

  const profile = parseProductMacroProfile(input.macroProfile);
  if (!profile.ok) return profile;
  const compatibility = checkMacroProfileDimensions(profile.value, findProductPackageDimensions(productId));
  if (!compatibility.ok) return compatibility;

  return updateProduct({
    productId,
    name: input.name,
    categoryId: input.categoryId,
    brandId: input.brandId,
    consumptionType: input.consumptionType,
    macroProfile: profile.value,
  });
}
