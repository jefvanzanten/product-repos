import { z } from "zod/v4";
import { brandDtoSchema } from "./brands.ts";
import { categoryDtoSchema } from "./categories.ts";
import { packageTypeDtoSchema } from "./package-types.ts";
import { unitContentDtoSchema } from "./unit-types.ts";

const nullableDecimalSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/).nullable();

/** Product consumption types supported by the catalog. */
export const consumptionTypeSchema = z.enum(["FOOD", "DRINK", "SUPPLEMENT"]);
/** Reference bases supported by product macro profiles. */
export const macroReferenceBasisSchema = z.enum(["PER_100_G", "PER_100_ML", "PER_UNIT"]);
/** Origins supported for a stored calorie value. */
export const caloriesSourceSchema = z.enum(["AUTOMATIC", "MANUAL"]);

/** Macro profile protocol shape shared by product requests and responses. */
export const macroProfileSchema = z.object({
  referenceBasis: macroReferenceBasisSchema,
  caloriesKcal: nullableDecimalSchema,
  proteinG: nullableDecimalSchema,
  carbohydratesG: nullableDecimalSchema,
  fatG: nullableDecimalSchema,
  caloriesSource: caloriesSourceSchema.nullable(),
}).strict();

/** Add the single- versus multi-package invariant to a package protocol value. */
function addPackageTypeInvariant(
  value: { readonly unitsPerPackage: number; readonly individualPackageTypeId: number | null },
  context: z.RefinementCtx,
  issuePath = "individualPackageTypeId",
): void {
  if (value.unitsPerPackage === 1 && value.individualPackageTypeId !== null) {
    context.addIssue({ code: "custom", path: [issuePath], message: "Single packages cannot have an individual package type" });
  }
  if (value.unitsPerPackage > 1 && value.individualPackageTypeId === null) {
    context.addIssue({ code: "custom", path: [issuePath], message: "Multi-packages require an individual package type" });
  }
}

/** Product package returned by the catalog API. */
export const productPackageDtoSchema = z.object({
  id: z.number().int(),
  packageType: packageTypeDtoSchema,
  individualPackageType: packageTypeDtoSchema.nullable(),
  unitContent: unitContentDtoSchema,
  unitsPerPackage: z.number().int().positive(),
  summary: z.string(),
}).strict().superRefine((value, context) => addPackageTypeInvariant({
  unitsPerPackage: value.unitsPerPackage,
  individualPackageTypeId: value.individualPackageType?.id ?? null,
}, context, "individualPackageType"));

/** Product creation response. */
export const productCreatedDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  consumptionType: consumptionTypeSchema,
  category: categoryDtoSchema,
  brand: brandDtoSchema.nullable(),
  macroProfile: macroProfileSchema.nullable(),
  package: productPackageDtoSchema,
}).strict();

/** Complete product detail response. */
export const productDetailDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  displayName: z.string(),
  consumptionType: consumptionTypeSchema,
  category: categoryDtoSchema,
  categoryPath: z.array(categoryDtoSchema),
  brand: brandDtoSchema.nullable(),
  macroProfile: macroProfileSchema.nullable(),
  packages: z.array(productPackageDtoSchema),
}).strict();

/** Product row returned by catalog browse and search endpoints. */
export const catalogProductRowSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  brand: brandDtoSchema.nullable(),
  consumptionType: consumptionTypeSchema,
  categoryPath: z.string(),
  packageSummary: z.string(),
}).strict();

/** Category row returned by catalog browse and search endpoints. */
export const catalogCategoryRowSchema = categoryDtoSchema.extend({
  path: z.string(),
  productCount: z.number().int(),
}).strict();

/** Catalog browse response. */
export const catalogBrowseResponseSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("root"), categories: z.array(catalogCategoryRowSchema), isEmpty: z.boolean() }).strict(),
  z.object({
    state: z.literal("category"),
    category: catalogCategoryRowSchema,
    categoryPath: z.array(categoryDtoSchema),
    subcategories: z.array(catalogCategoryRowSchema),
    products: z.object({ items: z.array(catalogProductRowSchema), hasMore: z.boolean(), cursor: z.string().nullable() }).strict(),
  }).strict(),
  z.object({
    state: z.literal("brand"),
    brand: brandDtoSchema,
    productGroups: z.array(z.object({ category: categoryDtoSchema, categoryPath: z.string(), products: z.array(catalogProductRowSchema) }).strict()),
    hasMore: z.boolean(),
    cursor: z.string().nullable(),
  }).strict(),
]);

