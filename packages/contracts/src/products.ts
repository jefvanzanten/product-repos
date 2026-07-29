import { z } from "zod/v4";
import { brandDtoSchema } from "./brands.ts";
import { categoryDtoSchema } from "./categories.ts";
import { packageTypeDtoSchema } from "./package-types.ts";
import { unitContentDtoSchema } from "./unit-types.ts";

export const productPackageDtoSchema = z.object({
  id: z.number().int(),
  packageType: packageTypeDtoSchema,
  unitContent: unitContentDtoSchema,
  unitsPerPackage: z.number().int(),
  summary: z.string(),
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
  categoryPath: z.array(categoryDtoSchema),
  brand: brandDtoSchema.nullable(),
  packages: z.array(productPackageDtoSchema),
});

export const catalogProductRowSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  brand: brandDtoSchema.nullable(),
  categoryPath: z.string(),
  packageSummary: z.string(),
});

export const catalogCategoryRowSchema = categoryDtoSchema.extend({
  path: z.string(),
  productCount: z.number().int(),
});

export const catalogBrowseResponseSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("root"),
    categories: z.array(catalogCategoryRowSchema),
    isEmpty: z.boolean(),
  }),
  z.object({
    state: z.literal("category"),
    category: catalogCategoryRowSchema,
    categoryPath: z.array(categoryDtoSchema),
    subcategories: z.array(catalogCategoryRowSchema),
    products: z.object({
      items: z.array(catalogProductRowSchema),
      hasMore: z.boolean(),
      cursor: z.string().nullable(),
    }),
  }),
  z.object({
    state: z.literal("brand"),
    brand: brandDtoSchema,
    productGroups: z.array(z.object({
      category: categoryDtoSchema,
      categoryPath: z.string(),
      products: z.array(catalogProductRowSchema),
    })),
    hasMore: z.boolean(),
    cursor: z.string().nullable(),
  }),
]);

export const catalogSearchResponseSchema = z.object({
  products: z.array(catalogProductRowSchema),
  brands: z.array(brandDtoSchema.extend({ productCount: z.number().int() })),
  categories: z.array(catalogCategoryRowSchema),
  hasMore: z.object({
    products: z.boolean(),
    brands: z.boolean(),
    categories: z.boolean(),
  }),
});

export const createProductRequestSchema = z.object({
  name: z.string(),
  categoryId: z.number().int(),
  brandId: z.string().uuid().nullable().optional(),
  package: z.object({
    packageTypeId: z.number().int(),
    amount: z.string(),
    unitTypeId: z.number().int(),
    unitsPerPackage: z.number().int(),
  }).strict(),
}).strict();

export const updateProductRequestSchema = z.object({
  name: z.string(),
  categoryId: z.number().int(),
  brandId: z.string().uuid().nullable(),
}).strict();

export const productPackageRequestSchema = z.object({
  packageTypeId: z.number().int(),
  amount: z.string(),
  unitTypeId: z.number().int(),
  unitsPerPackage: z.number().int(),
}).strict();

export type ProductPackageDto = z.infer<typeof productPackageDtoSchema>;
export type ProductCreatedDto = z.infer<typeof productCreatedDtoSchema>;
export type ProductDetailDto = z.infer<typeof productDetailDtoSchema>;
export type CatalogProductRow = z.infer<typeof catalogProductRowSchema>;
export type CatalogCategoryRow = z.infer<typeof catalogCategoryRowSchema>;
export type CatalogBrowseResponse = z.infer<typeof catalogBrowseResponseSchema>;
export type CatalogSearchResponse = z.infer<typeof catalogSearchResponseSchema>;
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
export type ProductPackageRequest = z.infer<typeof productPackageRequestSchema>;

export const productSelectSchema = productCreatedDtoSchema;
export const productInsertSchema = createProductRequestSchema;
export const productUpdateSchema = updateProductRequestSchema;
export const productWithRelationsSchema = productDetailDtoSchema;
export type Product = ProductCreatedDto;
export type CreateProductInput = CreateProductRequest;
export type UpdateProductInput = UpdateProductRequest;
export type ProductWithRelations = ProductDetailDto;
