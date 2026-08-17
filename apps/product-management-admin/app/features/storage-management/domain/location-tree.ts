import type { LocationTreeNode } from "./location";

/**
 * Collect every descendant identifier below a location.
 *
 * @param location - Root location whose descendants should be collected.
 * @returns All descendant identifiers, excluding the root itself.
 */
export function collectLocationDescendantIds(location: LocationTreeNode): ReadonlySet<number> {
  const descendants = new Set<number>();
  const pending = [...location.children];
  while (pending.length > 0) {
    const child = pending.pop();
    if (child === undefined || descendants.has(child.id)) continue;
    descendants.add(child.id);
    pending.push(...child.children);
  }
  return descendants;
}

/**
 * Determine whether a location is an invalid destination for a move.
 *
 * @param destinationId - Candidate parent identifier.
 * @param moving - Moving subtree root.
 * @returns Whether the destination must be disabled.
 */
export function isMoveDestinationDisabled(destinationId: number, moving: LocationTreeNode): boolean {
  return destinationId === moving.id
    || destinationId === moving.parentId
    || collectLocationDescendantIds(moving).has(destinationId);
}
