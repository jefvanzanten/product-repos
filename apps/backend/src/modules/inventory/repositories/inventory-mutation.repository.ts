import type { InventoryLocationRow } from "./inventory.repository.ts";

import { and, asc, eq, sql } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { concreteProduct, location, physicalInventoryItem, physicalInventoryMutation, productStockThreshold, unitContent, unitType } from "../../../db/schema.ts";

type TransactionDatabase = Parameters<Parameters<BackendDatabase["transaction"]>[0]>[0];


/** Product state required to validate and initialize physical stock. */
export type InventoryProductStatus = {
  readonly id: string;
  readonly archivedAt: string | null;
  readonly contentAmount: string | null;
  readonly conversionToBase: string | null;
  readonly dimension: "MASS" | "VOLUME" | "COUNT" | null;
};

/** Persisted physical item used by optimistic mutations. */
export type PhysicalInventoryRecord = {
  readonly id: string;
  readonly productId: string;
  readonly locationId: number;
  readonly expiryDate: string | null;
  readonly remainingAmountBase: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Immutable physical inventory audit values. */
export type InsertPhysicalInventoryMutation = {
  readonly id: string;
  readonly inventoryItemId: string;
  readonly kind: "ADD" | "CONTENT_SET" | "MOVE" | "DATE_CHANGE" | "REMOVE";
  readonly amountDeltaBase: string | null;
  readonly resultingAmountBase: string;
  readonly fromLocationId: number | null;
  readonly toLocationId: number | null;
  readonly fromExpiryDate: string | null;
  readonly toExpiryDate: string | null;
  readonly userId: string;
  readonly createdAt: string;
};

/** Transaction-bound physical inventory persistence operations. */
export type InventoryMutationTransactionRepository = {
  readonly findProductStatus: (productId: string) => InventoryProductStatus | undefined;
  readonly findAllLocations: () => ReadonlyArray<InventoryLocationRow>;
  readonly findItem: (itemId: string) => PhysicalInventoryRecord | undefined;
  readonly insertItem: (values: PhysicalInventoryRecord) => PhysicalInventoryRecord;
  readonly updateContent: (itemId: string, version: number, amount: string, updatedAt: string) => PhysicalInventoryRecord | undefined;
  readonly updateLocation: (itemId: string, version: number, locationId: number, updatedAt: string) => PhysicalInventoryRecord | undefined;
  readonly updateExpiry: (itemId: string, version: number, expiryDate: string | null, updatedAt: string) => PhysicalInventoryRecord | undefined;
  readonly insertMutation: (values: InsertPhysicalInventoryMutation) => void;
  readonly upsertThreshold: (productId: string, amount: string, movementClass: "SLOW" | "MEDIUM" | "FAST" | null, updatedAt: string) => void;
};

/** Atomic physical inventory mutation boundary. */
export type InventoryMutationRepository = {
  readonly transaction: <T>(operation: (store: InventoryMutationTransactionRepository) => T) => T;
};

/** Create atomic persistence for physical inventory mutations. */
export function createInventoryMutationRepository(database: BackendDatabase): InventoryMutationRepository {
  /** Run one operation inside a database transaction. */
  function transaction<T>(operation: (store: InventoryMutationTransactionRepository) => T): T {
    return database.transaction((executor) => operation(createTransactionStore(executor)));
  }
  return { transaction };
}

/** Bind mutation operations to an active transaction. */
function createTransactionStore(executor: TransactionDatabase): InventoryMutationTransactionRepository {
  /** Find concrete product status and content conversion. */
  function findProductStatus(productId: string) {
    return executor.select({
      id: concreteProduct.id,
      archivedAt: concreteProduct.archivedAt,
      contentAmount: unitContent.amount,
      conversionToBase: unitType.conversionToBase,
      dimension: unitType.dimension,
    }).from(concreteProduct)
      .leftJoin(unitContent, eq(concreteProduct.unitContentId, unitContent.id))
      .leftJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
      .where(eq(concreteProduct.id, productId)).get();
  }

  /** Read locations for existence and inherited archive checks. */
  function findAllLocations() {
    return executor.select({ id: location.id, parentId: location.parentId, name: location.name, archivedAt: location.archivedAt })
      .from(location).orderBy(asc(location.id)).all();
  }

  /** Find one physical item, including inactive empty items. */
  function findItem(itemId: string) {
    return executor.select().from(physicalInventoryItem).where(eq(physicalInventoryItem.id, itemId)).get();
  }

  /** Insert one physical item. */
  function insertItem(values: Parameters<InventoryMutationTransactionRepository["insertItem"]>[0]) {
    const row = executor.insert(physicalInventoryItem).values(values).returning().get();
    if (row === undefined) throw new Error("Physical inventory insert returned no row");
    return row;
  }

  /** Optimistically update remaining content. */
  function updateContent(itemId: string, version: number, amount: string, updatedAt: string) {
    return executor.update(physicalInventoryItem).set({ remainingAmountBase: amount, version: sql`${physicalInventoryItem.version} + 1`, updatedAt })
      .where(and(eq(physicalInventoryItem.id, itemId), eq(physicalInventoryItem.version, version))).returning().get();
  }

  /** Optimistically move one physical item. */
  function updateLocation(itemId: string, version: number, locationId: number, updatedAt: string) {
    return executor.update(physicalInventoryItem).set({ locationId, version: sql`${physicalInventoryItem.version} + 1`, updatedAt })
      .where(and(eq(physicalInventoryItem.id, itemId), eq(physicalInventoryItem.version, version))).returning().get();
  }

  /** Optimistically set one physical item's expiry date. */
  function updateExpiry(itemId: string, version: number, expiryDate: string | null, updatedAt: string) {
    return executor.update(physicalInventoryItem).set({ expiryDate, version: sql`${physicalInventoryItem.version} + 1`, updatedAt })
      .where(and(eq(physicalInventoryItem.id, itemId), eq(physicalInventoryItem.version, version))).returning().get();
  }

  /** Append one immutable physical inventory mutation. */
  function insertMutation(values: Parameters<InventoryMutationTransactionRepository["insertMutation"]>[0]): void {
    executor.insert(physicalInventoryMutation).values(values).run();
  }

  /** Insert or replace a product's manual low-stock threshold. */
  function upsertThreshold(productId: string, amount: string, movementClass: "SLOW" | "MEDIUM" | "FAST" | null, updatedAt: string): void {
    executor.insert(productStockThreshold).values({ productId, lowStockAmountBase: amount, movementClass, updatedAt })
      .onConflictDoUpdate({ target: productStockThreshold.productId, set: { lowStockAmountBase: amount, movementClass, updatedAt } }).run();
  }

  return { findProductStatus, findAllLocations, findItem, insertItem, updateContent, updateLocation, updateExpiry, insertMutation, upsertThreshold };
}
