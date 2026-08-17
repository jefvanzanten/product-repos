import { describe, expect, it } from "vitest";
import { buildCategoryPath, buildCategoryTreeOptions } from "./category-tree";
import type { Category } from "./product-catalog";

const categories: ReadonlyArray<Category> = [
  { id: 3, name: "Frisdrank", parentId: 2 },
  { id: 1, name: "Voeding", parentId: null },
  { id: 2, name: "Dranken", parentId: 1 },
];

describe("category tree domain", () => {
  it("builds a root-to-leaf path from flat categories", () => {
    expect(buildCategoryPath(3, categories).map((category) => category.name)).toEqual(["Voeding", "Dranken", "Frisdrank"]);
  });

  it("orders category options by hierarchy", () => {
    expect(buildCategoryTreeOptions(categories).map((option) => [option.depth, option.path])).toEqual([
      [0, "Voeding"],
      [1, "Voeding > Dranken"],
      [2, "Voeding > Dranken > Frisdrank"],
    ]);
  });

  it("terminates safely when parent relations contain a cycle", () => {
    const cyclic: ReadonlyArray<Category> = [
      { id: 1, name: "One", parentId: 2 },
      { id: 2, name: "Two", parentId: 1 },
    ];
    expect(buildCategoryPath(1, cyclic).map((category) => category.id)).toEqual([2, 1]);
  });
});
