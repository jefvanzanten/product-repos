import { asc, eq } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { location } from "../../../db/schema.ts";

type TransactionDatabase = Parameters<Parameters<BackendDatabase["transaction"]>[0]>[0];
type LocationExecutor = BackendDatabase | TransactionDatabase;


/** Persisted location row exposed to the location application service. */
export type LocationPersistenceRow = {
  readonly id: number;
  readonly parentId: number | null;
  readonly name: string;
  readonly normalizedName: string;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Values required to insert a location. */
export type InsertLocationValues = Omit<LocationPersistenceRow, "id">;

/** Atomic mutable fields supported by location management. */
export type UpdateLocationValues = Partial<Pick<LocationPersistenceRow, "parentId" | "name" | "normalizedName" | "archivedAt" | "updatedAt">>;

/** Transaction-scoped location persistence operations. */
export type LocationTransactionRepository = {
  readonly findAll: () => ReadonlyArray<LocationPersistenceRow>;
  readonly insert: (values: InsertLocationValues) => LocationPersistenceRow;
  readonly update: (id: number, values: UpdateLocationValues) => LocationPersistenceRow;
};

/** Persistence port for location reads and serialized write use cases. */
export type LocationRepository = {
  readonly findAll: () => ReadonlyArray<LocationPersistenceRow>;
  readonly transaction: <T>(operation: (store: LocationTransactionRepository) => T) => T;
};

/**
 * Create the location persistence adapter for one injected database.
 *
 * @param database - Composed Drizzle database connection.
 * @returns The location store implementation.
 */
export function createLocationRepository(database: BackendDatabase): LocationRepository {
  /** Read every location in stable identifier order. */
  function findAll() {
    return readAll(database);
  }

  /** Execute one use case against a transaction-scoped adapter. */
  function transaction<T>(operation: (store: LocationTransactionRepository) => T): T {
    return database.transaction((transactionDatabase) => operation(createTransactionRepository(transactionDatabase)));
  }

  return { findAll, transaction };
}

/**
 * Create transaction-scoped persistence operations.
 *
 * @param executor - Active Drizzle transaction.
 * @returns Operations bound to that transaction.
 */
function createTransactionRepository(executor: TransactionDatabase): LocationTransactionRepository {
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
