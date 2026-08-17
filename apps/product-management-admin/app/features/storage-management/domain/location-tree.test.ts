import { describe, expect, it } from "vitest";
import type { LocationTreeNode } from "./location";
import { collectLocationDescendantIds, isMoveDestinationDisabled } from "./location-tree";

const leaf: LocationTreeNode = { id: 3, name: "Shelf", parentId: 2, path: "Kitchen > Cupboard > Shelf", archivedAt: null, isEffectivelyArchived: false, children: [] };
const child: LocationTreeNode = { id: 2, name: "Cupboard", parentId: 1, path: "Kitchen > Cupboard", archivedAt: null, isEffectivelyArchived: false, children: [leaf] };
const root: LocationTreeNode = { id: 1, name: "Kitchen", parentId: null, path: "Kitchen", archivedAt: null, isEffectivelyArchived: false, children: [child] };

describe("location tree domain", () => {
  it("collects recursive descendants without including the root", () => {
    expect([...collectLocationDescendantIds(root)].sort()).toEqual([2, 3]);
  });

  it("rejects the moving node, its current parent, and descendants", () => {
    expect(isMoveDestinationDisabled(1, child)).toBe(true);
    expect(isMoveDestinationDisabled(2, child)).toBe(true);
    expect(isMoveDestinationDisabled(3, child)).toBe(true);
    expect(isMoveDestinationDisabled(4, child)).toBe(false);
  });
});
