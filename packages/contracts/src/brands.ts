import { brands } from '../../../apps/backend/src/db/schema.ts';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const brandSelectSchema = createSelectSchema(brands, {
  id: z.string(),
  name: z.string(),
});
export const brandInsertSchema = createInsertSchema(brands, {
  id: z.string().optional(),
  name: z.string(),
});
export const brandUpdateSchema = createUpdateSchema(brands, {
  id: z.string().optional(),
  name: z.string().optional(),
});

export type Brand = z.infer<typeof brandSelectSchema>;
export type CreateBrandInput = z.infer<typeof brandInsertSchema>;
export type UpdateBrandInput = z.infer<typeof brandUpdateSchema>;
