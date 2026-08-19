import type { InventoryProductSearchResult, PhysicalInventoryItemDetail, PhysicalInventoryPage, PhysicalInventoryProductGroup } from "@product-repos/contracts/inventory";
import { formatConcreteProductDisplayName } from "@product-repos/shared/product-presentation";
import { projectLocationMetadata } from "../../locations/domain/location-domain.ts";
import { addInventoryDecimals, compareInventoryDecimals, deriveExpiryStatus, inventoryRatio, multiplyInventoryDecimals, packageEquivalent } from "../domain/inventory-domain.ts";
import type { InventoryProductRow, InventoryReader, PhysicalInventoryStockRow } from "../repositories/inventory.repository.ts";

/** Parsed physical inventory list request. */
export type InventoryListQuery = {
  readonly query: string | null;
  readonly filter: "all" | "low-stock" | "expiring";
  readonly limit: number;
  readonly offset: number;
  readonly today: string;
};

/** Physical inventory read capability exposed to HTTP routes. */
export type InventoryQueryService = {
  readonly listInventory: (input: InventoryListQuery) => PhysicalInventoryPage;
  readonly findItem: (itemId: string) => PhysicalInventoryItemDetail | null;
  readonly searchProducts: (query: string, limit: number) => InventoryProductSearchResult[];
};

/** Build product-oriented physical inventory projections. */
export function createInventoryQueryService(reader: InventoryReader): InventoryQueryService {
  /** List and filter current physical inventory. */
  function listInventory(input: InventoryListQuery): PhysicalInventoryPage {
    const locations = projectLocationMetadata(reader.findAllLocations());
    const categoryPaths = buildPathMap(reader.findAllCategories());
    const thresholds = new Map(reader.findThresholds().map((row) => [row.productId, row.lowStockAmountBase]));
    const rowsByProduct = new Map<string, PhysicalInventoryStockRow[]>();
    for (const row of reader.findStockRows()) {
      const rows = rowsByProduct.get(row.productId) ?? [];
      rows.push(row);
      rowsByProduct.set(row.productId, rows);
    }
    const query = input.query?.trim().toLocaleLowerCase("nl") ?? null;
    const groups = [...rowsByProduct.values()]
      .filter((rows) => query === null || matchesQuery(rows, locations, categoryPaths, query))
      .map((rows) => projectGroup(rows, locations, categoryPaths, thresholds, input.today))
      .filter((group) => input.filter === "all" || (input.filter === "low-stock" ? group.isLowStock : isExpiring(group)))
      .sort(compareGroups);
    const page = groups.slice(input.offset, input.offset + input.limit);
    return { groups: page, nextCursor: input.offset + input.limit < groups.length ? String(input.offset + input.limit) : null };
  }

  /** Find one active physical item with detail metadata. */
  function findItem(itemId: string): PhysicalInventoryItemDetail | null {
    const row = reader.findStockRows().find((candidate) => candidate.itemId === itemId);
    if (row === undefined) return null;
    const locations = projectLocationMetadata(reader.findAllLocations());
    return projectItem(row, locations, buildPathMap(reader.findAllCategories()));
  }

  /** Search selectable concrete products with known content. */
  function searchProducts(query: string, limit: number): InventoryProductSearchResult[] {
    const normalized = query.trim().toLocaleLowerCase("nl");
    const categoryPaths = buildPathMap(reader.findAllCategories());
    return reader.findProductsWithKnownContent()
      .map((row) => projectProduct(row, categoryPaths))
      .filter((product) => [product.displayName, product.brandName ?? "", product.categoryPath].join(" ").toLocaleLowerCase("nl").includes(normalized))
      .slice(0, limit);
  }

  return { listInventory, findItem, searchProducts };
}

/** Project one concrete-product inventory group. */
function projectGroup(
  rows: ReadonlyArray<PhysicalInventoryStockRow>,
  locations: ReturnType<typeof projectLocationMetadata>,
  categoryPaths: ReadonlyMap<number, string>,
  thresholds: ReadonlyMap<string, string>,
  today: string,
): PhysicalInventoryProductGroup {
  const first = rows[0]!;
  const maximum = maximumAmount(first);
  let total = "0";
  const fullByKey = new Map<string, { productId: string; locationId: number; locationPath: string; expiryDate: string | null; count: number; itemIds: string[] }>();
  const partialItems: PhysicalInventoryItemDetail[] = [];
  for (const row of [...rows].sort(compareRows)) {
    total = addInventoryDecimals(total, row.remainingAmountBase);
    if (compareInventoryDecimals(row.remainingAmountBase, maximum) === 0) {
      const key = `${row.locationId}|${row.expiryDate ?? ""}`;
      const current = fullByKey.get(key) ?? { productId: row.productId, locationId: row.locationId, locationPath: locations.get(row.locationId)?.path ?? "Onbekende locatie", expiryDate: row.expiryDate, count: 0, itemIds: [] };
      current.count += 1;
      current.itemIds.push(row.itemId);
      fullByKey.set(key, current);
    } else {
      partialItems.push(projectItem(row, locations, categoryPaths));
    }
  }
  const dates = rows.map((row) => row.expiryDate).filter((date): date is string => date !== null).sort();
  const threshold = thresholds.get(first.productId) ?? null;
  return {
    product: projectProduct(first, categoryPaths),
    totalPackageEquivalent: packageEquivalent(total, maximum),
    earliestExpiryStatus: deriveExpiryStatus(dates[0] ?? null, today),
    isLowStock: threshold !== null && compareInventoryDecimals(total, threshold) <= 0,
    lowStockAmountBase: threshold,
    fullGroups: [...fullByKey.values()].sort(comparePresentationGroups),
    partialItems,
  };
}

