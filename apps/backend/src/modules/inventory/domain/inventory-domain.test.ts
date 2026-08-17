import { describe, expect, test } from "bun:test";
import { inventoryRatio, packageEquivalent } from "./inventory-domain.ts";

describe("physical inventory amount presentation", () => {
  test.each([
    ["250", "500", 0.5],
    ["750", "1500", 0.5],
    ["4", "6", 4 / 6],
  ])("derives remaining ratio %s/%s without storage rounding", (remaining, maximum, expected) => {
    expect(inventoryRatio(remaining, maximum)).toBe(expected);
  });

  test("rounds only package-equivalent presentation to one decimal", () => {
    expect(packageEquivalent("4", "6")).toBe(0.7);
  });
});
