import { describe, expect, it } from "vitest";
import { flattenVisibleTree } from "./tree";

type Node = { readonly id: number; readonly children: ReadonlyArray<Node> };

const tree: ReadonlyArray<Node> = [{ id: 1, children: [{ id: 2, children: [{ id: 3, children: [] }] }] }];

describe("flattenVisibleTree", () => {
  it("returns only roots when no branches are expanded", () => {
    expect(flattenVisibleTree(tree, new Set(), (node) => node.id, (node) => node.children)).toEqual([{ node: tree[0], depth: 0 }]);
  });

  it("returns expanded descendants with their semantic depth", () => {
    expect(flattenVisibleTree(tree, new Set([1, 2]), (node) => node.id, (node) => node.children)).toEqual([
      { node: tree[0], depth: 0 },
      { node: tree[0]?.children[0], depth: 1 },
      { node: tree[0]?.children[0]?.children[0], depth: 2 },
    ]);
  });
});