/** Project one physical inventory item detail. */
function projectItem(row: PhysicalInventoryStockRow, locations: ReturnType<typeof projectLocationMetadata>, categoryPaths: ReadonlyMap<number, string>): PhysicalInventoryItemDetail {
  const maximum = maximumAmount(row);
  return {
    id: row.itemId,
    productId: row.productId,
    locationId: row.locationId,
    expiryDate: row.expiryDate,
    remainingAmountBase: row.remainingAmountBase,
    maximumAmountBase: maximum,
    remainingRatio: inventoryRatio(row.remainingAmountBase, maximum),
    isFull: compareInventoryDecimals(row.remainingAmountBase, maximum) === 0,
    version: row.version,
    product: projectProduct(row, categoryPaths),
    locationPath: locations.get(row.locationId)?.path ?? "Onbekende locatie",
    isLocationArchived: locations.get(row.locationId)?.isEffectivelyArchived ?? false,
  };
}

/** Project shared concrete-product presentation fields. */
function projectProduct(row: InventoryProductRow, categoryPaths: ReadonlyMap<number, string>): InventoryProductSearchResult {
  return {
    productId: row.productId,
    displayName: formatConcreteProductDisplayName({ brandName: row.brandName, compositionName: row.compositionName, packageTypeName: row.packageTypeName, contentAmount: row.contentAmount, contentUnitSymbol: row.contentUnitSymbol }),
    compositionName: row.compositionName,
    brandName: row.brandName,
    package: {
      typeName: row.packageTypeName,
      contentAmount: row.contentAmount,
      contentUnitSymbol: row.contentUnitSymbol,
    },
    categoryPath: categoryPaths.get(row.categoryId) ?? "",
    imageUrl: row.imageUrl,
    maximumAmountBase: maximumAmount(row),
    baseUnitSymbol: row.dimension === "MASS" ? "g" : row.dimension === "VOLUME" ? "ml" : "st",
    dimension: row.dimension,
    archivedAt: row.archivedAt,
  };
}

/** Calculate exact maximum content in the dimension's base unit. */
function maximumAmount(row: Pick<InventoryProductRow, "contentAmount" | "conversionToBase">): string {
  return multiplyInventoryDecimals(row.contentAmount, row.conversionToBase);
}

/** Check free text against product, category, and every location path. */
function matchesQuery(rows: ReadonlyArray<PhysicalInventoryStockRow>, locations: ReturnType<typeof projectLocationMetadata>, categories: ReadonlyMap<number, string>, query: string): boolean {
  const product = projectProduct(rows[0]!, categories);
  return [product.displayName, product.categoryPath, ...rows.map((row) => locations.get(row.locationId)?.path ?? "")].join(" ").toLocaleLowerCase("nl").includes(query);
}

/** Determine whether a group belongs in the nearly-expired filter. */
function isExpiring(group: PhysicalInventoryProductGroup): boolean {
  return ["EXPIRED", "TODAY", "URGENT", "SOON"].includes(group.earliestExpiryStatus);
}

/** Sort physical rows by expiry, with undated rows last. */
function compareRows(left: PhysicalInventoryStockRow, right: PhysicalInventoryStockRow): number {
  if (left.expiryDate === right.expiryDate) return left.itemId.localeCompare(right.itemId);
  if (left.expiryDate === null) return 1;
  if (right.expiryDate === null) return -1;
  return left.expiryDate.localeCompare(right.expiryDate);
}

/** Sort full presentation groups by expiry, with undated groups last. */
function comparePresentationGroups(left: { expiryDate: string | null }, right: { expiryDate: string | null }): number {
  if (left.expiryDate === right.expiryDate) return 0;
  if (left.expiryDate === null) return 1;
  if (right.expiryDate === null) return -1;
  return left.expiryDate.localeCompare(right.expiryDate);
}

/** Sort product groups by urgency and then display name. */
function compareGroups(left: PhysicalInventoryProductGroup, right: PhysicalInventoryProductGroup): number {
  const order = { EXPIRED: 0, TODAY: 1, URGENT: 2, SOON: 3, LATER: 4, NONE: 5 } as const;
  return order[left.earliestExpiryStatus] - order[right.earliestExpiryStatus] || left.product.displayName.localeCompare(right.product.displayName, "nl");
}

/** Build cycle-safe root-to-node paths. */
function buildPathMap(nodes: ReadonlyArray<{ readonly id: number; readonly parentId: number | null; readonly name: string }>): Map<number, string> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const paths = new Map<number, string>();
  for (const node of nodes) {
    const names: string[] = [];
    const visited = new Set<number>();
    let current: typeof node | undefined = node;
    while (current !== undefined && !visited.has(current.id)) {
      visited.add(current.id);
      names.unshift(current.name);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    paths.set(node.id, names.join(" › "));
  }
  return paths;
}
