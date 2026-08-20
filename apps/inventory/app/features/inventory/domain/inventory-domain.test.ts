import { describe, expect, it } from "vitest";
import { classifyInventoryExpiry } from "./inventory-expiry";
import { deriveInventoryItemChanges } from "./inventory-item-edit";
import { isInventoryDecimal, parsePackageQuantity } from "./inventory-validation";
import type { PhysicalInventoryItemDetail } from "./inventory";

const item: PhysicalInventoryItemDetail = {
  id: "item-id",
  productId: "product-id",
  locationId: 1,
  expiryDate: "2026-04-10",
  remainingAmountBase: "500",
  maximumAmountBase: "1000",
  remainingRatio: 0.5,
  isFull: false,
  version: 3,
  locationPath: "Keuken › Kast",
  isLocationArchived: false,
  product: {
    productId: "product-id",
    displayName: "Rijst",
    compositionName: "Rijst",
    brandName: null,
    package: {
      typeName: "pak",
      contentAmount: "1",
      contentUnitSymbol: "kg",
    },
    categoryPath: "Granen",
    imageUrl: null,
    maximumAmountBase: "1000",
    baseUnitSymbol: "g",
    dimension: "MASS",
    archivedAt: null,
  },
};

describe("Inventory domain", () => {
  it("classifies expiry boundaries against an explicit date", () => {
    expect(classifyInventoryExpiry(null, "2026-04-10")).toEqual({ tag: "None" });
    expect(classifyInventoryExpiry("2026-04-09", "2026-04-10")).toEqual({ tag: "Expired", days: 1 });
    expect(classifyInventoryExpiry("2026-04-10", "2026-04-10")).toEqual({ tag: "Today" });
    expect(classifyInventoryExpiry("2026-04-13", "2026-04-10")).toEqual({ tag: "Urgent", days: 3 });
    expect(classifyInventoryExpiry("2026-04-17", "2026-04-10")).toEqual({ tag: "Soon", days: 7 });
  });

  it("validates canonical Inventory form numbers", () => {
    expect(parsePackageQuantity("2")).toBe(2);
    expect(parsePackageQuantity("0")).toBeNull();
    expect(parsePackageQuantity("1.5")).toBeNull();
    expect(isInventoryDecimal("0.25")).toBe(true);
    expect(isInventoryDecimal("01")).toBe(false);
  });

  it("derives version-safe item changes in endpoint order", () => {
    expect(deriveInventoryItemChanges(item, {
      remainingAmountBase: "250",
      locationId: 2,
      expiryDate: null,
    })).toEqual([
      { tag: "Move", locationId: 2 },
      { tag: "ChangeExpiry", expiryDate: null },
      { tag: "ChangeContent", remainingAmountBase: "250" },
    ]);
  });

  it("rejects content above the product maximum", () => {
    expect(deriveInventoryItemChanges(item, {
      remainingAmountBase: "1001",
      locationId: 1,
      expiryDate: item.expiryDate,
    })).toBeNull();
  });
});
