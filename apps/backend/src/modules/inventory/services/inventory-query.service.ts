import type { InventoryPackageSearchResult, InventoryPage, InventoryProductGroup } from "@product-repos/contracts/inventory";
import type { InventoryPackageRow, InventoryReader, InventoryStockRow } from "../repositories/inventory-reader.ts";
import { projectLocationMetadata, type LocationMetadata } from "../../locations/domain/location-domain.ts";

/** Parsed list request accepted by the inventory query service. */
export type InventoryListQuery = {
  readonly query: string | null;
  readonly limit: number;
  readonly offset: number;
};

/** Inventory read capability exposed to the HTTP adapter. */
export type InventoryQueryService = {
  /**
   * List current stock grouped per product package.
   *
   * @param input - Search and pagination values for the list request.
   * @returns One page of matching inventory product groups.
   */
  readonly listInventory: (input: InventoryListQuery) => InventoryPage;
  /**
   * Search active catalog packages for inventory registration.
   *
   * @param query - Trimmed free-text query with at least two characters.
   * @param limit - Maximum number of package results.
   * @returns Matching package choices in deterministic order.
   */
  readonly searchPackages: (query: string, limit: number) => InventoryPackageSearchResult[];
};

/** Grouping key with derived presentation fields for one product package. */
type GroupDraft = {
  readonly productId: string;
  readonly productPackageId: number;
  readonly displayName: string;
  readonly brandName: string | null;
  readonly packageSummary: string;
  readonly categoryPath: string;
  readonly imageUrl: string | null;
  readonly archivedAt: string | null;
  readonly items: InventoryStockRow[];
};

/**
 * Create the inventory read capability from one injected persistence port.
 *
 * @param reader - Persistence reader supplying inventory and path source rows.
 * @returns The inventory query service.
 */
export function createInventoryQueryService(reader: InventoryReader): InventoryQueryService {
  /**
   * List current stock grouped per product package with urgency ordering.
   *
   * @param input - Search and pagination values for the list request.
   * @returns One page of matching inventory product groups.
   */
  function listInventory(input: InventoryListQuery): InventoryPage {
    const stockRows = reader.findStockRows();
    const locationMetadata = projectLocationMetadata(reader.findAllLocations());
    const locationPaths = new Map([...locationMetadata].map(([id, value]) => [id, value.path]));
    const categoryPaths = buildPathMap(reader.findAllCategories());
    const searchable = input.query === null ? null : input.query.trim().toLowerCase();

    const drafts: GroupDraft[] = [];
    const draftByPackage = new Map<number, GroupDraft>();
    for (const row of stockRows) {
      let draft = draftByPackage.get(row.productPackageId);
      if (draft === undefined) {
        draft = {
          productId: row.productId,
          productPackageId: row.productPackageId,
          displayName: row.productName,
          brandName: row.brandName,
          packageSummary: formatPackageSummary(row),
          categoryPath: categoryPaths.get(row.categoryId) ?? "",
          imageUrl: row.packageImageUrl,
          archivedAt: row.packageArchivedAt ?? row.productArchivedAt,
          items: [],
        };
        draftByPackage.set(row.productPackageId, draft);
        drafts.push(draft);
      }
      draft.items.push(row);
    }

    const matched = drafts.filter((draft) => matchesQuery(draft, locationPaths, searchable));
    const groups = matched.map((draft) => toProductGroup(draft, locationMetadata)).sort(compareGroups);
    const page = groups.slice(input.offset, input.offset + input.limit);
    return { groups: page, nextCursor: input.offset + input.limit < groups.length ? String(input.offset + input.limit) : null };
  }

  /** Search active packages across all documented selection fields. */
  function searchPackages(query: string, limit: number): InventoryPackageSearchResult[] {
    const categoryPaths = buildPathMap(reader.findAllCategories());
    const normalizedQuery = query.trim().toLocaleLowerCase("nl");
    return reader.findActivePackageRows()
      .filter((row) => packageMatchesQuery(row, categoryPaths.get(row.categoryId) ?? "", normalizedQuery))
      .slice(0, limit)
      .map((row) => ({
        productId: row.productId,
        productPackageId: row.productPackageId,
        displayName: row.productName,
        brandName: row.brandName,
        packageSummary: formatPackageSummary(row),
        categoryPath: categoryPaths.get(row.categoryId) ?? "",
        imageUrl: row.packageImageUrl,
      }));
  }

  return { listInventory, searchPackages };
}

/**
 * Check one group against the lowercased search term across all documented fields.
 *
 * @param draft - Product-package group before response projection.
 * @param locationPaths - Resolved location paths keyed by location identifier.
 * @param query - Lowercased search term or null when no search is active.
 * @returns Whether the group matches the search term.
 */
