import { z } from "zod/v4";
import { brandDtoSchema } from "./brands.ts";

const nullableDecimalSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/).nullable();

/** Product consumption types supported by the catalog. */
export const consumptionTypeSchema = z.enum(["FOOD", "DRINK", "SUPPLEMENT"]);
/** Reference bases supported by product macro profiles. */
export const macroReferenceBasisSchema = z.enum(["PER_100_G", "PER_100_ML", "PER_UNIT"]);
/** Origins supported for a stored calorie value. */
export const caloriesSourceSchema = z.enum(["AUTOMATIC", "MANUAL"]);

/** Macro profile shared by every product in one composition. */
export const macroProfileSchema = z.object({
  referenceBasis: macroReferenceBasisSchema,
  caloriesKcal: nullableDecimalSchema,
  proteinG: nullableDecimalSchema,
  carbohydratesG: nullableDecimalSchema,
  fatG: nullableDecimalSchema,
  caloriesSource: caloriesSourceSchema.nullable(),
}).strict();

/** Shared product-composition mutation input. */
export const productCompositionInputSchema = z.object({
  name: z.string(),
  categoryId: z.number().int().positive(),
  brandId: z.string().uuid().nullable().optional(),
  consumptionType: consumptionTypeSchema,
  macroProfile: macroProfileSchema.nullable().optional(),
}).strict();

/** Optional concrete-product content input. */
export const concreteProductContentInputSchema = z.object({
  amount: z.string(),
  unitTypeId: z.number().int().positive(),
}).strict();

/** Optional portion input belonging to one concrete product. */
export const productPortionInputSchema = z.object({
  singularName: z.string(),
  pluralName: z.string(),
  amount: z.string(),
  unitTypeId: z.number().int().positive(),
  portionsPerProduct: z.number().int().positive().nullable().optional(),
}).strict();

/** Concrete-product mutation input. */
export const concreteProductInputSchema = z.object({
  productCompositionId: z.string().uuid(),
  packageTypeId: z.number().int().positive().nullable().optional(),
  content: concreteProductContentInputSchema.nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  barcode: z.string().trim().min(1).nullable().optional(),
  portion: productPortionInputSchema.nullable().optional(),
}).strict();

/** Product-composition detail returned by catalog operations. */
export const productCompositionDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  categoryId: z.number().int().positive(),
  categoryPath: z.string(),
  brand: brandDtoSchema.nullable(),
  consumptionType: consumptionTypeSchema,
  macroProfile: macroProfileSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict();

/** Concrete-product list and detail summary. */
export const concreteProductSummarySchema = z.object({
  productId: z.string().uuid(),
  productCompositionId: z.string().uuid(),
  displayName: z.string(),
  compositionName: z.string(),
  brandName: z.string().nullable(),
  categoryPath: z.string(),
  consumptionType: consumptionTypeSchema,
  packageSummary: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  barcode: z.string().nullable(),
  archivedAt: z.string().nullable(),
}).strict();

/** Cursor page of concrete products. */
export const concreteProductPageSchema = z.object({
  items: z.array(concreteProductSummarySchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
}).strict();

export type ConsumptionType = z.infer<typeof consumptionTypeSchema>;
export type MacroReferenceBasis = z.infer<typeof macroReferenceBasisSchema>;
export type CaloriesSource = z.infer<typeof caloriesSourceSchema>;
export type MacroProfile = z.infer<typeof macroProfileSchema>;
export type ProductCompositionDetail = z.infer<typeof productCompositionDetailSchema>;
export type ProductCompositionInput = z.infer<typeof productCompositionInputSchema>;
export type ConcreteProductInput = z.infer<typeof concreteProductInputSchema>;
export type ConcreteProductSummary = z.infer<typeof concreteProductSummarySchema>;
export type ConcreteProductPage = z.infer<typeof concreteProductPageSchema>;
export type ProductPortionInput = z.infer<typeof productPortionInputSchema>;
