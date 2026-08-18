import { z } from "zod/v4";
import { brandDtoSchema } from "./brands.ts";
import { categoryDtoSchema } from "./categories.ts";
import { unitContentDtoSchema, unitDimensionSchema } from "./unit-types.ts";

const decimalSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);
const nullableDecimalSchema = decimalSchema.nullable();

/** Product consumption types supported by the catalog. */
export const consumptionTypeSchema = z.enum(["FOOD", "DRINK", "SUPPLEMENT"]);
/** Reference bases supported by product macro profiles. */
export const macroReferenceBasisSchema = z.enum(["PER_100_G", "PER_100_ML", "PER_UNIT"]);
/** Origins supported for a stored calorie value. */
export const caloriesSourceSchema = z.enum(["AUTOMATIC", "MANUAL"]);

/** Macro values shared by every product in one composition. */
export const macroProfileSchema = z.object({
  referenceBasis: macroReferenceBasisSchema,
  caloriesKcal: nullableDecimalSchema,
  proteinG: nullableDecimalSchema,
  carbohydratesG: nullableDecimalSchema,
  fatG: nullableDecimalSchema,
  caloriesSource: caloriesSourceSchema.nullable(),
}).strict();

/** A persisted macro profile including whether calculations may use it. */
export const storedMacroProfileSchema = macroProfileSchema.extend({
  enabled: z.boolean(),
}).strict();

/** Explicit activation or non-destructive deactivation of macro values. */
export const macroProfileMutationSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(true), profile: macroProfileSchema }).strict(),
  z.object({ enabled: z.literal(false) }).strict(),
]);

/** A composition returned by autocomplete and composition mutations. */
export const productCompositionDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand: brandDtoSchema.nullable(),
  category: categoryDtoSchema,
  categoryPath: z.array(categoryDtoSchema),
  consumptionType: consumptionTypeSchema.nullable(),
  macroProfile: storedMacroProfileSchema.nullable(),
  productCount: z.number().int().nonnegative(),
  activeProductCount: z.number().int().nonnegative().optional(),
}).strict();

/** Input for creating a shared product composition. */
export const createProductCompositionSchema = z.object({
  name: z.string(),
  brandId: z.string().uuid().nullable().optional(),
  categoryId: z.number().int().positive(),
  consumptionType: consumptionTypeSchema.nullable(),
  macroProfile: macroProfileSchema.nullable().optional(),
}).strict();

/** Input for updating shared product-composition identity and classification fields. */
export const updateProductCompositionSchema = createProductCompositionSchema.omit({ macroProfile: true }).strict();

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

/** Concrete-product list summary. */
export const concreteProductSummarySchema = z.object({
  productId: z.string().uuid(),
  productCompositionId: z.string().uuid(),
  displayName: z.string(),
  compositionName: z.string(),
  brandName: z.string().nullable(),
  categoryPath: z.string(),
  consumptionType: consumptionTypeSchema.nullable(),
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

/** Full concrete-product detail. */
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

export type ConsumptionType = z.infer<typeof consumptionTypeSchema>;
export type MacroReferenceBasis = z.infer<typeof macroReferenceBasisSchema>;
export type CaloriesSource = z.infer<typeof caloriesSourceSchema>;
export type MacroProfile = z.infer<typeof macroProfileSchema>;
export type StoredMacroProfile = z.infer<typeof storedMacroProfileSchema>;
export type MacroProfileMutation = z.infer<typeof macroProfileMutationSchema>;
export type ProductCompositionDto = z.infer<typeof productCompositionDtoSchema>;
export type CreateProductComposition = z.infer<typeof createProductCompositionSchema>;
export type UpdateProductComposition = z.infer<typeof updateProductCompositionSchema>;
export type ConcreteProductPortionDto = z.infer<typeof concreteProductPortionDtoSchema>;
export type ConcreteProductPortionInput = z.infer<typeof concreteProductPortionInputSchema>;
export type ConcreteProductSummary = z.infer<typeof concreteProductSummarySchema>;
export type ConcreteProductPage = z.infer<typeof concreteProductPageSchema>;
export type ConcreteProductDetail = z.infer<typeof concreteProductDetailSchema>;
export type CreateConcreteProduct = z.infer<typeof createConcreteProductSchema>;
export type UpdateConcreteProduct = z.infer<typeof updateConcreteProductSchema>;
