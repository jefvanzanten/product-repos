import { unitType } from '@product-repos/db-schema';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const unitTypeSelectSchema = createSelectSchema(unitType);
export const unitTypeInsertSchema = createInsertSchema(unitType);
export const unitTypeUpdateSchema = createUpdateSchema(unitType);

export type UnitType = z.infer<typeof unitTypeSelectSchema>;
export type CreateUnitTypeInput = z.infer<typeof unitTypeInsertSchema>;
export type UpdateUnitTypeInput = z.infer<typeof unitTypeUpdateSchema>;
