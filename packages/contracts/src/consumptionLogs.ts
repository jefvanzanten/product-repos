import { consumptionLogs } from "@product-repos/db-schema";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod/v4";
import { productSelectSchema } from "./products.js";
import { unitTypeSelectSchema } from "./unit-types.js";

export const consumptionLogSelectSchema = createSelectSchema(consumptionLogs);
export const consumptionLogInsertSchema = createInsertSchema(consumptionLogs);
export const consumptionLogUpdateSchema = createUpdateSchema(consumptionLogs);

export const consumptionLogsWithRelationsSchema =
  consumptionLogSelectSchema.extend({
    product: productSelectSchema,
    servingUnit: unitTypeSelectSchema,
  });

export type ConsumptionLog = z.infer<typeof consumptionLogSelectSchema>;
export type CreateConsumptionLogInput = z.infer<
  typeof consumptionLogInsertSchema
>;
export type UpdateConsumptionLogInput = z.infer<
  typeof consumptionLogUpdateSchema
>;
export type ConsumptionLogWithRelations = z.infer<
  typeof consumptionLogsWithRelationsSchema
>;
