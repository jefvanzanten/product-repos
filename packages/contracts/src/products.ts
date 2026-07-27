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
});

export const productCreatedDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: categoryDtoSchema,
  brand: brandDtoSchema.nullable(),
  package: productPackageDtoSchema,
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

export type ProductPackageDto = z.infer<typeof productPackageDtoSchema>;
export type ProductCreatedDto = z.infer<typeof productCreatedDtoSchema>;
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

export const productSelectSchema = productCreatedDtoSchema;
export const productInsertSchema = createProductRequestSchema;
export const productUpdateSchema = z.object({}).strict();
export const productWithRelationsSchema = productCreatedDtoSchema;
export type Product = ProductCreatedDto;
export type CreateProductInput = CreateProductRequest;
export type UpdateProductInput = z.infer<typeof productUpdateSchema>;
export type ProductWithRelations = ProductCreatedDto;
