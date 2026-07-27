import { z } from "zod/v4";

export const unitTypeDtoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const unitContentDtoSchema = z.object({
  id: z.number().int(),
  amount: z.string(),
  unitType: unitTypeDtoSchema,
});

export type UnitTypeDto = z.infer<typeof unitTypeDtoSchema>;
export type UnitContentDto = z.infer<typeof unitContentDtoSchema>;

export const unitTypeSelectSchema = unitTypeDtoSchema;
export const unitTypeInsertSchema = z.object({ id: z.number().int().optional(), name: z.string() }).strict();
export const unitTypeUpdateSchema = z.object({ id: z.number().int().optional(), name: z.string().optional() }).strict();
export type UnitType = UnitTypeDto;
export type CreateUnitTypeInput = z.infer<typeof unitTypeInsertSchema>;
export type UpdateUnitTypeInput = z.infer<typeof unitTypeUpdateSchema>;
