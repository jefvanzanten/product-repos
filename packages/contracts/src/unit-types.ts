import { z } from "zod/v4";

/** Dimensions supported by product content units. */
export const unitDimensionSchema = z.enum(["MASS", "VOLUME", "COUNT"]);

/** Unit type returned by the product catalog API. */
export const unitTypeDtoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  symbol: z.string(),
  dimension: unitDimensionSchema,
  conversionToBase: z.string(),
}).strict();

/** Unit content returned with a product package. */
export const unitContentDtoSchema = z.object({
  id: z.number().int(),
  amount: z.string(),
  unitType: unitTypeDtoSchema,
}).strict();

/** A supported unit dimension. */
export type UnitDimension = z.infer<typeof unitDimensionSchema>;
/** A product catalog unit type. */
export type UnitTypeDto = z.infer<typeof unitTypeDtoSchema>;
/** A quantity and its unit type. */
export type UnitContentDto = z.infer<typeof unitContentDtoSchema>;

/** Persistence-compatible unit type selection schema. */
export const unitTypeSelectSchema = unitTypeDtoSchema;
/** Persistence-compatible unit type insertion schema. */
export const unitTypeInsertSchema = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  symbol: z.string(),
  dimension: unitDimensionSchema,
  conversionToBase: z.string(),
}).strict();
/** Persistence-compatible unit type update schema. */
export const unitTypeUpdateSchema = unitTypeInsertSchema.partial().strict();
/** Backward-compatible unit type alias. */
export type UnitType = UnitTypeDto;
/** Input used to create a unit type. */
export type CreateUnitTypeInput = z.infer<typeof unitTypeInsertSchema>;
/** Input used to update a unit type. */
export type UpdateUnitTypeInput = z.infer<typeof unitTypeUpdateSchema>;
