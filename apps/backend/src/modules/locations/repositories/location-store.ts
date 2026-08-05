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
export type LocationTransactionStore = {
  readonly findAll: () => ReadonlyArray<LocationPersistenceRow>;
  readonly insert: (values: InsertLocationValues) => LocationPersistenceRow;
  readonly update: (id: number, values: UpdateLocationValues) => LocationPersistenceRow;
};

/** Persistence port for location reads and serialized write use cases. */
export type LocationStore = {
  readonly findAll: () => ReadonlyArray<LocationPersistenceRow>;
  readonly transaction: <T>(operation: (store: LocationTransactionStore) => T) => T;
};
