import { productTypes } from '../../../apps/backend/src/db/schema.ts';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

const productTypeTextColumns = {
  id: z.string(),
  name: z.string(),
};

export const productTypeSelectSchema = createSelectSchema(productTypes, productTypeTextColumns);
export const productTypeInsertSchema = createInsertSchema(productTypes, {
  id: z.string().optional(),
  name: z.string(),
});
export const productTypeUpdateSchema = createUpdateSchema(productTypes, {
  id: z.string().optional(),
  name: z.string().optional(),
});

export type ProductType = z.infer<typeof productTypeSelectSchema>;
export type CreateProductTypeInput = z.infer<typeof productTypeInsertSchema>;
export type UpdateProductTypeInput = z.infer<typeof productTypeUpdateSchema>;
