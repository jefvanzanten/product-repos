import { describe, expect, it } from "bun:test";
import { findCategoryPath, formatCategoryPath, type CategoryPathNode } from "../src/modules/catalog/domain/category-path.ts";

const categories: ReadonlyArray<CategoryPathNode> = [
  { id: 1, name: "Root", parentId: null },
  { id: 2, name: "Child", parentId: 1 },
  { id: 3, name: "Leaf", parentId: 2 },
];

describe("category paths", () => {
  it("returns and formats a root category", () => {
    const path = findCategoryPath(1, categories);
    expect(path).toEqual([{ id: 1, name: "Root", parentId: null }]);
    expect(formatCategoryPath(path)).toBe("Root");
  });

  it("orders nested categories from root to leaf", () => {
    const path = findCategoryPath(3, categories);
    expect(path.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(formatCategoryPath(path)).toBe("Root > Child > Leaf");
  });

  it("returns an empty path for a missing category", () => {
    expect(findCategoryPath(404, categories)).toEqual([]);
  });

  it("bounds cyclic category data", () => {
    const cyclic = [
      { id: 1, name: "One", parentId: 2 },
      { id: 2, name: "Two", parentId: 1 },
    ];
    expect(findCategoryPath(1, cyclic).map((row) => row.id)).toEqual([2, 1]);
  });
});
