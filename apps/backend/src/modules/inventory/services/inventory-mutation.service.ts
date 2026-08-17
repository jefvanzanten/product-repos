import type { AddPhysicalInventoryItemsRequest, ProductStockThreshold, UpdatePhysicalInventoryContent, UpdatePhysicalInventoryExpiry, UpdatePhysicalInventoryLocation, UpdateProductStockThreshold } from "@product-repos/contracts/inventory";
import { err, ok, type Result } from "../../../result.ts";
import { projectLocationMetadata } from "../../locations/domain/location-domain.ts";
import { compareInventoryDecimals, multiplyInventoryDecimals, subtractInventoryDecimals } from "../domain/inventory-domain.ts";
import type { InventoryMutationRepository, InventoryMutationTransactionRepository, PhysicalInventoryRecord } from "../repositories/inventory-mutation.repository.ts";

/** Expected physical inventory mutation failures. */
export type InventoryMutationError = "PRODUCT_NOT_FOUND" | "PRODUCT_ARCHIVED" | "PRODUCT_CONTENT_UNKNOWN" | "LOCATION_NOT_FOUND" | "LOCATION_ARCHIVED" | "INVENTORY_ITEM_NOT_FOUND" | "INVENTORY_ITEM_VERSION_CONFLICT" | "AMOUNT_EXCEEDS_PRODUCT_CONTENT";

/** Physical inventory write use cases. */
export type InventoryMutationService = {
  readonly addInventory: (userId: string, input: AddPhysicalInventoryItemsRequest) => Result<ReadonlyArray<string>, InventoryMutationError>;
  readonly setContent: (userId: string, itemId: string, input: UpdatePhysicalInventoryContent) => Result<string | null, InventoryMutationError>;
  readonly moveItem: (userId: string, itemId: string, input: UpdatePhysicalInventoryLocation) => Result<string, InventoryMutationError>;
  readonly setExpiry: (userId: string, itemId: string, input: UpdatePhysicalInventoryExpiry) => Result<string, InventoryMutationError>;
  readonly removeItem: (userId: string, itemId: string, version: number) => Result<null, InventoryMutationError>;
  readonly setThreshold: (productId: string, input: UpdateProductStockThreshold) => Result<ProductStockThreshold, InventoryMutationError>;
};

/** Create physical inventory mutation operations. */
export function createInventoryMutationService(store: InventoryMutationRepository, now: () => string = () => new Date().toISOString(), createId: () => string = () => crypto.randomUUID()): InventoryMutationService {
  /** Create N independent full physical items and ADD audit rows. */
  function addInventory(userId: string, input: AddPhysicalInventoryItemsRequest): Result<ReadonlyArray<string>, InventoryMutationError> {
    return store.transaction((transaction) => {
      const product = transaction.findProductStatus(input.productId);
      if (product === undefined) return err("PRODUCT_NOT_FOUND");
      if (product.archivedAt !== null) return err("PRODUCT_ARCHIVED");
      if (product.contentAmount === null || product.conversionToBase === null || product.dimension === null) return err("PRODUCT_CONTENT_UNKNOWN");
      const locationError = validateLocation(transaction, input.locationId);
      if (locationError !== null) return err(locationError);
      const maximum = multiplyInventoryDecimals(product.contentAmount, product.conversionToBase);
      const timestamp = now();
      const itemIds: string[] = [];
      for (let index = 0; index < input.quantity; index += 1) {
        const itemId = createId();
        const item = transaction.insertItem({ id: itemId, productId: input.productId, locationId: input.locationId, expiryDate: input.expiryDate ?? null, remainingAmountBase: maximum, version: 0, createdAt: timestamp, updatedAt: timestamp });
        transaction.insertMutation({ id: createId(), inventoryItemId: item.id, kind: "ADD", amountDeltaBase: maximum, resultingAmountBase: maximum, fromLocationId: null, toLocationId: item.locationId, fromExpiryDate: null, toExpiryDate: item.expiryDate, userId, createdAt: timestamp });
        itemIds.push(item.id);
      }
      return ok(itemIds);
    });
  }

  /** Optimistically set remaining content; zero deactivates the item. */
  function setContent(userId: string, itemId: string, input: UpdatePhysicalInventoryContent): Result<string | null, InventoryMutationError> {
    return store.transaction((transaction) => {
      const itemResult = findMutableItem(transaction, itemId, input.version);
      if (!itemResult.ok) return itemResult;
      const maximumResult = maximumForItem(transaction, itemResult.value);
      if (!maximumResult.ok) return maximumResult;
      if (compareInventoryDecimals(input.remainingAmountBase, maximumResult.value.maximum) > 0) return err("AMOUNT_EXCEEDS_PRODUCT_CONTENT");
      if (maximumResult.value.dimension === "COUNT" && !/^\d+$/.test(input.remainingAmountBase)) return err("AMOUNT_EXCEEDS_PRODUCT_CONTENT");
      const empty = compareInventoryDecimals(input.remainingAmountBase, "0") === 0;
      const storedAmount = empty ? "0" : input.remainingAmountBase;
      const timestamp = now();
      const updated = transaction.updateContent(itemId, input.version, storedAmount, timestamp);
      if (updated === undefined) return err("INVENTORY_ITEM_VERSION_CONFLICT");
      transaction.insertMutation(auditValues(userId, updated, empty ? "REMOVE" : "CONTENT_SET", timestamp, {
        amountDeltaBase: subtractInventoryDecimals(storedAmount, itemResult.value.remainingAmountBase),
        resultingAmountBase: storedAmount,
      }));
      return ok(empty ? null : itemId);
    });
  }

  /** Optimistically move one physical item to an active location. */
  function moveItem(userId: string, itemId: string, input: UpdatePhysicalInventoryLocation): Result<string, InventoryMutationError> {
    return store.transaction((transaction) => {
      const itemResult = findMutableItem(transaction, itemId, input.version);
      if (!itemResult.ok) return itemResult;
      const locationError = validateLocation(transaction, input.locationId);
      if (locationError !== null) return err(locationError);
      const timestamp = now();
      const updated = transaction.updateLocation(itemId, input.version, input.locationId, timestamp);
      if (updated === undefined) return err("INVENTORY_ITEM_VERSION_CONFLICT");
      transaction.insertMutation(auditValues(userId, updated, "MOVE", timestamp, { fromLocationId: itemResult.value.locationId, toLocationId: input.locationId }));
      return ok(itemId);
    });
  }

  /** Optimistically set or clear one physical item's expiry date. */
  function setExpiry(userId: string, itemId: string, input: UpdatePhysicalInventoryExpiry): Result<string, InventoryMutationError> {
    return store.transaction((transaction) => {
      const itemResult = findMutableItem(transaction, itemId, input.version);
      if (!itemResult.ok) return itemResult;
      const timestamp = now();
      const updated = transaction.updateExpiry(itemId, input.version, input.expiryDate, timestamp);
      if (updated === undefined) return err("INVENTORY_ITEM_VERSION_CONFLICT");
      transaction.insertMutation(auditValues(userId, updated, "DATE_CHANGE", timestamp, { fromExpiryDate: itemResult.value.expiryDate, toExpiryDate: input.expiryDate }));
      return ok(itemId);
    });
  }

  /** Optimistically empty one item while retaining its audit history. */
  function removeItem(userId: string, itemId: string, version: number): Result<null, InventoryMutationError> {
    const result = setContent(userId, itemId, { remainingAmountBase: "0", version });
    return result.ok ? ok(null) : result;
  }

  /** Set a manual low-stock threshold for one concrete product. */
  function setThreshold(productId: string, input: UpdateProductStockThreshold): Result<ProductStockThreshold, InventoryMutationError> {
    return store.transaction((transaction) => {
      if (transaction.findProductStatus(productId) === undefined) return err("PRODUCT_NOT_FOUND");
      transaction.upsertThreshold(productId, input.lowStockAmountBase, input.movementClass, now());
      return ok({ productId, lowStockAmountBase: input.lowStockAmountBase, movementClass: input.movementClass });
    });
  }

  return { addInventory, setContent, moveItem, setExpiry, removeItem, setThreshold };
}

