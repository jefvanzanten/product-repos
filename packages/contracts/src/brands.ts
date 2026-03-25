import { brands } from '@product-repos/db-schema';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const brandSelectSchema = createSelectSchema(brands);
export const brandInsertSchema = createInsertSchema(brands);
export const brandUpdateSchema = createUpdateSchema(brands);

export type Brand = z.infer<typeof brandSelectSchema>;
export type CreateBrandInput = z.infer<typeof brandInsertSchema>;
export type UpdateBrandInput = z.infer<typeof brandUpdateSchema>;
