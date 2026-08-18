import { describe, expect, test } from "bun:test";
import type { InsertPhysicalInventoryMutation, InventoryMutationRepository, PhysicalInventoryRecord } from "../repositories/inventory-mutation.repository.ts";
import { createInventoryMutationService } from "./inventory-mutation.service.ts";

/** State captured by the in-memory inventory mutation store. */
type FakeStore = { readonly store: InventoryMutationRepository; readonly items: PhysicalInventoryRecord[]; readonly mutations: InsertPhysicalInventoryMutation[] };

/** Build an in-memory mutation store with captured state. */
function createFakeStore(): FakeStore {
  const items: PhysicalInventoryRecord[] = [];
  const mutations: InsertPhysicalInventoryMutation[] = [];
  const store = { transaction: (operation) => operation({
    findProductStatus: () => ({ id: "00000000-0000-4000-8000-000000000001", archivedAt: null, contentAmount: "1.5", conversionToBase: "1000", dimension: "VOLUME" }),
    findAllLocations: () => [{ id: 1, parentId: null, name: "Koelkast", archivedAt: null }, { id: 2, parentId: null, name: "Berging", archivedAt: null }],
    findItem: (id) => items.find((item) => item.id === id),
    insertItem: (values) => { items.push(values); return values; },
    updateContent: (id, version, amount, updatedAt) => updateItem(items, id, version, { remainingAmountBase: amount, updatedAt }),
    updateLocation: (id, version, locationId, updatedAt) => updateItem(items, id, version, { locationId, updatedAt }),
    updateExpiry: (id, version, expiryDate, updatedAt) => updateItem(items, id, version, { expiryDate, updatedAt }),
    insertMutation: (values) => { mutations.push(values); },
    upsertThreshold: () => undefined,
  }) } satisfies InventoryMutationRepository;
  return { store, items, mutations };
}

/** Apply one optimistic update to the fake item list. */
function updateItem(items: PhysicalInventoryRecord[], id: string, version: number, changes: Partial<PhysicalInventoryRecord>): PhysicalInventoryRecord | undefined {
  const index = items.findIndex((item) => item.id === id && item.version === version);
  if (index < 0) return undefined;
  const updated = { ...items[index]!, ...changes, version: version + 1 };
  items[index] = updated;
  return updated;
}

describe("physical inventory mutation service", () => {
  test("creates N independent full physical rows", () => {
    const fake = createFakeStore();
    const ids = Array.from({ length: 6 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
    const service = createInventoryMutationService(fake.store, () => "2026-03-20T12:00:00.000Z", () => ids.shift()!);
    const result = service.addInventory("admin", { productId: "00000000-0000-4000-8000-000000000001", quantity: 3, locationId: 1, expiryDate: null });
    expect(result.ok && result.value).toHaveLength(3);
    expect(fake.items.map((item) => item.remainingAmountBase)).toEqual(["1500", "1500", "1500"]);
    expect(fake.mutations.map((mutation) => mutation.kind)).toEqual(["ADD", "ADD", "ADD"]);
  });

  test("updates only an explicit physical item and rejects a stale version", () => {
    const fake = createFakeStore();
    fake.items.push(
      { id: "a", productId: "p", locationId: 1, expiryDate: null, remainingAmountBase: "750", version: 0, createdAt: "now", updatedAt: "now" },
      { id: "b", productId: "p", locationId: 2, expiryDate: null, remainingAmountBase: "500", version: 0, createdAt: "now", updatedAt: "now" },
    );
    const service = createInventoryMutationService(fake.store);
    expect(service.setContent("admin", "a", { remainingAmountBase: "250", version: 0 }).ok).toBeTrue();
    expect(fake.items.map((item) => item.remainingAmountBase)).toEqual(["250", "500"]);
    expect(service.moveItem("admin", "a", { locationId: 2, version: 0 })).toEqual({ ok: false, error: "INVENTORY_ITEM_VERSION_CONFLICT" });
  });

  test("emptying deactivates the item and remains audit-ready", () => {
    const fake = createFakeStore();
    fake.items.push({ id: "a", productId: "p", locationId: 1, expiryDate: null, remainingAmountBase: "750", version: 0, createdAt: "now", updatedAt: "now" });
    const result = createInventoryMutationService(fake.store).setContent("admin", "a", { remainingAmountBase: "0", version: 0 });
    expect(result).toEqual({ ok: true, value: null });
    expect(fake.items[0]?.remainingAmountBase).toBe("0");
    expect(fake.mutations[0]).toMatchObject({ kind: "REMOVE", amountDeltaBase: "-750", resultingAmountBase: "0" });
  });
});
