import { asc, eq } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { location } from "../../../db/schema.ts";
import type { InsertLocationValues, LocationStore, LocationTransactionStore, UpdateLocationValues } from "./location-store.ts";

type TransactionDatabase = Parameters<Parameters<BackendDatabase["transaction"]>[0]>[0];
type LocationExecutor = BackendDatabase | TransactionDatabase;

/**
 * Create the location persistence adapter for one injected database.
 *
 * @param database - Composed Drizzle database connection.
 * @returns The location store implementation.
 */
export function createDrizzleLocationRepository(database: BackendDatabase): LocationStore {
  /** Read every location in stable identifier order. */
  function findAll() {
    return readAll(database);
  }

  /** Execute one use case against a transaction-scoped adapter. */
  function transaction<T>(operation: (store: LocationTransactionStore) => T): T {
    return database.transaction((transactionDatabase) => operation(createTransactionStore(transactionDatabase)));
  }

  return { findAll, transaction };
}

/**
 * Create transaction-scoped persistence operations.
 *
 * @param executor - Active Drizzle transaction.
 * @returns Operations bound to that transaction.
 */
function createTransactionStore(executor: TransactionDatabase): LocationTransactionStore {
  /** Read all current rows inside the write transaction. */
  function findAll() {
    return readAll(executor);
  }

  /** Insert one normalized location. */
  function insert(values: InsertLocationValues) {
    const inserted = executor.insert(location).values(values).returning().get();
    if (inserted === undefined) throw new Error("Location insert returned no row");
    return inserted;
  }

  /** Update one existing location atomically. */
  function update(id: number, values: UpdateLocationValues) {
    const updated = executor.update(location).set(values).where(eq(location.id, id)).returning().get();
    if (updated === undefined) throw new Error("Location update returned no row");
    return updated;
  }

  return { findAll, insert, update };
}

/**
 * Read all location columns required by management and projection.
 *
 * @param executor - Database or active transaction.
 * @returns All persisted locations in stable order.
 */
function readAll(executor: LocationExecutor) {
  return executor.select({
    id: location.id,
    parentId: location.parentId,
    name: location.name,
    normalizedName: location.normalizedName,
    archivedAt: location.archivedAt,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
  }).from(location).orderBy(asc(location.id)).all();
}
