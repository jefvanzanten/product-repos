import { describe, expect, test } from "vitest";
import { parseRecipeReturnPath, returnPathFromRequest } from "./public-paths";
import { recipeDetailPath, toRecipePublicPath } from "./recipe-routes";

describe("Recipe routes", () => {
  test("encodes identifiers and prefixes public paths", () => {
    expect(recipeDetailPath("user/name", "recipe name")).toBe("/gebruiker/user%2Fname/recipe%20name");
    expect(toRecipePublicPath("/")).toBe("/recepten");
    expect(toRecipePublicPath("/nieuw")).toBe("/recepten/nieuw");
  });

  test("normalizes safe public and internal return paths", () => {
    expect(parseRecipeReturnPath("/recepten/gebruiker/user/recipe/bewerken?tab=1")).toBe("/gebruiker/user/recipe/bewerken?tab=1");
    expect(parseRecipeReturnPath("//evil.example/path")).toBe("/");
    expect(parseRecipeReturnPath("/admin")).toBe("/");
  });

  test("derives an internal path only from Recipe requests", () => {
    expect(returnPathFromRequest(new Request("https://example.test/recepten/nieuw?from=list"))).toBe("/nieuw?from=list");
    expect(returnPathFromRequest(new Request("https://example.test/other"))).toBe("/");
  });
});
