import { describe, expect, it } from "vitest";
import type { ConsumptionLog } from "../domain/consumption-log";
import { formatLogbookQuantity, formatOriginalLogQuantity, presentConsumptionLog } from "./log-display";

const productLog: ConsumptionLog = {
  id: "10000000-0000-4000-8000-000000000001",
  type: "PRODUCT",
  product: {
    productId: "20000000-0000-4000-8000-000000000001",
    productName: "Grillworst",
    displayName: "Grillworst - Merknaam",
    brand: { id: "30000000-0000-4000-8000-000000000001", name: "Merknaam" },
    consumptionType: "FOOD",
    packageType: { id: 1, name: "Stuk" },
    contentAmount: "250",
    contentUnit: { id: 1, name: "gram", symbol: "g", dimension: "MASS", conversionToBase: "1" },
    portion: null,
    packageSummary: "Stuk 250 g",
    imageUrl: null,
    archived: true,
  },
  quantity: "1",
  inputMode: "FULL_PRODUCT",
  inputUnitType: null,
  consumedAt: "2026-01-15T12:00:00.000Z",
  timezone: "Europe/Amsterdam",
  localDate: "2026-01-15",
  derivedQuantityLabel: "1 Stuk",
  macroValues: null,
  createdAt: "2026-01-15T12:00:00.000Z",
  updatedAt: "2026-01-15T12:00:00.000Z",
};

const dishLog: ConsumptionLog = {
  id: "10000000-0000-4000-8000-000000000002",
  type: "DISH",
  dish: {
    id: "40000000-0000-4000-8000-000000000001",
    userId: "user-1",
    name: "Spaghetti bolognese",
    imageUrl: null,
    versionId: "50000000-0000-4000-8000-000000000001",
    servings: "4",
    recipeAccessible: true,
  },
  quantity: "1.5",
  consumedAt: "2026-01-15T12:00:00.000Z",
  timezone: "Europe/Amsterdam",
  localDate: "2026-01-15",
  derivedQuantityLabel: "1.5 portie",
  macroValues: { caloriesKcal: "750", proteinG: "30", carbohydratesG: "90", fatG: "22.5" },
  createdAt: "2026-01-15T12:00:00.000Z",
  updatedAt: "2026-01-15T12:00:00.000Z",
};

describe("log presentation", () => {
  it("projects product logs with brand, summary, and archive status", () => {
    expect(presentConsumptionLog(productLog)).toEqual({
      title: "Grillworst - Merknaam",
      subtitle: null,
      summary: "Stuk 250 g",
      imageUrl: null,
      consumptionType: "FOOD",
      archived: true,
    });
  });

  it("projects dish logs as food with servings summary and no archive state", () => {
    expect(presentConsumptionLog(dishLog)).toEqual({
      title: "Spaghetti bolognese",
      subtitle: null,
      summary: "4 porties",
      imageUrl: null,
      consumptionType: "FOOD",
      archived: false,
    });
  });

  it("formats dish quantities in Dutch portions", () => {
    expect(formatLogbookQuantity(dishLog)).toBe("1,5 porties");
    expect(formatOriginalLogQuantity(dishLog)).toBe("1,5 porties");
    expect(formatOriginalLogQuantity({ ...dishLog, quantity: "1" })).toBe("1 portie");
  });

  it("keeps product quantity formatting unchanged", () => {
    expect(formatLogbookQuantity(productLog)).toBe("1x stuk");
    expect(formatOriginalLogQuantity(productLog)).toBe("1 stuk");
  });
});
