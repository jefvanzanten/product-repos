/** Supported physical-inventory list filters. */
export type InventoryFilter = "all" | "low-stock" | "expiring";

/** Base dimensions supported by concrete products. */
export type InventoryDimension = "MASS" | "VOLUME" | "COUNT";

/** Product that can be held in physical inventory. */
export type InventoryProduct = {
  readonly productId: string;
  readonly displayName: string;
  readonly compositionName: string;
  readonly brandName: string | null;
  readonly packageSummary: string;
  readonly categoryPath: string;
  readonly imageUrl: string | null;
  readonly maximumAmountBase: string;
  readonly baseUnitSymbol: "g" | "ml" | "st";
  readonly dimension: InventoryDimension;
  readonly archivedAt: string | null;
};

/** Persisted physical package state. */
export type PhysicalInventoryItem = {
  readonly id: string;
  readonly productId: string;
  readonly locationId: number;
  readonly expiryDate: string | null;
  readonly remainingAmountBase: string;
  readonly maximumAmountBase: string;
  readonly remainingRatio: number;
  readonly isFull: boolean;
  readonly version: number;
};

/** Physical package enriched for editing and presentation. */
export type PhysicalInventoryItemDetail = PhysicalInventoryItem & {
  readonly product: InventoryProduct;
  readonly locationPath: string;
  readonly isLocationArchived: boolean;
};

/** Equivalent full packages grouped by location and expiry date. */
export type FullInventoryGroup = {
  readonly productId: string;
  readonly locationId: number;
  readonly locationPath: string;
  readonly expiryDate: string | null;
  readonly count: number;
  readonly itemIds: ReadonlyArray<string>;
};

/** Product-oriented physical-inventory projection. */
export type PhysicalInventoryProductGroup = {
  readonly product: InventoryProduct;
  readonly totalPackageEquivalent: number;
  readonly earliestExpiryStatus: "EXPIRED" | "TODAY" | "URGENT" | "SOON" | "LATER" | "NONE";
  readonly isLowStock: boolean;
  readonly lowStockAmountBase: string | null;
  readonly fullGroups: ReadonlyArray<FullInventoryGroup>;
  readonly partialItems: ReadonlyArray<PhysicalInventoryItemDetail>;
};

/** Cursor page of grouped physical inventory. */
export type PhysicalInventoryPage = {
  readonly groups: ReadonlyArray<PhysicalInventoryProductGroup>;
  readonly nextCursor: string | null;
};

/** One node in the active storage-location tree. */
export type InventoryLocation = {
  readonly id: number;
  readonly name: string;
  readonly parentId: number | null;
  readonly path: string;
  readonly archivedAt: string | null;
  readonly isEffectivelyArchived: boolean;
  readonly children: ReadonlyArray<InventoryLocation>;
};

/** Input for creating separate full physical packages. */
export type AddPhysicalInventoryItems = {
  readonly productId: string;
  readonly quantity: number;
  readonly locationId: number;
  readonly expiryDate: string | null;
};

/** Editable fields staged in the physical-package dialog. */
export type InventoryItemDraft = {
  readonly remainingAmountBase: string;
  readonly locationId: number;
  readonly expiryDate: string | null;
};

/** Manual low-stock threshold replacement. */
export type UpdateStockThreshold = {
  readonly lowStockAmountBase: string;
  readonly movementClass: "SLOW" | "MEDIUM" | "FAST" | null;
};

/** Persisted manual low-stock threshold. */
export type ProductStockThreshold = UpdateStockThreshold & {
  readonly productId: string;
};
