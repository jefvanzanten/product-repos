import { products } from '../../../apps/backend/src/db/schema.ts';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { brandSelectSchema } from './brands.ts';
import { unitTypeSelectSchema } from './unit-types.ts';

const productTextColumns = {
  id: z.string(),
  name: z.string(),
  productTypeId: z.string(),
  brandId: z.string().nullable(),
  unitContentId: z.number(),
  barcode: z.string().nullable(),
};

export const productSelectSchema = createSelectSchema(products, productTextColumns);
export const productInsertSchema = createInsertSchema(products, {
  ...productTextColumns,
  id: z.string().optional(),
});
export const productUpdateSchema = createUpdateSchema(products, {
  id: z.string().optional(),
  name: z.string().optional(),
  productTypeId: z.string().optional(),
  brandId: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
});

export const productWithRelationsSchema = productSelectSchema.extend({
  brand: brandSelectSchema.nullable(),
  productType: z.unknown().nullable(),
  unitContent: z.unknown().nullable(),
  unitType: unitTypeSelectSchema.nullable(),
});

export type Product = z.infer<typeof productSelectSchema>;
export type CreateProductInput = z.infer<typeof productInsertSchema>;
export type UpdateProductInput = z.infer<typeof productUpdateSchema>;
export type ProductWithRelations = z.infer<typeof productWithRelationsSchema>;
