import { describe, expect, it } from "vitest";
import type { PhysicalInventoryProductGroup } from "../../domain/inventory";
import { formatInventoryQuantity } from "./inventory-quantity";

/** Build the quantity fields needed by card formatting tests. */
function group(dimension: "COUNT" | "MASS" | "VOLUME", maximumAmountBase: string, fullCount: number, partialAmounts: ReadonlyArray<string>): PhysicalInventoryProductGroup {
  const product = {
    productId: "00000000-0000-4000-8000-000000000001",
    displayName: "Testproduct",
    compositionName: "Testproduct",
    brandName: null,
    package: {
      typeName: "doos",
      contentAmount: maximumAmountBase,
      contentUnitSymbol: dimension === "COUNT" ? "st" : dimension === "MASS" ? "g" : "ml",
    },
    categoryPath: "Test",
    imageUrl: null,
    maximumAmountBase,
    baseUnitSymbol: dimension === "COUNT" ? "st" as const : dimension === "MASS" ? "g" as const : "ml" as const,
    dimension,
    archivedAt: null,
  };
  const partialItems = partialAmounts.map((remainingAmountBase, index) => ({
    id: `item-${index}`,
    productId: product.productId,
    locationId: 1,
    expiryDate: null,
    remainingAmountBase,
    maximumAmountBase,
    remainingRatio: Number(remainingAmountBase) / Number(maximumAmountBase),
    isFull: false,
    version: 0,
    product,
    locationPath: "Voorraadkast",
    isLocationArchived: false,
  }));
  return {
    product,
    totalPackageEquivalent: fullCount + partialItems.reduce((total, item) => total + item.remainingRatio, 0),
    earliestExpiryStatus: "NONE",
    isLowStock: false,
    lowStockAmountBase: null,
    fullGroups: fullCount === 0 ? [] : [{ productId: product.productId, locationId: 1, locationPath: "Voorraadkast", expiryDate: null, count: fullCount, itemIds: Array.from({ length: fullCount }, (_, index) => `full-${index}`) }],
    partialItems,
  };
}

describe("formatInventoryQuantity", () => {
  it("shows count-based package contents as pieces", () => {
    expect(formatInventoryQuantity(group("COUNT", "60", 1, []))).toBe("60 stuks");
    expect(formatInventoryQuantity(group("COUNT", "60", 0, ["30"]))).toBe("30 stuks");
  });

  it("selects a concise mass or volume unit without excessive decimals", () => {
    expect(formatInventoryQuantity(group("VOLUME", "1000", 1, ["400"]))).toBe("1,4 l");
    expect(formatInventoryQuantity(group("VOLUME", "333", 0, ["333"]))).toBe("33,3 cl");
    expect(formatInventoryQuantity(group("MASS", "500", 0, ["250"]))).toBe("0,25 kg");
    expect(formatInventoryQuantity(group("MASS", "333", 0, ["333"]))).toBe("333 g");
  });
});
