import { describe, expect, test } from "vitest";
import type { PackageEquivalentInput } from "./package-equivalent";
import { packageEquivalent } from "./package-equivalent";

const gram = { id: 1, name: "gram", symbol: "g", dimension: "MASS" as const, conversionToBase: "1" };
const base: PackageEquivalentInput = {
  package: { singularName: "blik", pluralName: "blikken", contentAmount: "400", contentUnitType: gram, portionsPerProduct: null },
  modes: [{ inputMode: "CONTENT_UNIT", unitType: gram, label: "gram" }],
  quantity: "800",
  inputMode: "CONTENT_UNIT",
  inputUnitTypeId: gram.id,
};

describe("package equivalent", () => {
  test("shows plural packaging from one complete package without a multiplication sign", () => {
    expect(packageEquivalent(base)).toBe("2 blikken");
    expect(packageEquivalent(base)).not.toContain("×");
  });

  test("stays hidden below one complete package", () => {
    expect(packageEquivalent({ ...base, quantity: "399" })).toBeNull();
  });
});
