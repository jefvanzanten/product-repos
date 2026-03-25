import { unitType } from '@product-repos/db-schema';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
export const unitTypeSelectSchema = createSelectSchema(unitType);
export const unitTypeInsertSchema = createInsertSchema(unitType);
export const unitTypeUpdateSchema = createUpdateSchema(unitType);
//# sourceMappingURL=unit-types.js.map