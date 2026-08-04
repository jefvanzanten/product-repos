import { describe, expect, test } from "bun:test";
import { createInventoryQueryService } from "./inventory-query.service.ts";
import type { InventoryCategoryRow, InventoryLocationRow, InventoryReader, InventoryStockRow } from "../repositories/inventory-reader.ts";

/**
 * Build one joined stock row with sensible defaults for test scenarios.
 *
 * @param overrides - Scenario-specific values that replace the defaults.
 * @returns A complete joined stock row.
 */
function stockRow(overrides: Partial<InventoryStockRow>): InventoryStockRow {
  return {
    itemId: "item-1",
    quantity: 1,
    version: 0,
    expiryDate: null,
    locationId: 1,
    productPackageId: 10,
    productId: "product-1",
    productName: "Melk halfvol",
    brandName: "Zuivelboer",
    packageTypeName: "pak",
    contentAmount: "1",
    contentUnitName: "liter",
    packageImageUrl: null,
    packageArchivedAt: null,
    productArchivedAt: null,
    categoryId: 1,
    ...overrides,
  };
}

/**
 * Create a fake persistence port around in-memory rows.
 *
 * @param rows - Inventory rows returned by the fake reader.
 * @param locations - Location rows returned by the fake reader.
 * @param categories - Category rows returned by the fake reader.
 * @returns An in-memory inventory reader.
 */
function fakeReader(
  rows: ReadonlyArray<InventoryStockRow>,
  locations: ReadonlyArray<InventoryLocationRow> = [{ id: 1, parentId: null, name: "Keuken" }],
  categories: ReadonlyArray<InventoryCategoryRow> = [{ id: 1, parentId: null, name: "Zuivel" }],
): InventoryReader {
  return {
    findStockRows: () => rows,
    findAllLocations: () => locations,
    findAllCategories: () => categories,
  };
}

describe("inventory query service", () => {
  test("groups batches of the same package and sums quantities", () => {
    const service = createInventoryQueryService(
      fakeReader([
        stockRow({ itemId: "a", quantity: 2, expiryDate: "2026-08-10" }),
        stockRow({ itemId: "b", quantity: 3, expiryDate: null }),
      ]),
    );
    const page = service.listInventory({ query: null, limit: 30, offset: 0 });
    expect(page.groups).toHaveLength(1);
    expect(page.groups[0]!.totalQuantity).toBe(5);
    expect(page.groups[0]!.earliestExpiryDate).toBe("2026-08-10");
    expect(page.nextCursor).toBeNull();
  });

  test("orders batches from earliest expiry first and undated last", () => {
    const service = createInventoryQueryService(
      fakeReader([
        stockRow({ itemId: "late", expiryDate: "2026-09-01", locationId: 1 }),
        stockRow({ itemId: "none", expiryDate: null, locationId: 2 }),
        stockRow({ itemId: "early", expiryDate: "2026-08-01", locationId: 3 }),
      ]),
    );
    const page = service.listInventory({ query: null, limit: 30, offset: 0 });
    expect(page.groups[0]!.items.map((item) => item.id)).toEqual(["early", "late", "none"]);
  });

  test("orders groups expired first, dated next, and undated alphabetically last", () => {
    const service = createInventoryQueryService(
      fakeReader([
        stockRow({ itemId: "z", productPackageId: 10, productId: "p1", productName: "Zuurkool", expiryDate: null }),
        stockRow({ itemId: "a", productPackageId: 11, productId: "p2", productName: "Appelsap", expiryDate: null }),
        stockRow({ itemId: "f", productPackageId: 12, productId: "p3", productName: "Frisdrank", expiryDate: "2026-09-01" }),
        stockRow({ itemId: "e", productPackageId: 13, productId: "p4", productName: "Eieren", expiryDate: "2026-01-01" }),
      ]),
    );
    const page = service.listInventory({ query: null, limit: 30, offset: 0 });
    expect(page.groups.map((group) => group.displayName)).toEqual(["Eieren", "Frisdrank", "Appelsap", "Zuurkool"]);
  });

  test("filters by product name, brand, package summary, category and location path", () => {
    const service = createInventoryQueryService(
      fakeReader(
        [
          stockRow({ itemId: "milk", productName: "Melk halfvol", brandName: "Zuivelboer", locationId: 2 }),
          stockRow({ itemId: "cola", productPackageId: 11, productId: "p2", productName: "Cola", brandName: "Fizz", packageTypeName: "fles", contentAmount: "1.5" }),
        ],
        [
          { id: 1, parentId: null, name: "Keuken" },
          { id: 2, parentId: 1, name: "Koelkast" },
        ],
      ),
    );
    expect(service.listInventory({ query: "melk", limit: 30, offset: 0 }).groups).toHaveLength(1);
    expect(service.listInventory({ query: "zuivelboer", limit: 30, offset: 0 }).groups).toHaveLength(1);
    expect(service.listInventory({ query: "koelkast", limit: 30, offset: 0 }).groups).toHaveLength(1);
    expect(service.listInventory({ query: "zuivel", limit: 30, offset: 0 }).groups).toHaveLength(2);
    expect(service.listInventory({ query: "pak 1 liter", limit: 30, offset: 0 }).groups).toHaveLength(1);
    expect(service.listInventory({ query: "onvindbaar", limit: 30, offset: 0 }).groups).toHaveLength(0);
  });

  test("paginates groups with an offset cursor", () => {
    const rows = [0, 1, 2].map((index) =>
      stockRow({ itemId: `item-${index}`, productPackageId: index + 1, productId: `p${index}`, productName: `Product ${index}`, expiryDate: `2026-09-0${index + 1}` }),
    );
    const service = createInventoryQueryService(fakeReader(rows));
    const firstPage = service.listInventory({ query: null, limit: 2, offset: 0 });
    expect(firstPage.groups).toHaveLength(2);
    expect(firstPage.nextCursor).toBe("2");
    const secondPage = service.listInventory({ query: null, limit: 2, offset: Number(firstPage.nextCursor) });
    expect(secondPage.groups).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();
  });

  test("projects location and category paths", () => {
    const service = createInventoryQueryService(
      fakeReader(
        [stockRow({ itemId: "milk", locationId: 3 })],
        [
          { id: 1, parentId: null, name: "Keuken" },
          { id: 2, parentId: 1, name: "Koelkast" },
          { id: 3, parentId: 2, name: "Lade 1" },
        ],
        [
          { id: 5, parentId: null, name: "Voeding" },
          { id: 1, parentId: 5, name: "Zuivel" },
        ],
      ),
    );
    const group = service.listInventory({ query: null, limit: 30, offset: 0 }).groups[0]!;
    expect(group.items[0]!.locationPath).toBe("Keuken › Koelkast › Lade 1");
    expect(group.categoryPath).toBe("Voeding › Zuivel");
    expect(group.packageSummary).toBe("pak 1 liter");
  });
});
