import { z } from "zod/v4";
import { brandDtoSchema } from "./brands.ts";
import { categoryDtoSchema } from "./categories.ts";
import { packageTypeDtoSchema } from "./package-types.ts";
import { unitContentDtoSchema } from "./unit-types.ts";

export const productPackageCoreDtoSchema = z.object({
  id: z.string().uuid(),
  packageType: packageTypeDtoSchema,
  unitContent: unitContentDtoSchema,
  unitsPerPackage: z.number().int(),
});

export const productPackageDtoSchema = productPackageCoreDtoSchema.extend({
  summary: z.string(),
});

export const productPackageListItemDtoSchema = productPackageDtoSchema;
export const productPackageDetailDtoSchema = productPackageDtoSchema.extend({
  productId: z.string().uuid(),
});

export const productCreatedDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: categoryDtoSchema,
  brand: brandDtoSchema.nullable(),
  package: productPackageDtoSchema,
});

export const productDetailDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  displayName: z.string(),
  category: categoryDtoSchema,
  categoryPath: categoryDtoSchema.array(),
  brand: brandDtoSchema.nullable(),
  packages: productPackageListItemDtoSchema.array(),
});

export const catalogProductRowSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  brand: brandDtoSchema.nullable(),
  categoryPath: z.string(),
  packageSummary: z.string(),
});

export const catalogCategoryRowSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  parentId: z.number().int().nullable(),
  path: z.string(),
  productCount: z.number().int().nonnegative(),
});

export const catalogBrandSearchResultSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  productCount: z.number().int().nonnegative(),
});

export const catalogSearchMoreStateSchema = z.object({
  products: z.boolean(),
  brands: z.boolean(),
  categories: z.boolean(),
});

export const catalogSearchResponseSchema = z.object({
  products: catalogProductRowSchema.array(),
  brands: catalogBrandSearchResultSchema.array(),
  categories: catalogCategoryRowSchema.array(),
  hasMore: catalogSearchMoreStateSchema,
});

export const catalogProductListSchema = z.object({
  items: catalogProductRowSchema.array(),
  hasMore: z.boolean(),
  cursor: z.string().nullable(),
});

export const catalogProductGroupSchema = z.object({
  category: categoryDtoSchema.nullable(),
  categoryPath: z.string(),
  products: catalogProductRowSchema.array(),
});

export const catalogRootBrowseResponseSchema = z.object({
  state: z.literal("root"),
  categories: catalogCategoryRowSchema.array(),
  isEmpty: z.boolean(),
});

export const catalogCategoryBrowseResponseSchema = z.object({
  state: z.literal("category"),
  category: catalogCategoryRowSchema,
  categoryPath: categoryDtoSchema.array(),
  subcategories: catalogCategoryRowSchema.array(),
  products: catalogProductListSchema,
});

export const catalogBrandBrowseResponseSchema = z.object({
  state: z.literal("brand"),
  brand: brandDtoSchema,
  productGroups: catalogProductGroupSchema.array(),
  hasMore: z.boolean(),
  cursor: z.string().nullable(),
});

export const catalogInvalidContextResponseSchema = z.object({
  state: z.literal("invalidContext"),
  contextType: z.enum(["brand", "category"]),
  contextId: z.string(),
});

export const catalogBrowseResponseSchema = z.discriminatedUnion("state", [
  catalogRootBrowseResponseSchema,
  catalogCategoryBrowseResponseSchema,
  catalogBrandBrowseResponseSchema,
  catalogInvalidContextResponseSchema,
]);

export const productPackageMutationRequestSchema = z.object({
  packageTypeId: z.number().int(),
  amount: z.string(),
  unitTypeId: z.number().int(),
  unitsPerPackage: z.number().int(),
}).strict();

export const createProductRequestSchema = z.object({
  name: z.string(),
  categoryId: z.number().int(),
  brandId: z.string().uuid().nullable().optional(),
  package: productPackageMutationRequestSchema,
}).strict();

export const updateProductRequestSchema = z.object({
  name: z.string(),
  categoryId: z.number().int(),
  brandId: z.string().uuid().nullable().optional(),
}).strict();

export const createProductPackageRequestSchema = productPackageMutationRequestSchema;
export const updateProductPackageRequestSchema = productPackageMutationRequestSchema;

export type ProductPackageCoreDto = z.infer<typeof productPackageCoreDtoSchema>;
export type ProductPackageDto = z.infer<typeof productPackageDtoSchema>;
export type ProductPackageListItemDto = z.infer<typeof productPackageListItemDtoSchema>;
export type ProductPackageDetailDto = z.infer<typeof productPackageDetailDtoSchema>;
export type ProductCreatedDto = z.infer<typeof productCreatedDtoSchema>;
export type ProductDetailDto = z.infer<typeof productDetailDtoSchema>;
export type CatalogProductRow = z.infer<typeof catalogProductRowSchema>;
export type CatalogCategoryRow = z.infer<typeof catalogCategoryRowSchema>;
export type CatalogBrandSearchResult = z.infer<typeof catalogBrandSearchResultSchema>;
export type CatalogSearchMoreState = z.infer<typeof catalogSearchMoreStateSchema>;
export type CatalogSearchResponse = z.infer<typeof catalogSearchResponseSchema>;
export type CatalogProductList = z.infer<typeof catalogProductListSchema>;
export type CatalogProductGroup = z.infer<typeof catalogProductGroupSchema>;
export type CatalogRootBrowseResponse = z.infer<typeof catalogRootBrowseResponseSchema>;
export type CatalogCategoryBrowseResponse = z.infer<typeof catalogCategoryBrowseResponseSchema>;
export type CatalogBrandBrowseResponse = z.infer<typeof catalogBrandBrowseResponseSchema>;
export type CatalogInvalidContextResponse = z.infer<typeof catalogInvalidContextResponseSchema>;
export type CatalogBrowseResponse = z.infer<typeof catalogBrowseResponseSchema>;
export type ProductPackageMutationRequest = z.infer<typeof productPackageMutationRequestSchema>;
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
export type CreateProductPackageRequest = z.infer<typeof createProductPackageRequestSchema>;
export type UpdateProductPackageRequest = z.infer<typeof updateProductPackageRequestSchema>;

/** Format a stable, human-readable package summary for catalog projections. */
export function formatProductPackageSummary(packageDto: ProductPackageCoreDto): string {
  const amountAndUnit = `${packageDto.unitContent.amount} ${packageDto.unitContent.unitType.name}`;
  if (packageDto.unitsPerPackage === 1) return `${packageDto.packageType.name} ${amountAndUnit}`;
  return `${packageDto.packageType.name} ${packageDto.unitsPerPackage} x ${amountAndUnit}`;
}

export const productSelectSchema = productCreatedDtoSchema;
export const productInsertSchema = createProductRequestSchema;
export const productUpdateSchema = updateProductRequestSchema;
export const productWithRelationsSchema = productDetailDtoSchema;
export type Product = ProductCreatedDto;
export type CreateProductInput = CreateProductRequest;
export type ProductPackageMutationInput = ProductPackageMutationRequest;
export type UpdateProductInput = z.infer<typeof productUpdateSchema>;
export type ProductWithRelations = ProductDetailDto;
