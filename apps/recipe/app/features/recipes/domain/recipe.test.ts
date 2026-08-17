import { describe, expect, test } from "vitest";
import type { RecipeDetail } from "./recipe";
import { createVisibilityUpdate } from "./recipe";

const recipe: RecipeDetail = {
  id: "recipe-id",
  userId: "user-id",
  makerDisplayName: "Maker",
  name: "Pasta",
  visibility: "PUBLIC",
  archivedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  servings: "2",
  instructions: null,
  versionId: "version-id",
  versionCreatedAt: "2026-01-01T00:00:00.000Z",
  ownerActions: { canEdit: true, canArchive: true, canRestore: false },
  ingredients: [{
    productId: "product-id",
    displayName: "Tomaat",
    quantity: "3",
    inputMode: "CONTENT_UNIT",
    inputUnitType: { id: 4, name: "stuk", symbol: "st", dimension: "COUNT", conversionToBase: "1" },
    productArchived: false,
  }],
};

describe("recipe domain", () => {
  test("creates a complete private visibility update", () => {
    expect(createVisibilityUpdate(recipe)).toEqual({
      expectedUpdatedAt: recipe.updatedAt,
      name: recipe.name,
      visibility: "PRIVATE",
      servings: recipe.servings,
      instructions: null,
      ingredients: [{
        productId: "product-id",
        quantity: "3",
        inputMode: "CONTENT_UNIT",
        inputUnitTypeId: 4,
      }],
    });
  });
});
