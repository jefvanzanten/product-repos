import type { location, physicalInventoryItem, physicalInventoryMutation } from "./schema";

export type CreateLocationInput = typeof location.$inferInsert;
export type CreatePhysicalInventoryItemInput = typeof physicalInventoryItem.$inferInsert;
export type CreatePhysicalInventoryMutationInput = typeof physicalInventoryMutation.$inferInsert;
