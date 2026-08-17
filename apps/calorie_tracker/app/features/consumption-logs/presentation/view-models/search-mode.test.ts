import { describe, expect, it } from "vitest";
import { getProductSearchMode } from "./search-mode";

describe("product search presentation mode", () => {
  it("uses recents for an empty trimmed term", () => {
    expect(getProductSearchMode("  ")).toEqual({ tag: "Recent" });
  });

  it("does not request one-character terms", () => {
    expect(getProductSearchMode(" a ")).toEqual({ tag: "TooShort" });
  });

  it("searches from two trimmed characters", () => {
    expect(getProductSearchMode("  cola  ")).toEqual({ tag: "Search", query: "cola" });
  });
});
