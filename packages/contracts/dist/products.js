import { products } from '@product-repos/db-schema';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { brandSelectSchema } from './brands.js';
import { unitTypeSelectSchema } from './unit-types.js';
export const productSelectSchema = createSelectSchema(products);
export const productInsertSchema = createInsertSchema(products);
export const productUpdateSchema = createUpdateSchema(products);
export const productWithRelationsSchema = productSelectSchema.extend({
    brand: brandSelectSchema,
    unitType: unitTypeSelectSchema,
});
//# sourceMappingURL=products.js.map