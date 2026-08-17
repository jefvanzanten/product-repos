import { z } from "zod/v4";
import { brandDtoSchema } from "./brands.ts";
import { categoryDtoSchema } from "./categories.ts";
import { concreteProductPageSchema, concreteProductSummarySchema, consumptionTypeSchema, macroProfileSchema } from "./products.ts";
import type { ConcreteProductPage, ConcreteProductSummary } from "./products.ts";
import { unitContentDtoSchema, unitDimensionSchema } from "./unit-types.ts";

const decimalSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);

/** A composition returned by autocomplete and composition mutations. */
export const productCompositionDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand: brandDtoSchema.nullable(),
  category: categoryDtoSchema,
  categoryPath: z.array(categoryDtoSchema),
  consumptionType: consumptionTypeSchema,
  macroProfile: macroProfileSchema.nullable(),
  productCount: z.number().int().nonnegative(),
  activeProductCount: z.number().int().nonnegative().optional(),
}).strict();

/** Input for creating a shared product composition. */
export const createProductCompositionSchema = z.object({
  name: z.string(),
  brandId: z.string().uuid().nullable().optional(),
  categoryId: z.number().int().positive(),
  consumptionType: consumptionTypeSchema,
  macroProfile: macroProfileSchema.nullable().optional(),
}).strict();

/** Input for updating shared composition identity fields. */
export const updateProductCompositionSchema = createProductCompositionSchema.strict();

/** A product-specific portion. */
export const concreteProductPortionDtoSchema = z.object({
  singularName: z.string(),
  pluralName: z.string(),
  unitContent: unitContentDtoSchema,
  portionsPerProduct: z.number().int().positive().nullable(),
}).strict();

/** Product-specific portion mutation input. */
export const concreteProductPortionInputSchema = z.object({
  singularName: z.string(),
  pluralName: z.string(),
  amount: decimalSchema,
  unitTypeId: z.number().int().positive(),
  portionsPerProduct: z.number().int().positive().nullable().optional(),
}).strict();

/** Full concrete product detail. */
export const concreteProductDetailSchema = concreteProductSummarySchema.extend({
  composition: productCompositionDtoSchema,
  packageTypeId: z.number().int().positive().nullable(),
  content: z.object({ amount: decimalSchema, unitTypeId: z.number().int().positive(), symbol: z.string(), dimension: unitDimensionSchema }).strict().nullable(),
  imageUrl: z.string().url().nullable(),
  barcode: z.string().nullable(),
  portion: z.object({ singularName: z.string(), pluralName: z.string(), amount: decimalSchema, unitTypeId: z.number().int().positive(), portionsPerProduct: z.number().int().positive().nullable() }).strict().nullable(),
  archivedAt: z.string().nullable(),
}).strict();

/** Input for creating one concrete product. */
export const createConcreteProductSchema = z.object({
  productCompositionId: z.string().uuid(),
  packageTypeId: z.number().int().positive().nullable().optional(),
  content: z.object({ amount: decimalSchema, unitTypeId: z.number().int().positive() }).strict().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  barcode: z.string().nullable().optional(),
  portion: concreteProductPortionInputSchema.nullable().optional(),
}).strict();

/** Input for updating fields owned by one concrete product. */
export const updateConcreteProductSchema = createConcreteProductSchema.omit({ productCompositionId: true }).strict();

/** Canonical shared product-composition response shape. */
export const productCompositionSchema = productCompositionDtoSchema;
/** Canonical product-specific portion response shape. */
export const productPortionSchema = concreteProductPortionDtoSchema;
/** Canonical complete concrete-product response shape. */
export const concreteProductSchema = concreteProductDetailSchema;
/** Canonical concrete-product list shape. */
export const concreteProductListItemSchema = concreteProductSummarySchema;

export type ProductComposition = z.infer<typeof productCompositionSchema>;
export type ProductPortion = z.infer<typeof productPortionSchema>;
export type ConcreteProduct = z.infer<typeof concreteProductSchema>;
export type ConcreteProductListItem = z.infer<typeof concreteProductListItemSchema>;
export type ProductCompositionDto = z.infer<typeof productCompositionDtoSchema>;
export type CreateProductComposition = z.infer<typeof createProductCompositionSchema>;
export type UpdateProductComposition = z.infer<typeof updateProductCompositionSchema>;
export type ConcreteProductPortionDto = z.infer<typeof concreteProductPortionDtoSchema>;
export type ConcreteProductPortionInput = z.infer<typeof concreteProductPortionInputSchema>;
export { concreteProductPageSchema, concreteProductSummarySchema };
export type { ConcreteProductPage, ConcreteProductSummary };
export type ConcreteProductDetail = z.infer<typeof concreteProductDetailSchema>;
export type CreateConcreteProduct = z.infer<typeof createConcreteProductSchema>;
export type UpdateConcreteProduct = z.infer<typeof updateConcreteProductSchema>;
