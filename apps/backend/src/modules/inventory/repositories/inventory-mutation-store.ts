import type { InventoryLocationRow } from "./inventory-reader.ts";

/** Catalog status required to validate an Inventory package reference. */
export type InventoryPackageStatus = {
  readonly id: number;
  readonly productArchivedAt: string | null;
  readonly packageArchivedAt: string | null;
};

/** Persisted Inventory batch fields used by the add use case. */
export type InventoryBatchRecord = {
  readonly id: string;
  readonly productPackageId: number;
  readonly locationId: number;
  readonly expiryDate: string | null;
  readonly quantity: number;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Values required to create one Inventory batch. */
export type InsertInventoryBatch = Omit<InventoryBatchRecord, "id" | "version" | "createdAt" | "updatedAt"> & {
  readonly id: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Values required to append one immutable Inventory mutation. */
export type InsertInventoryMutation = {
  readonly id: string;
  readonly inventoryItemId: string;
  readonly kind: "ADD";
  readonly quantityDelta: number;
  readonly resultingQuantity: number;
  readonly fromLocationId: number | null;
  readonly toLocationId: number;
  readonly fromExpiryDate: string | null;
  readonly toExpiryDate: string | null;
  readonly userId: string;
  readonly createdAt: string;
};

/** Transaction-bound persistence operations for adding Inventory. */
export type InventoryMutationTransaction = {
  readonly findPackageStatus: (productPackageId: number) => InventoryPackageStatus | undefined;
  readonly findAllLocations: () => ReadonlyArray<InventoryLocationRow>;
  readonly findBatch: (productPackageId: number, locationId: number, expiryDate: string | null) => InventoryBatchRecord | undefined;
  readonly insertBatch: (values: InsertInventoryBatch) => InventoryBatchRecord;
  readonly incrementBatch: (id: string, quantity: number, updatedAt: string) => InventoryBatchRecord;
  readonly insertMutation: (values: InsertInventoryMutation) => void;
};

/** Atomic Inventory mutation persistence boundary. */
export type InventoryMutationStore = {
  readonly transaction: <T>(operation: (store: InventoryMutationTransaction) => T) => T;
};
