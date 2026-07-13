import { unitType } from '../../../apps/backend/src/db/schema.ts';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const unitTypeSelectSchema = createSelectSchema(unitType, {
  id: z.number(),
  name: z.string(),
});
export const unitTypeInsertSchema = createInsertSchema(unitType, {
  id: z.number().optional(),
  name: z.string(),
});
export const unitTypeUpdateSchema = createUpdateSchema(unitType, {
  id: z.number().optional(),
  name: z.string().optional(),
});

export type UnitType = z.infer<typeof unitTypeSelectSchema>;
export type CreateUnitTypeInput = z.infer<typeof unitTypeInsertSchema>;
export type UpdateUnitTypeInput = z.infer<typeof unitTypeUpdateSchema>;
