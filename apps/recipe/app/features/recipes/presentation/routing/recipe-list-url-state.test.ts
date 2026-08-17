import { describe, expect, test } from "vitest";
import { parseRecipeListUrlState } from "./recipe-list-url-state";

describe("recipe list URL state", () => {
  test("parses supported filters", () => {
    expect(parseRecipeListUrlState(new URL("https://example.test/?query=pasta&sort=name&archived=true"))).toEqual({
      query: "pasta",
      sort: "name",
      archived: true,
    });
  });

  test("falls back to newest sorting", () => {
    expect(parseRecipeListUrlState(new URL("https://example.test/?sort=unsupported")).sort).toBe("newest");
  });
});
