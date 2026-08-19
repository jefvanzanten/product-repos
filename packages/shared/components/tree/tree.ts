/** A tree node paired with its zero-based visible depth. */
export type VisibleTreeNode<Node> = {
  readonly node: Node;
  readonly depth: number;
};

/**
 * Flatten the branches currently expanded by the user.
 *
 * @param nodes - Current tree branch.
 * @param expandedIds - Identifiers of expanded branches.
 * @param getId - Read a node identifier.
 * @param getChildren - Read a node's children.
 * @param depth - Current zero-based branch depth.
 * @returns Visible nodes in depth-first tree order.
 */
export function flattenVisibleTree<Node, Id>(
  nodes: ReadonlyArray<Node>,
  expandedIds: ReadonlySet<Id>,
  getId: (node: Node) => Id,
  getChildren: (node: Node) => ReadonlyArray<Node>,
  depth = 0,
): ReadonlyArray<VisibleTreeNode<Node>> {
  return nodes.flatMap((node) => [
    { node, depth },
    ...(expandedIds.has(getId(node)) ? flattenVisibleTree(getChildren(node), expandedIds, getId, getChildren, depth + 1) : []),
  ]);
}
