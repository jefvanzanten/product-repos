import { z } from "zod/v4";

/** ISO local calendar date used for batch expiry dates. */
export const inventoryExpiryDateSchema = z.iso.date();

/** Stable Inventory API error codes. */
export const inventoryErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "REFERENCE_NOT_FOUND",
  "ADMIN_ROLE_REQUIRED",
  "INVENTORY_ITEM_NOT_FOUND",
  "LOCATION_NOT_FOUND",
  "PRODUCT_PACKAGE_NOT_FOUND",
  "INVENTORY_ITEM_VERSION_CONFLICT",
  "PRODUCT_PACKAGE_ARCHIVED",
  "LOCATION_ARCHIVED",
  "UNAUTHENTICATED",
  "AUTH_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

/** Strict error response returned by Inventory routes. */
export const inventoryErrorResponseSchema = z.object({
  code: inventoryErrorCodeSchema,
  message: z.string().min(1),
  fields: z.record(z.string(), z.string()).optional(),
}).strict();

/** One stock batch of one product package at one location. */
export const inventoryItemRowSchema = z.object({
  id: z.string().uuid(),
  locationId: z.number().int().positive(),
  locationPath: z.string().min(1),
  isLocationArchived: z.boolean(),
  expiryDate: inventoryExpiryDateSchema.nullable(),
  quantity: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
}).strict();

/** All current batches of one product package with derived presentation fields. */
export const inventoryProductGroupSchema = z.object({
  productId: z.string().uuid(),
  productPackageId: z.number().int().positive(),
  displayName: z.string().min(1),
  brandName: z.string().nullable(),
  packageSummary: z.string().min(1),
  categoryPath: z.string(),
  imageUrl: z.string().nullable(),
  totalQuantity: z.number().int().positive(),
  earliestExpiryDate: inventoryExpiryDateSchema.nullable(),
  archivedAt: z.string().nullable(),
  items: z.array(inventoryItemRowSchema),
}).strict();

/** One page of grouped inventory items. */
export const inventoryPageSchema = z.object({
  groups: z.array(inventoryProductGroupSchema),
  nextCursor: z.string().nullable(),
}).strict();

export type InventoryErrorCode = z.infer<typeof inventoryErrorCodeSchema>;
export type InventoryErrorResponse = z.infer<typeof inventoryErrorResponseSchema>;
export type InventoryExpiryDate = z.infer<typeof inventoryExpiryDateSchema>;
export type InventoryItemRow = z.infer<typeof inventoryItemRowSchema>;
export type InventoryProductGroup = z.infer<typeof inventoryProductGroupSchema>;
export type InventoryPage = z.infer<typeof inventoryPageSchema>;
