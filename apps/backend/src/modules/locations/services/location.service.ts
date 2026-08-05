import type { CreateLocationRequest, LocationTreeNode, UpdateLocationRequest } from "@product-repos/contracts/locations";
import { err, ok, type Result } from "../../../result.ts";
import {
  normalizeLocationName,
  projectActiveLocationTree,
  projectArchivedLocationTree,
  projectLocationMetadata,
  type LocationDomainRow,
} from "../domain/location-domain.ts";
import type { LocationPersistenceRow, LocationStore } from "../repositories/location-store.ts";

/** Expected location-management conflicts represented without exceptions. */
export type LocationServiceError =
  | "VALIDATION_ERROR"
  | "LOCATION_NOT_FOUND"
  | "PARENT_LOCATION_NOT_FOUND"
  | "LOCATION_ALREADY_EXISTS"
  | "LOCATION_ARCHIVED"
  | "PARENT_LOCATION_ARCHIVED"
  | "LOCATION_CYCLE"
  | "LOCATION_ARCHIVED_BY_ANCESTOR";

/** Location management use cases exposed to the HTTP adapter. */
export type LocationService = {
  readonly listActiveLocations: () => LocationTreeNode[];
  readonly listArchivedLocations: () => LocationTreeNode[];
  readonly createLocation: (input: CreateLocationRequest) => Result<LocationTreeNode, LocationServiceError>;
  readonly updateLocation: (id: number, input: UpdateLocationRequest) => Result<LocationTreeNode, LocationServiceError>;
  readonly archiveLocation: (id: number) => Result<LocationTreeNode, LocationServiceError>;
  readonly restoreLocation: (id: number) => Result<LocationTreeNode, LocationServiceError>;
};

/**
 * Create location management use cases from one injected persistence port.
 *
 * @param store - Location persistence capability.
 * @param now - ISO timestamp source used by writes.
 * @returns Location read and write operations.
 */
