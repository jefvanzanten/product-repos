import { describe, expect, test } from "bun:test";
import type { InventoryReader, PhysicalInventoryStockRow } from "../repositories/inventory.repository.ts";
import { createInventoryQueryService } from "./inventory-query.service.ts";

/** Build one joined physical item fixture. */
function stockRow(overrides: Partial<PhysicalInventoryStockRow> = {}): PhysicalInventoryStockRow {
  return { itemId: crypto.randomUUID(), productId: "00000000-0000-4000-8000-000000000001", compositionName: "Kaasplakken", brandName: "Zuivelmeester", packageTypeName: "pak", contentAmount: "120", contentUnitSymbol: "g", dimension: "MASS", conversionToBase: "1", imageUrl: null, archivedAt: null, categoryId: 1, remainingAmountBase: "120", version: 0, expiryDate: null, locationId: 1, ...overrides };
}

/** Build an in-memory physical inventory reader. */
function fakeReader(rows: ReadonlyArray<PhysicalInventoryStockRow>, threshold: string | null = null): InventoryReader {
  return {
    findStockRows: () => rows,
    findProductsWithKnownContent: () => rows.length === 0 ? [] : [rows[0]!],
    findAllLocations: () => [{ id: 1, parentId: null, name: "Koelkast", archivedAt: null }, { id: 2, parentId: null, name: "Berging", archivedAt: null }],
    findAllCategories: () => [{ id: 1, parentId: null, name: "Zuivel" }],
    findThresholds: () => threshold === null ? [] : [{ productId: rows[0]!.productId, lowStockAmountBase: threshold, movementClass: null }],
  };
}

const query = { query: null, filter: "all", limit: 30, offset: 0, today: "2026-08-10" } as const;

describe("physical inventory query service", () => {
  test("groups only equal full items and keeps partial items independent", () => {
    const rows = [
      stockRow({ itemId: crypto.randomUUID(), expiryDate: "2026-08-12" }),
      stockRow({ itemId: crypto.randomUUID(), expiryDate: "2026-08-12" }),
      stockRow({ itemId: crypto.randomUUID(), remainingAmountBase: "80", expiryDate: "2026-08-11" }),
      stockRow({ itemId: crypto.randomUUID(), remainingAmountBase: "40", locationId: 2, expiryDate: "2026-08-11" }),
    ];
    const group = createInventoryQueryService(fakeReader(rows)).listInventory(query).groups[0]!;
    expect(group.fullGroups[0]?.count).toBe(2);
    expect(group.fullGroups[0]?.itemIds).toHaveLength(2);
    expect(group.partialItems).toHaveLength(2);
    expect(group.totalPackageEquivalent).toBe(3);
    expect(new Set(group.partialItems.map((item) => item.locationPath))).toEqual(new Set(["Koelkast", "Berging"]));
  });

  test("rounds only package-equivalent presentation and sorts undated rows last", () => {
    const rows = [stockRow({ remainingAmountBase: "250", contentAmount: "500", expiryDate: null }), stockRow({ remainingAmountBase: "250", contentAmount: "500", expiryDate: "2026-08-11" })];
    const group = createInventoryQueryService(fakeReader(rows)).listInventory(query).groups[0]!;
    expect(group.totalPackageEquivalent).toBe(1);
    expect(group.partialItems.map((item) => item.expiryDate)).toEqual(["2026-08-11", null]);
    expect(group.partialItems[0]?.remainingAmountBase).toBe("250");
  });

  test("treats today as consumable and applies expiring and low-stock filters", () => {
    const todayRow = stockRow({ expiryDate: "2026-08-10", remainingAmountBase: "40" });
    const service = createInventoryQueryService(fakeReader([todayRow], "50"));
    const group = service.listInventory(query).groups[0]!;
    expect(group.earliestExpiryStatus).toBe("TODAY");
    expect(group.isLowStock).toBeTrue();
    expect(service.listInventory({ ...query, filter: "expiring" }).groups).toHaveLength(1);
    expect(service.listInventory({ ...query, filter: "low-stock" }).groups).toHaveLength(1);
  });

  test("uses the shared concrete-product display name for search results", () => {
    const service = createInventoryQueryService(fakeReader([stockRow()]));
    expect(service.searchProducts("zuivel", 20)[0]?.displayName).toBe("Zuivelmeester Kaasplakken — pak 120 g");
  });
});
