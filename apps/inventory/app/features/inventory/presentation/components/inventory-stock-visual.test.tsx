import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PhysicalInventoryItemDetail, PhysicalInventoryProductGroup } from "../../domain/inventory";
import { InventoryStockVisual } from "./inventory-stock-visual";

const product = {
  productId: "00000000-0000-4000-8000-000000000001",
  displayName: "Melk — pak 1 l",
  compositionName: "Melk",
  brandName: null,
  package: {
    typeName: "pak",
    contentAmount: "1",
    contentUnitSymbol: "l",
  },
  categoryPath: "Zuivel",
  imageUrl: null,
  maximumAmountBase: "1000",
  baseUnitSymbol: "ml" as const,
  dimension: "VOLUME" as const,
  archivedAt: null,
};

/** Build one partial physical-package fixture. */
function partialItem(remainingRatio: number): PhysicalInventoryItemDetail {
  return {
    id: crypto.randomUUID(),
    productId: product.productId,
    locationId: 1,
    expiryDate: null,
    remainingAmountBase: String(remainingRatio * 1000),
    maximumAmountBase: "1000",
    remainingRatio,
    isFull: remainingRatio === 1,
    version: 0,
    product,
    locationPath: "Koelkast",
    isLocationArchived: false,
  };
}

/** Build a product group with the requested full and partial physical packages. */
function inventoryGroup(fullCount: number, partialRatios: ReadonlyArray<number>): PhysicalInventoryProductGroup {
  return {
    product,
    totalPackageEquivalent: fullCount + partialRatios.reduce((total, ratio) => total + ratio, 0),
    earliestExpiryStatus: "NONE",
    isLowStock: false,
    lowStockAmountBase: null,
    fullGroups: fullCount === 0 ? [] : [{ productId: product.productId, locationId: 1, locationPath: "Koelkast", expiryDate: null, count: fullCount, itemIds: Array.from({ length: fullCount }, () => crypto.randomUUID()) }],
    partialItems: partialRatios.map(partialItem),
  };
}

describe("InventoryStockVisual", () => {
  it("shows one partially filled package icon without compact content amounts", () => {
    const { container } = render(<InventoryStockVisual group={inventoryGroup(0, [0.4])} />);

    expect(screen.getByRole("img", { name: "1 verpakking: 40% gevuld" })).toBeInTheDocument();
    expect(container.querySelector("svg[style]")).toHaveStyle("--package-clip: 60%");
  });

  it("shows every full and partial physical package as an icon", () => {
    const { container } = render(<InventoryStockVisual group={inventoryGroup(2, [0.4])} />);

    expect(screen.getByRole("img", { name: "3 verpakkingen: 100%, 100%, 40% gevuld" })).toBeInTheDocument();
    expect(container.querySelectorAll("svg[style]")).toHaveLength(3);
  });
});
