import type { InventoryLocation } from "../../../domain/inventory";

/** Flat location option displayed by an item-edit select. */
export type LocationOption = { readonly id: number; readonly path: string };

/**
 * Flatten a location tree into path-labelled options.
 *
 * @param nodes - Current location-tree branch.
 * @param prefix - Ancestor path accumulated recursively.
 * @returns Flat options in tree order.
 */
export function flattenLocationOptions(nodes: ReadonlyArray<InventoryLocation>, prefix = ""): ReadonlyArray<LocationOption> {
  return nodes.flatMap((node) => {
    const path = prefix === "" ? node.name : `${prefix} › ${node.name}`;
    return [{ id: node.id, path }, ...flattenLocationOptions(node.children, path)];
  });
}