/** Catalog search response. */
export const catalogSearchResponseSchema = z.object({
  products: z.array(catalogProductRowSchema),
  brands: z.array(brandDtoSchema.extend({ productCount: z.number().int() })),
  categories: z.array(catalogCategoryRowSchema),
  hasMore: z.object({ products: z.boolean(), brands: z.boolean(), categories: z.boolean() }).strict(),
}).strict();

/** Product package mutation request. */
export const productPackageRequestSchema = z.object({
  packageTypeId: z.number().int().positive(),
  individualPackageTypeId: z.number().int().positive().nullable(),
  amount: z.string(),
  unitTypeId: z.number().int().positive(),
  unitsPerPackage: z.number().int().positive(),
}).strict().superRefine(addPackageTypeInvariant);

/** Product creation request. */
export const createProductRequestSchema = z.object({
  name: z.string(),
  categoryId: z.number().int(),
  brandId: z.string().uuid().nullable().optional(),
  consumptionType: consumptionTypeSchema,
  macroProfile: macroProfileSchema.nullable().optional(),
  package: productPackageRequestSchema,
}).strict();

/** Product update request. */
export const updateProductRequestSchema = z.object({
  name: z.string(),
  categoryId: z.number().int(),
  brandId: z.string().uuid().nullable(),
  consumptionType: consumptionTypeSchema,
  macroProfile: macroProfileSchema.nullable(),
}).strict();

/** Product consumption type. */
export type ConsumptionType = z.infer<typeof consumptionTypeSchema>;
/** Macro profile reference basis. */
export type MacroReferenceBasis = z.infer<typeof macroReferenceBasisSchema>;
/** Calorie value origin. */
export type CaloriesSource = z.infer<typeof caloriesSourceSchema>;
/** Product macro profile protocol value. */
export type MacroProfile = z.infer<typeof macroProfileSchema>;
/** Product package protocol value. */
export type ProductPackageDto = z.infer<typeof productPackageDtoSchema>;
/** Product creation protocol response. */
export type ProductCreatedDto = z.infer<typeof productCreatedDtoSchema>;
/** Product detail protocol response. */
export type ProductDetailDto = z.infer<typeof productDetailDtoSchema>;
/** Catalog product protocol row. */
export type CatalogProductRow = z.infer<typeof catalogProductRowSchema>;
/** Catalog category protocol row. */
export type CatalogCategoryRow = z.infer<typeof catalogCategoryRowSchema>;
/** Catalog browse protocol response. */
export type CatalogBrowseResponse = z.infer<typeof catalogBrowseResponseSchema>;
/** Catalog search protocol response. */
export type CatalogSearchResponse = z.infer<typeof catalogSearchResponseSchema>;
/** Product creation protocol request. */
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
/** Product update protocol request. */
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
/** Product package mutation protocol request. */
export type ProductPackageRequest = z.infer<typeof productPackageRequestSchema>;

/** Backward-compatible product selection schema. */
export const productSelectSchema = productCreatedDtoSchema;
/** Backward-compatible product insertion schema. */
export const productInsertSchema = createProductRequestSchema;
/** Backward-compatible product update schema. */
export const productUpdateSchema = updateProductRequestSchema;
/** Backward-compatible product relation schema. */
export const productWithRelationsSchema = productDetailDtoSchema;
/** Backward-compatible product alias. */
export type Product = ProductCreatedDto;
/** Backward-compatible product creation alias. */
export type CreateProductInput = CreateProductRequest;
/** Backward-compatible product update alias. */
export type UpdateProductInput = UpdateProductRequest;
/** Backward-compatible product detail alias. */
export type ProductWithRelations = ProductDetailDto;
