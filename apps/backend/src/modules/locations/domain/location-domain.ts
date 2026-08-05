import type { LocationTreeNode } from "@product-repos/contracts/locations";
import { err, ok, type Result } from "../../../result.ts";

/** Persistence-neutral row required to project location trees and paths. */
export type LocationDomainRow = {
  readonly id: number;
  readonly parentId: number | null;
  readonly name: string;
  readonly archivedAt: string | null;
};

/** Canonical display name and comparison key stored for one location. */
export type NormalizedLocationName = {
  readonly name: string;
  readonly normalizedName: string;
};

/** Expected reason why a location name cannot be normalized. */
export type LocationNameError = "EMPTY" | "TOO_LONG" | "INVALID_CHARACTER";

/** Path and effective status derived from the complete current location tree. */
export type LocationMetadata = {
  readonly path: string;
  readonly isEffectivelyArchived: boolean;
  readonly isArchivedByAncestor: boolean;
};

const unicodeWhitespace = /\s+/gu;
const invalidLocationCharacter = /[\p{Cc}\p{Cf}›]/u;

/**
 * Canonicalize and validate a human-entered location name.
 *
 * @param input - Untrusted location name received at a boundary or migration.
 * @returns The NFC display name and Dutch lowercase key, or an expected validation error.
 */
export function normalizeLocationName(input: string): Result<NormalizedLocationName, LocationNameError> {
  const name = input.trim().replace(unicodeWhitespace, " ").normalize("NFC");
  if (name.length === 0) return err("EMPTY");
  if (name.length > 100) return err("TOO_LONG");
  if (invalidLocationCharacter.test(name)) return err("INVALID_CHARACTER");
  return ok({ name, normalizedName: name.toLocaleLowerCase("nl-NL") });
}

/**
 * Compare two sibling rows using Dutch natural ordering and an ID tie-breaker.
 *
 * @param left - First sibling candidate.
 * @param right - Second sibling candidate.
 * @returns A negative, zero, or positive sorting value.
 */
export function compareLocationSiblings(left: Pick<LocationDomainRow, "id" | "name">, right: Pick<LocationDomainRow, "id" | "name">): number {
  const compared = left.name.localeCompare(right.name, "nl-NL", { numeric: true, sensitivity: "base" });
  return compared === 0 ? left.id - right.id : compared;
}

/**
 * Derive cycle-safe current paths and effective archive status for every row.
 *
 * @param rows - Complete persisted location set.
 * @returns Metadata indexed by stable location identifier.
 */
export function projectLocationMetadata(rows: ReadonlyArray<LocationDomainRow>): Map<number, LocationMetadata> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const metadata = new Map<number, LocationMetadata>();

  for (const row of rows) {
    const chain: LocationDomainRow[] = [];
    const visited = new Set<number>();
    let current: LocationDomainRow | undefined = row;
    while (current !== undefined && !visited.has(current.id)) {
      visited.add(current.id);
      chain.unshift(current);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    const ownIndex = chain.findIndex((entry) => entry.id === row.id);
    const ancestors = ownIndex < 0 ? chain : chain.slice(0, ownIndex);
    metadata.set(row.id, {
      path: chain.map((entry) => entry.name).join(" › "),
      isEffectivelyArchived: chain.some((entry) => entry.archivedAt !== null),
      isArchivedByAncestor: ancestors.some((entry) => entry.archivedAt !== null),
    });
  }
  return metadata;
}

/**
 * Project only effectively active rows as a naturally sorted forest.
 *
 * @param rows - Complete persisted location set.
 * @returns Active location roots with recursive children.
 */
export function projectActiveLocationTree(rows: ReadonlyArray<LocationDomainRow>): LocationTreeNode[] {
  const metadata = projectLocationMetadata(rows);
  return buildLocationTree(rows, metadata, (row) => !metadata.get(row.id)!.isEffectivelyArchived);
}

/**
 * Project archive forests rooted at directly archived nodes below active ancestors.
 *
 * @param rows - Complete persisted location set.
 * @returns Archived roots with all effectively archived descendants.
 */
export function projectArchivedLocationTree(rows: ReadonlyArray<LocationDomainRow>): LocationTreeNode[] {
  const metadata = projectLocationMetadata(rows);
  return buildLocationTree(
    rows,
    metadata,
    (row) => metadata.get(row.id)!.isEffectivelyArchived,
    (row) => row.archivedAt !== null && !metadata.get(row.id)!.isArchivedByAncestor,
  );
}

/**
 * Build one cycle-safe location tree from an eligibility predicate.
 *
 * @param rows - Complete persisted location set.
 * @param metadata - Derived path and archive metadata.
 * @param includes - Predicate deciding whether a row belongs to the projection.
 * @param isExplicitRoot - Optional predicate restricting projected roots.
 * @returns Naturally sorted recursive tree roots.
 */
function buildLocationTree(
  rows: ReadonlyArray<LocationDomainRow>,
  metadata: ReadonlyMap<number, LocationMetadata>,
  includes: (row: LocationDomainRow) => boolean,
  isExplicitRoot?: (row: LocationDomainRow) => boolean,
): LocationTreeNode[] {
  const includedRows = rows.filter(includes);
  const includedIds = new Set(includedRows.map((row) => row.id));
  const nodes = new Map<number, LocationTreeNode>();
  for (const row of includedRows) {
    const derived = metadata.get(row.id)!;
    nodes.set(row.id, {
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      path: derived.path,
      archivedAt: row.archivedAt,
      isEffectivelyArchived: derived.isEffectivelyArchived,
      children: [],
    });
  }

  const roots: LocationTreeNode[] = [];
  for (const row of includedRows) {
    const node = nodes.get(row.id)!;
    const parent = row.parentId === null ? undefined : nodes.get(row.parentId);
    if (parent !== undefined && parent.id !== node.id && !wouldCreateProjectionCycle(parent.id, node.id, rows)) {
      parent.children.push(node);
    } else if (isExplicitRoot === undefined ? !includedIds.has(row.parentId ?? -1) : isExplicitRoot(row)) {
      roots.push(node);
    }
  }
  sortLocationTree(roots);
  return roots;
}

/**
 * Detect an attachment cycle in potentially corrupt legacy rows.
 *
 * @param parentId - Proposed projected parent identifier.
 * @param childId - Proposed projected child identifier.
 * @param rows - Complete row set.
 * @returns Whether walking ancestors reaches the child.
 */
function wouldCreateProjectionCycle(parentId: number, childId: number, rows: ReadonlyArray<LocationDomainRow>): boolean {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const visited = new Set<number>();
  let current = byId.get(parentId);
  while (current !== undefined && !visited.has(current.id)) {
    if (current.id === childId) return true;
    visited.add(current.id);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return false;
}

/**
 * Sort every sibling level in place using the location ordering contract.
 *
 * @param nodes - Mutable response nodes at one sibling level.
 * @returns Nothing.
 */
function sortLocationTree(nodes: LocationTreeNode[]): void {
  nodes.sort(compareLocationSiblings);
  for (const node of nodes) sortLocationTree(node.children);
}