export function createLocationService(store: LocationStore, now: () => string = () => new Date().toISOString()): LocationService {
  /** List only effectively active locations. */
  function listActiveLocations(): LocationTreeNode[] {
    return projectActiveLocationTree(store.findAll());
  }

  /** List archive forests with current complete paths. */
  function listArchivedLocations(): LocationTreeNode[] {
    return projectArchivedLocationTree(store.findAll());
  }

  /** Create a normalized root location or child under an active parent. */
  function createLocation(input: CreateLocationRequest): Result<LocationTreeNode, LocationServiceError> {
    const normalized = normalizeLocationName(input.name);
    if (!normalized.ok) return err("VALIDATION_ERROR");
    try {
      return store.transaction((transaction) => {
        const rows = transaction.findAll();
        if (input.parentId !== null) {
          const parent = rows.find((row) => row.id === input.parentId);
          if (parent === undefined) return err("PARENT_LOCATION_NOT_FOUND");
          if (isEffectivelyArchived(parent.id, rows)) return err("PARENT_LOCATION_ARCHIVED");
        }
        if (hasSiblingName(rows, input.parentId, normalized.value.normalizedName)) {
          return err("LOCATION_ALREADY_EXISTS");
        }
        const timestamp = now();
        const inserted = transaction.insert({
          parentId: input.parentId,
          name: normalized.value.name,
          normalizedName: normalized.value.normalizedName,
          archivedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return ok(toResponseNode(inserted, [...rows, inserted]));
      });
    } catch (cause: unknown) {
      if (isLocationUniqueConflict(cause)) return err("LOCATION_ALREADY_EXISTS");
      throw cause;
    }
  }

  /** Rename and/or move a location after validating the complete current tree. */
  function updateLocation(id: number, input: UpdateLocationRequest): Result<LocationTreeNode, LocationServiceError> {
    const normalized = input.name === undefined ? null : normalizeLocationName(input.name);
    if (normalized !== null && !normalized.ok) return err("VALIDATION_ERROR");
    try {
      return store.transaction((transaction) => {
        const rows = transaction.findAll();
        const current = rows.find((row) => row.id === id);
        if (current === undefined) return err("LOCATION_NOT_FOUND");
        const moves = input.parentId !== undefined;
        const targetParentId = moves ? input.parentId! : current.parentId;
        if (moves) {
          if (isEffectivelyArchived(id, rows)) return err("LOCATION_ARCHIVED");
          if (targetParentId === current.parentId || targetParentId === id || isDescendant(targetParentId, id, rows)) {
            return err("LOCATION_CYCLE");
          }
          if (targetParentId !== null) {
            const parent = rows.find((row) => row.id === targetParentId);
            if (parent === undefined) return err("PARENT_LOCATION_NOT_FOUND");
            if (isEffectivelyArchived(parent.id, rows)) return err("PARENT_LOCATION_ARCHIVED");
          }
        }
        const targetNormalizedName = normalized?.ok === true ? normalized.value.normalizedName : current.normalizedName;
        if (hasSiblingName(rows, targetParentId, targetNormalizedName, id)) return err("LOCATION_ALREADY_EXISTS");
        const updated = transaction.update(id, {
          ...(moves ? { parentId: targetParentId } : {}),
          ...(normalized?.ok === true ? { name: normalized.value.name, normalizedName: normalized.value.normalizedName } : {}),
          updatedAt: now(),
        });
        const updatedRows = rows.map((row) => row.id === id ? updated : row);
        return ok(toResponseNode(updated, updatedRows));
      });
    } catch (cause: unknown) {
      if (isLocationUniqueConflict(cause)) return err("LOCATION_ALREADY_EXISTS");
      throw cause;
    }
  }

  /** Directly archive an active node without changing descendants or stock. */
  function archiveLocation(id: number): Result<LocationTreeNode, LocationServiceError> {
    return store.transaction((transaction) => {
      const rows = transaction.findAll();
      const current = rows.find((row) => row.id === id);
      if (current === undefined) return err("LOCATION_NOT_FOUND");
      if (current.archivedAt !== null) return ok(toResponseNode(current, rows));
      if (isArchivedByAncestor(id, rows)) return err("LOCATION_ARCHIVED_BY_ANCESTOR");
      const timestamp = now();
      const updated = transaction.update(id, { archivedAt: timestamp, updatedAt: timestamp });
      return ok(toResponseNode(updated, rows.map((row) => row.id === id ? updated : row)));
    });
  }

  /** Restore one directly archived node when every ancestor is active. */
  function restoreLocation(id: number): Result<LocationTreeNode, LocationServiceError> {
    return store.transaction((transaction) => {
      const rows = transaction.findAll();
      const current = rows.find((row) => row.id === id);
      if (current === undefined) return err("LOCATION_NOT_FOUND");
      if (isArchivedByAncestor(id, rows)) return err("LOCATION_ARCHIVED_BY_ANCESTOR");
      if (current.archivedAt === null) return ok(toResponseNode(current, rows));
      const timestamp = now();
      const updated = transaction.update(id, { archivedAt: null, updatedAt: timestamp });
      return ok(toResponseNode(updated, rows.map((row) => row.id === id ? updated : row)));
    });
  }

  return { listActiveLocations, listArchivedLocations, createLocation, updateLocation, archiveLocation, restoreLocation };
}

/**
 * Determine effective archive status from the shared cycle-safe projector.
 *
 * @param id - Location identifier.
 * @param rows - Complete current tree.
 * @returns Whether the node or one of its ancestors is archived.
 */
function isEffectivelyArchived(id: number, rows: ReadonlyArray<LocationDomainRow>): boolean {
  return projectLocationMetadata(rows).get(id)?.isEffectivelyArchived ?? false;
}

/**
 * Determine whether an ancestor, rather than the node itself, archives a node.
 *
 * @param id - Location identifier.
 * @param rows - Complete current tree.
 * @returns Whether an archived ancestor exists.
 */
function isArchivedByAncestor(id: number, rows: ReadonlyArray<LocationDomainRow>): boolean {
  return projectLocationMetadata(rows).get(id)?.isArchivedByAncestor ?? false;
}

/**
 * Check normalized sibling uniqueness, including archived rows.
 *
 * @param rows - Complete current location set.
 * @param parentId - Target parent or root level.
 * @param normalizedName - Canonical comparison key.
 * @param excludingId - Optional row excluded during rename or move.
 * @returns Whether a conflicting sibling exists.
 */
function hasSiblingName(
  rows: ReadonlyArray<LocationPersistenceRow>,
  parentId: number | null,
  normalizedName: string,
  excludingId?: number,
): boolean {
  return rows.some((row) => row.id !== excludingId && row.parentId === parentId && row.normalizedName === normalizedName);
}

/**
 * Determine whether a target parent belongs to the moving node's subtree.
 *
 * @param targetParentId - Proposed parent identifier or root.
 * @param locationId - Moving location identifier.
 * @param rows - Complete current tree.
 * @returns Whether the target is a descendant.
 */
function isDescendant(targetParentId: number | null, locationId: number, rows: ReadonlyArray<LocationPersistenceRow>): boolean {
  if (targetParentId === null) return false;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const visited = new Set<number>();
  let current = byId.get(targetParentId);
  while (current !== undefined && !visited.has(current.id)) {
    if (current.parentId === locationId) return true;
    visited.add(current.id);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return false;
}

/**
 * Project one changed row with current path and effective status.
 *
 * @param row - Changed persistence row.
 * @param rows - Complete post-write row set.
 * @returns Strict response node without an eagerly loaded subtree.
 */
function toResponseNode(row: LocationPersistenceRow, rows: ReadonlyArray<LocationPersistenceRow>): LocationTreeNode {
  const metadata = projectLocationMetadata(rows).get(row.id);
  if (metadata === undefined) throw new Error("Location projection omitted a persisted row");
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    path: metadata.path,
    archivedAt: row.archivedAt,
    isEffectivelyArchived: metadata.isEffectivelyArchived,
    children: [],
  };
}

/**
 * Classify only the two location unique indexes as expected race conflicts.
 *
 * @param cause - Unknown persistence exception.
 * @returns Whether SQLite reports a normalized location uniqueness conflict.
 */
function isLocationUniqueConflict(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false;
  return cause.message.includes("location.normalized_name") || cause.message.includes("location.parent_id, location.normalized_name");
}
