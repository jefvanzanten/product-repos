import { describe, expect, test } from "vitest";
import { parseCreateRecipe } from "./recipe-command-parser";

const validInput = {
  name: "  Pasta  ",
  visibility: "PRIVATE",
  servings: "2",
  instructions: null,
  ingredients: [{
    productId: "82ca173a-3762-44bb-8abc-35b23f625b9e",
    quantity: "1.5",
    inputMode: "FULL_PRODUCT",
    inputUnitTypeId: null,
  }],
};

describe("recipe command parser", () => {
  test("validates and normalizes a create command", () => {
    expect(parseCreateRecipe(validInput)).toMatchObject({ name: "Pasta", servings: "2" });
  });

  test("rejects malformed commands", () => {
    expect(parseCreateRecipe({ ...validInput, servings: "0" })).toBeNull();
    expect(parseCreateRecipe({ ...validInput, ingredients: [] })).toBeNull();
  });
});
