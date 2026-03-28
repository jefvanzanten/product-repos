import { consumptions } from '@product-repos/db-schema';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const consumptionSelectSchema = createSelectSchema(consumptions);
export const consumptionInsertSchema = createInsertSchema(consumptions);
export const consumptionUpdateSchema = createUpdateSchema(consumptions);

export type Consumption = z.infer<typeof consumptionSelectSchema>;
export type CreateConsumptionInput = z.infer<typeof consumptionInsertSchema>;
export type UpdateConsumptionInput = z.infer<typeof consumptionUpdateSchema>;
