import { products } from '@product-repos/db-schema';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { brandSelectSchema } from './brands.js';
import { unitTypeSelectSchema } from './unit-types.js';

export const productSelectSchema = createSelectSchema(products);
export const productInsertSchema = createInsertSchema(products);
export const productUpdateSchema = createUpdateSchema(products);

export const productWithRelationsSchema = productSelectSchema.extend({
  brand: brandSelectSchema,
  unitType: unitTypeSelectSchema,
});

export type Product = z.infer<typeof productSelectSchema>;
export type CreateProductInput = z.infer<typeof productInsertSchema>;
export type UpdateProductInput = z.infer<typeof productUpdateSchema>;
export type ProductWithRelations = z.infer<typeof productWithRelationsSchema>;
