import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { inventoryItem, inventoryMutation, location, product, productPackage } from "../../../db/schema.ts";
import type { InventoryMutationStore, InventoryMutationTransaction } from "./inventory-mutation-store.ts";

type TransactionDatabase = Parameters<Parameters<BackendDatabase["transaction"]>[0]>[0];

/**
 * Create atomic Inventory mutation persistence for one database.
 *
 * @param database - Composed Drizzle database connection.
 * @returns The Inventory mutation store.
 */
export function createDrizzleInventoryMutationRepository(database: BackendDatabase): InventoryMutationStore {
  /** Execute one mutation use case inside a database transaction. */
  function transaction<T>(operation: (store: InventoryMutationTransaction) => T): T {
    return database.transaction((executor) => operation(createTransactionStore(executor)));
  }

  return { transaction };
}

/**
 * Bind Inventory mutation operations to an active transaction.
 *
 * @param executor - Active Drizzle transaction.
 * @returns Transaction-scoped Inventory operations.
 */
function createTransactionStore(executor: TransactionDatabase): InventoryMutationTransaction {
  /** Read package and owning-product archive status. */
  function findPackageStatus(productPackageId: number) {
    return executor.select({
      id: productPackage.id,
      productArchivedAt: product.archivedAt,
      packageArchivedAt: productPackage.archivedAt,
    }).from(productPackage)
      .innerJoin(product, eq(productPackage.productId, product.id))
      .where(eq(productPackage.id, productPackageId))
      .get();
  }

  /** Read all locations so effective archive status can be derived safely. */
  function findAllLocations() {
    return executor.select({
      id: location.id,
      parentId: location.parentId,
      name: location.name,
      archivedAt: location.archivedAt,
    }).from(location).orderBy(asc(location.id)).all();
  }

  /** Read the unique batch identified by package, location, and nullable date. */
  function findBatch(productPackageId: number, locationId: number, expiryDate: string | null) {
    const datePredicate = expiryDate === null
      ? isNull(inventoryItem.expiryDate)
      : eq(inventoryItem.expiryDate, expiryDate);
    return executor.select().from(inventoryItem).where(and(
      eq(inventoryItem.productPackageId, productPackageId),
      eq(inventoryItem.locationId, locationId),
      datePredicate,
    )).get();
  }

  /** Insert one new batch. */
  function insertBatch(values: Parameters<InventoryMutationTransaction["insertBatch"]>[0]) {
    const inserted = executor.insert(inventoryItem).values(values).returning().get();
    if (inserted === undefined) throw new Error("Inventory batch insert returned no row");
    return inserted;
  }

  /** Atomically add a quantity and advance the concurrency version. */
  function incrementBatch(id: string, quantity: number, updatedAt: string) {
    const updated = executor.update(inventoryItem).set({
      quantity: sql`${inventoryItem.quantity} + ${quantity}`,
      version: sql`${inventoryItem.version} + 1`,
      updatedAt,
    }).where(eq(inventoryItem.id, id)).returning().get();
    if (updated === undefined) throw new Error("Inventory batch increment returned no row");
    return updated;
  }

  /** Append one immutable add mutation. */
  function insertMutation(values: Parameters<InventoryMutationTransaction["insertMutation"]>[0]): void {
    const inserted = executor.insert(inventoryMutation).values(values).returning({ id: inventoryMutation.id }).get();
    if (inserted === undefined) throw new Error("Inventory mutation insert returned no row");
  }

  return { findPackageStatus, findAllLocations, findBatch, insertBatch, incrementBatch, insertMutation };
}
