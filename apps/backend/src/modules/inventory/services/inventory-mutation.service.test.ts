import { describe, expect, test } from "bun:test";
import type { InventoryBatchRecord, InventoryMutationStore, InsertInventoryMutation } from "../repositories/inventory-mutation-store.ts";
import { createInventoryMutationService } from "./inventory-mutation.service.ts";

/** Build an in-memory mutation store and expose captured state for assertions. */
function createFakeStore(options: {
  readonly packageArchivedAt?: string | null;
  readonly productArchivedAt?: string | null;
  readonly packageExists?: boolean;
  readonly locationArchivedAt?: string | null;
  readonly parentArchivedAt?: string | null;
  readonly existingBatch?: InventoryBatchRecord;
} = {}): {
  readonly store: InventoryMutationStore;
  readonly batches: InventoryBatchRecord[];
  readonly mutations: InsertInventoryMutation[];
} {
  const batches = options.existingBatch === undefined ? [] : [options.existingBatch];
  const mutations: InsertInventoryMutation[] = [];
  const store: InventoryMutationStore = {
    transaction: (operation) => operation({
      findPackageStatus: () => options.packageExists === false ? undefined : ({
        id: 10,
        productArchivedAt: options.productArchivedAt ?? null,
        packageArchivedAt: options.packageArchivedAt ?? null,
      }),
      findAllLocations: () => [
        ...(options.parentArchivedAt === undefined ? [] : [{ id: 1, parentId: null, name: "Keuken", archivedAt: options.parentArchivedAt }]),
        { id: 2, parentId: options.parentArchivedAt === undefined ? null : 1, name: "Koelkast", archivedAt: options.locationArchivedAt ?? null },
      ],
      findBatch: () => batches[0],
      insertBatch: (values) => {
        const batch = { ...values };
        batches.push(batch);
        return batch;
      },
      incrementBatch: (id, quantity, updatedAt) => {
        const current = batches.find((batch) => batch.id === id);
        if (current === undefined) throw new Error("Missing fake batch");
        const updated = { ...current, quantity: current.quantity + quantity, version: current.version + 1, updatedAt };
        batches.splice(batches.indexOf(current), 1, updated);
        return updated;
      },
      insertMutation: (values) => {
        mutations.push(values);
      },
    }),
  };
  return { store, batches, mutations };
}

/** Build one complete persisted batch for merge scenarios. */
function existingBatch(): InventoryBatchRecord {
  return {
    id: "batch-1",
    productPackageId: 10,
    locationId: 2,
    expiryDate: null,
    quantity: 3,
    version: 4,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const input = { productPackageId: 10, quantity: 2, locationId: 2, expiryDate: null } as const;

describe("inventory mutation service", () => {
  test("creates a batch and matching ADD audit mutation", () => {
    const fake = createFakeStore();
    const ids = ["batch-new", "mutation-new"];
    const service = createInventoryMutationService(fake.store, () => "2026-03-20T12:00:00.000Z", () => ids.shift()!);

    const result = service.addInventory("admin-1", input);

    expect(result).toEqual({
      ok: true,
      value: {
        id: "batch-new",
        locationId: 2,
        locationPath: "Koelkast",
        isLocationArchived: false,
        expiryDate: null,
        quantity: 2,
        version: 0,
      },
    });
    expect(fake.mutations[0]).toMatchObject({
      id: "mutation-new",
      inventoryItemId: "batch-new",
      kind: "ADD",
      quantityDelta: 2,
      resultingQuantity: 2,
      userId: "admin-1",
    });
  });

  test("merges into an existing batch and advances its version", () => {
    const fake = createFakeStore({ existingBatch: existingBatch() });
    const service = createInventoryMutationService(fake.store, () => "2026-03-20T12:00:00.000Z", () => "mutation-new");

    const result = service.addInventory("admin-1", input);

    expect(result.ok && result.value.quantity).toBe(5);
    expect(result.ok && result.value.version).toBe(5);
    expect(fake.batches[0]?.quantity).toBe(5);
    expect(fake.mutations[0]?.resultingQuantity).toBe(5);
  });

  test("rejects a location archived through its ancestor", () => {
    const fake = createFakeStore({ parentArchivedAt: "2026-03-01T00:00:00.000Z" });
    const service = createInventoryMutationService(fake.store);

    expect(service.addInventory("admin-1", input)).toEqual({ ok: false, error: "LOCATION_ARCHIVED" });
    expect(fake.batches).toHaveLength(0);
    expect(fake.mutations).toHaveLength(0);
  });

  test("distinguishes missing and archived package references", () => {
    const missingService = createInventoryMutationService(createFakeStore({ packageExists: false }).store);
    const archivedService = createInventoryMutationService(createFakeStore({ packageArchivedAt: "2026-03-01T00:00:00.000Z" }).store);

    expect(missingService.addInventory("admin-1", input)).toEqual({ ok: false, error: "PRODUCT_PACKAGE_NOT_FOUND" });
    expect(archivedService.addInventory("admin-1", input)).toEqual({ ok: false, error: "PRODUCT_PACKAGE_ARCHIVED" });
  });
});