/** Validate that a location exists and is effectively active. */
function validateLocation(transaction: InventoryMutationTransactionRepository, locationId: number): "LOCATION_NOT_FOUND" | "LOCATION_ARCHIVED" | null {
  const rows = transaction.findAllLocations();
  if (!rows.some((row) => row.id === locationId)) return "LOCATION_NOT_FOUND";
  return projectLocationMetadata(rows).get(locationId)?.isEffectivelyArchived ? "LOCATION_ARCHIVED" : null;
}

/** Find an active item and validate its optimistic version. */
function findMutableItem(transaction: InventoryMutationTransactionRepository, itemId: string, version: number): Result<PhysicalInventoryRecord, InventoryMutationError> {
  const item = transaction.findItem(itemId);
  if (item === undefined || item.remainingAmountBase === "0") return err("INVENTORY_ITEM_NOT_FOUND");
  if (item.version !== version) return err("INVENTORY_ITEM_VERSION_CONFLICT");
  return ok(item);
}

/** Derive an item's current live maximum and dimension. */
function maximumForItem(transaction: InventoryMutationTransactionRepository, item: PhysicalInventoryRecord): Result<{ readonly maximum: string; readonly dimension: "MASS" | "VOLUME" | "COUNT" }, InventoryMutationError> {
  const product = transaction.findProductStatus(item.productId);
  if (product === undefined) return err("PRODUCT_NOT_FOUND");
  if (product.contentAmount === null || product.conversionToBase === null || product.dimension === null) return err("PRODUCT_CONTENT_UNKNOWN");
  return ok({ maximum: multiplyInventoryDecimals(product.contentAmount, product.conversionToBase), dimension: product.dimension });
}

/** Build defaulted immutable audit values for one updated item. */
function auditValues(userId: string, item: PhysicalInventoryRecord, kind: "CONTENT_SET" | "MOVE" | "DATE_CHANGE" | "REMOVE", createdAt: string, overrides: Partial<{ amountDeltaBase: string; resultingAmountBase: string; fromLocationId: number; toLocationId: number; fromExpiryDate: string | null; toExpiryDate: string | null }>) {
  return { id: crypto.randomUUID(), inventoryItemId: item.id, kind, amountDeltaBase: overrides.amountDeltaBase ?? null, resultingAmountBase: overrides.resultingAmountBase ?? item.remainingAmountBase, fromLocationId: overrides.fromLocationId ?? null, toLocationId: overrides.toLocationId ?? null, fromExpiryDate: overrides.fromExpiryDate ?? null, toExpiryDate: overrides.toExpiryDate ?? null, userId, createdAt };
}
