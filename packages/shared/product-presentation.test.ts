import { describe, expect, it } from "vitest";
import { recipeDetailPath } from "./routing/public-app-path";
import {
  formatConcreteProductDisplayName,
  formatDutchDecimal,
  formatPackageTypeName,
  formatProductPortionName,
} from "./product-presentation";

describe("product presentation", () => {
  it("formats the complete canonical product name with Dutch decimals", () => {
    expect(formatConcreteProductDisplayName({
      brandName: "Heinz",
      compositionName: "Tomatenpuree",
      packageTypeName: "blik",
      contentAmount: "1.5",
      contentUnitSymbol: "kg",
    })).toBe("Heinz Tomatenpuree — blik 1,5 kg");
  });

  it("omits absent parts and separators", () => {
    expect(formatConcreteProductDisplayName({ compositionName: "Tomatenpuree" })).toBe("Tomatenpuree");
    expect(formatConcreteProductDisplayName({ packageTypeName: "blik", contentAmount: "200", contentUnitSymbol: "g" })).toBe("blik 200 g");
    expect(formatConcreteProductDisplayName({ brandName: " ", compositionName: "", packageTypeName: null })).toBe("");
  });

  it("keeps canonical wire decimals untouched", () => {
    const wireValue = "1234.50";
    expect(formatDutchDecimal(wireValue)).toBe("1234,50");
    expect(wireValue).toBe("1234.50");
  });

  it("builds an encoded canonical recipe detail path", () => {
    expect(recipeDetailPath("user/id", "recipe id")).toBe("/recepten/gebruiker/user%2Fid/recipe%20id");
  });

  it("selects package and portion inflections", () => {
    const packageType = { singularName: "blik", pluralName: "blikken" };
    const portion = { singularName: "glas", pluralName: "glazen" };
    expect(formatPackageTypeName(packageType, "1")).toBe("blik");
    expect(formatPackageTypeName(packageType, "1.5")).toBe("blikken");
    expect(formatProductPortionName(portion, 1)).toBe("glas");
    expect(formatProductPortionName(portion, 2)).toBe("glazen");
  });
});
