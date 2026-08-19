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
  "PRODUCT_NOT_FOUND",
  "INVENTORY_ITEM_VERSION_CONFLICT",
  "PRODUCT_ARCHIVED",
  "PRODUCT_CONTENT_UNKNOWN",
  "AMOUNT_EXCEEDS_PRODUCT_CONTENT",
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

/** Canonical non-negative decimal used by physical inventory protocols. */
export const inventoryDecimalSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);

/** Expiry urgency derived from a physical item's local expiry date. */
export const inventoryExpiryStatusSchema = z.enum(["EXPIRED", "TODAY", "URGENT", "SOON", "LATER", "NONE"]);

/** Active concrete product selectable while adding physical inventory. */
export const inventoryProductSearchResultSchema = z.object({
  productId: z.string().uuid(),
  displayName: z.string().min(1),
  compositionName: z.string(),
  brandName: z.string().nullable(),
  package: z.object({
    typeName: z.string().min(1),
    contentAmount: inventoryDecimalSchema,
    contentUnitSymbol: z.string().min(1),
  }).strict(),
  categoryPath: z.string(),
  imageUrl: z.string().url().nullable(),
  maximumAmountBase: inventoryDecimalSchema,
  baseUnitSymbol: z.enum(["g", "ml", "st"]),
  dimension: z.enum(["MASS", "VOLUME", "COUNT"]),
  archivedAt: z.string().nullable(),
}).strict();

/** Request that creates separate full physical inventory items. */
export const addPhysicalInventoryItemsRequestSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  locationId: z.number().int().positive(),
  expiryDate: inventoryExpiryDateSchema.nullable().optional(),
}).strict();

/** One physical inventory item with its live product-derived maximum. */
export const physicalInventoryItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  locationId: z.number().int().positive(),
  expiryDate: inventoryExpiryDateSchema.nullable(),
  remainingAmountBase: inventoryDecimalSchema,
  maximumAmountBase: inventoryDecimalSchema,
  remainingRatio: z.number().min(0).max(1),
  isFull: z.boolean(),
  version: z.number().int().nonnegative(),
}).strict();

/** Physical inventory item enriched for item-detail presentation. */
export const physicalInventoryItemDetailSchema = physicalInventoryItemSchema.extend({
  product: inventoryProductSearchResultSchema,
  locationPath: z.string().min(1),
  isLocationArchived: z.boolean(),
}).strict();

/** Presentation-only grouping of equivalent full physical items. */
export const fullInventoryPresentationGroupSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.number().int().positive(),
  locationPath: z.string().min(1),
  expiryDate: inventoryExpiryDateSchema.nullable(),
  count: z.number().int().positive(),
  itemIds: z.array(z.string().uuid()).min(1),
}).strict();

/** Product-oriented projection of physical inventory items. */
export const physicalInventoryProductGroupSchema = z.object({
  product: inventoryProductSearchResultSchema,
  totalPackageEquivalent: z.number().nonnegative(),
  earliestExpiryStatus: inventoryExpiryStatusSchema,
  isLowStock: z.boolean(),
  lowStockAmountBase: inventoryDecimalSchema.nullable(),
  fullGroups: z.array(fullInventoryPresentationGroupSchema),
  partialItems: z.array(physicalInventoryItemDetailSchema),
}).strict();

/** Cursor page of product-oriented physical inventory. */
export const physicalInventoryPageSchema = z.object({
  groups: z.array(physicalInventoryProductGroupSchema),
  nextCursor: z.string().nullable(),
}).strict();

/** Optimistic update of one physical item's remaining base-unit content. */
export const updatePhysicalInventoryContentSchema = z.object({
  remainingAmountBase: inventoryDecimalSchema,
  version: z.number().int().nonnegative(),
}).strict();

/** Optimistic update of one physical item's location. */
export const updatePhysicalInventoryLocationSchema = z.object({
  locationId: z.number().int().positive(),
  version: z.number().int().nonnegative(),
}).strict();

/** Optimistic update of one physical item's expiry date. */
export const updatePhysicalInventoryExpirySchema = z.object({
  expiryDate: inventoryExpiryDateSchema.nullable(),
  version: z.number().int().nonnegative(),
}).strict();

/** Optimistic removal request for one physical item. */
export const removePhysicalInventoryItemSchema = z.object({
  version: z.number().int().nonnegative(),
}).strict();

/** Manual low-stock threshold for a concrete product. */
export const productStockThresholdSchema = z.object({
  productId: z.string().uuid(),
  lowStockAmountBase: inventoryDecimalSchema,
  movementClass: z.enum(["SLOW", "MEDIUM", "FAST"]).nullable(),
}).strict();

/** Request that sets a concrete product's manual low-stock threshold. */
export const updateProductStockThresholdSchema = z.object({
  lowStockAmountBase: inventoryDecimalSchema,
  movementClass: z.enum(["SLOW", "MEDIUM", "FAST"]).nullable().default(null),
}).strict();

export type InventoryErrorCode = z.infer<typeof inventoryErrorCodeSchema>;
export type InventoryErrorResponse = z.infer<typeof inventoryErrorResponseSchema>;
export type InventoryExpiryDate = z.infer<typeof inventoryExpiryDateSchema>;
export type InventoryDecimal = z.infer<typeof inventoryDecimalSchema>;
export type InventoryExpiryStatus = z.infer<typeof inventoryExpiryStatusSchema>;
export type InventoryProductSearchResult = z.infer<typeof inventoryProductSearchResultSchema>;
export type AddPhysicalInventoryItemsRequest = z.infer<typeof addPhysicalInventoryItemsRequestSchema>;
export type PhysicalInventoryItem = z.infer<typeof physicalInventoryItemSchema>;
export type PhysicalInventoryItemDetail = z.infer<typeof physicalInventoryItemDetailSchema>;
export type FullInventoryPresentationGroup = z.infer<typeof fullInventoryPresentationGroupSchema>;
export type PhysicalInventoryProductGroup = z.infer<typeof physicalInventoryProductGroupSchema>;
export type PhysicalInventoryPage = z.infer<typeof physicalInventoryPageSchema>;
export type UpdatePhysicalInventoryContent = z.infer<typeof updatePhysicalInventoryContentSchema>;
export type UpdatePhysicalInventoryLocation = z.infer<typeof updatePhysicalInventoryLocationSchema>;
export type UpdatePhysicalInventoryExpiry = z.infer<typeof updatePhysicalInventoryExpirySchema>;
export type RemovePhysicalInventoryItem = z.infer<typeof removePhysicalInventoryItemSchema>;
export type ProductStockThreshold = z.infer<typeof productStockThresholdSchema>;
export type UpdateProductStockThreshold = z.infer<typeof updateProductStockThresholdSchema>;