function matchesQuery(
  draft: GroupDraft,
  locationPaths: ReadonlyMap<number, string>,
  query: string | null,
): boolean {
  if (query === null || query.length === 0) return true;
  const haystack = [
    draft.displayName,
    draft.brandName ?? "",
    draft.packageSummary,
    draft.categoryPath,
    ...draft.items.map((item) => locationPaths.get(item.locationId) ?? ""),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

/**
 * Check one package choice against product, package, brand, and category text.
 *
 * @param row - Active package projection.
 * @param categoryPath - Derived category path for the package.
 * @param query - Normalized search query.
 * @returns Whether the package matches the query.
 */
function packageMatchesQuery(row: InventoryPackageRow, categoryPath: string, query: string): boolean {
  return [row.productName, row.brandName ?? "", formatPackageSummary(row), categoryPath]
    .join(" ")
    .toLocaleLowerCase("nl")
    .includes(query);
}

/**
 * Project one group draft into the strict response contract.
 *
 * @param draft - Product-package group before response projection.
 * @param locationPaths - Resolved location paths keyed by location identifier.
 * @returns A strict inventory product group.
 */
function toProductGroup(draft: GroupDraft, locationMetadata: ReadonlyMap<number, LocationMetadata>): InventoryProductGroup {
  const items = [...draft.items].sort(compareBatches).map((row) => ({
    id: row.itemId,
    locationId: row.locationId,
    locationPath: locationMetadata.get(row.locationId)?.path ?? "Onbekende locatie",
    isLocationArchived: locationMetadata.get(row.locationId)?.isEffectivelyArchived ?? false,
    expiryDate: row.expiryDate,
    quantity: row.quantity,
    version: row.version,
  }));
  return {
    productId: draft.productId,
    productPackageId: draft.productPackageId,
    displayName: draft.displayName,
    brandName: draft.brandName,
    packageSummary: draft.packageSummary,
    categoryPath: draft.categoryPath,
    imageUrl: draft.imageUrl,
    totalQuantity: draft.items.reduce((sum, row) => sum + row.quantity, 0),
    earliestExpiryDate: earliestDate(draft.items),
    archivedAt: draft.archivedAt,
    items,
  };
}

/**
 * Order batches from earliest expiry first and keep undated batches last.
 *
 * @param a - Left batch in the comparison.
 * @param b - Right batch in the comparison.
 * @returns A standard ascending sort comparison value.
 */
function compareBatches(a: InventoryStockRow, b: InventoryStockRow): number {
  if (a.expiryDate !== null && b.expiryDate !== null) {
    if (a.expiryDate !== b.expiryDate) return a.expiryDate < b.expiryDate ? -1 : 1;
    return a.locationId - b.locationId;
  }
  if (a.expiryDate !== null) return -1;
  if (b.expiryDate !== null) return 1;
  return a.locationId - b.locationId;
}

/**
 * Order groups from most urgent first and keep undated groups alphabetical last.
 *
 * @param a - Left product group in the comparison.
 * @param b - Right product group in the comparison.
 * @returns A standard ascending sort comparison value.
 */
function compareGroups(a: InventoryProductGroup, b: InventoryProductGroup): number {
  if (a.earliestExpiryDate !== null && b.earliestExpiryDate !== null) {
    if (a.earliestExpiryDate !== b.earliestExpiryDate) return a.earliestExpiryDate < b.earliestExpiryDate ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  }
  if (a.earliestExpiryDate !== null) return -1;
  if (b.earliestExpiryDate !== null) return 1;
  return a.displayName.localeCompare(b.displayName);
}

/**
 * Find the earliest known expiry date among one group's batches.
 *
 * @param rows - Stock rows belonging to one product-package group.
 * @returns The earliest ISO date or null when all batches are undated.
 */
function earliestDate(rows: ReadonlyArray<InventoryStockRow>): string | null {
  let earliest: string | null = null;
  for (const row of rows) {
    if (row.expiryDate === null) continue;
    if (earliest === null || row.expiryDate < earliest) earliest = row.expiryDate;
  }
  return earliest;
}

/**
 * Format complete package content for inventory presentation.
 *
 * @param row - Joined stock row containing package presentation fields.
 * @returns The human-readable package summary.
 */
function formatPackageSummary(row: Pick<InventoryStockRow, "packageTypeName" | "contentAmount" | "contentUnitName">): string {
  return `${row.packageTypeName} ${row.contentAmount} ${row.contentUnitName}`;
}

/** Tree node shape accepted by the cycle-safe path builder. */
type PathNode = { readonly id: number; readonly parentId: number | null; readonly name: string };

/**
 * Build root-to-node display paths for one tree while bounding cyclic references.
 *
 * @param nodes - Flat tree nodes with parent identifiers.
 * @returns Display paths keyed by node identifier.
 */
function buildPathMap(nodes: ReadonlyArray<PathNode>): Map<number, string> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const paths = new Map<number, string>();
  for (const node of nodes) {
    if (paths.has(node.id)) continue;
    const chain: PathNode[] = [];
    const visited = new Set<number>();
    let current: PathNode | undefined = node;
    while (current !== undefined && !visited.has(current.id) && !paths.has(current.id)) {
      visited.add(current.id);
      chain.unshift(current);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    const prefix = current !== undefined && paths.has(current.id) ? paths.get(current.id)! : null;
    let resolved = prefix;
    for (const link of chain) {
      resolved = resolved === null ? link.name : `${resolved} › ${link.name}`;
      paths.set(link.id, resolved);
    }
  }
  return paths;
}
