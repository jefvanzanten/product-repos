import type { CreateProductRequest, ProductCreatedDto, ProductDetailDto, ProductPackageRequest, UpdateProductRequest } from "@product-repos/contracts";
import { err, type Result } from "../domain/catalog-domain.ts";
import { checkMacroProfileDimensions, parseProductMacroProfile } from "../domain/product-macro-profile.ts";
import type { ProductPackageRepository } from "../internal/product-packages.repository.ts";
import type { ProductRepository } from "../internal/products.repository.ts";
import type { ReferenceDataRepository } from "../internal/units.repository.ts";
import type { CatalogQueryService } from "./catalog-query.service.ts";

/** Parsed application input for product creation. */
export type CreateProductInput = Omit<CreateProductRequest, "brandId" | "package"> & {
  readonly brandId: string | null;
  readonly package: ProductPackageRequest;
};

/** Product aggregate use cases consumed by product routes. */
export type ProductService = {
  readonly createNewProduct: (input: CreateProductInput) => Result<ProductCreatedDto>;
  readonly getProductById: (productId: string) => Result<ProductDetailDto>;
  readonly updateExistingProduct: (productId: string, input: UpdateProductRequest) => Result<ProductDetailDto>;
};

/** Complete product-route use cases assembled by composition. */
export type CatalogProductRouteService = ProductService
  & Pick<ProductPackageRepository, "addProductPackage" | "getProductPackage" | "updateProductPackage">
  & CatalogQueryService;

/** Assemble the product route capability from current cohesive use cases. */
export function createCatalogProductRouteService(
  products: ProductService,
  packages: Pick<ProductPackageRepository, "addProductPackage" | "getProductPackage" | "updateProductPackage">,
  queries: CatalogQueryService,
): CatalogProductRouteService {
  return { ...products, ...packages, ...queries };
}

/** Create product aggregate use cases from persistence capabilities. */
export function createProductService(dependencies: {
  readonly products: Pick<ProductRepository, "createProduct" | "findProductPackageDimensions" | "getProductDetail" | "updateProduct">;
  readonly referenceData: Pick<ReferenceDataRepository, "findUnitTypeById">;
}): ProductService {
  const { createProduct, findProductPackageDimensions, getProductDetail, updateProduct } = dependencies.products;
  const { findUnitTypeById } = dependencies.referenceData;

/** Create a product after applying macro-profile and unit compatibility rules. */
function createNewProduct(input: CreateProductInput): Result<ProductCreatedDto> {
  const profile = parseProductMacroProfile(input.macroProfile);
  if (!profile.ok) return profile;

  const unitType = findUnitTypeById(input.package.unitTypeId);
  const portionUnitType = input.package.portion === null ? null : findUnitTypeById(input.package.portion.unitTypeId);
  if (!unitType || (input.package.portion !== null && portionUnitType === undefined)) return err({ code: "REFERENCE_NOT_FOUND", message: "Unit type not found" });
  if (portionUnitType !== null && portionUnitType !== undefined && portionUnitType.dimension !== unitType.dimension) {
    return err({ code: "UNIT_DIMENSION_INCOMPATIBLE", message: "Portion and package content must use the same unit dimension" });
  }
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
function getProductById(productId: string): Result<ProductDetailDto> {
  return getProductDetail(productId);
}

/** Update a product and macro profile after validating every existing package. */
function updateExistingProduct(productId: string, input: UpdateProductRequest): Result<ProductDetailDto> {
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

  return { createNewProduct, getProductById, updateExistingProduct };
}
