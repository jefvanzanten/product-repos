import type { inventoryItem, inventoryMutation, location } from './schema';

export type CreateLocationInput = typeof location.$inferInsert;
export type CreateInventoryItemInput = typeof inventoryItem.$inferInsert;
export type CreateInventoryMutationInput = typeof inventoryMutation.$inferInsert;
