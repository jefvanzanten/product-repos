import { brands } from '@product-repos/db-schema';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
export const brandSelectSchema = createSelectSchema(brands);
export const brandInsertSchema = createInsertSchema(brands);
export const brandUpdateSchema = createUpdateSchema(brands);
//# sourceMappingURL=brands.js.map