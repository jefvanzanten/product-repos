import type { InventoryFilter } from "../domain/inventory";

/** Central TanStack Query keys for Inventory server state. */
export const inventoryQueryKeys = {
  /** Root key for every grouped Inventory list. */
  itemLists: () => ["inventory", "items"] as const,

  /**
   * Build a key for one search- and filter-scoped grouped list.
   *
   * @param query - Active inventory search or null.
   * @param filter - Active inventory filter.
   * @returns Stable grouped-list query key.
   */
  items: (query: string | null, filter: InventoryFilter = "all") => ["inventory", "items", query, filter] as const,

  /** Stable key for the active location tree. */
  locations: () => ["inventory", "locations"] as const,

  /**
   * Build a key for one product-selection search.
   *
   * @param query - Debounced product search.
   * @returns Stable product-search query key.
   */
  productSearch: (query: string) => ["inventory", "product-search", query] as const,

  /**
   * Build a key for one physical package detail.
   *
   * @param itemId - Physical package identifier.
   * @returns Stable item-detail query key.
   */
  item: (itemId: string) => ["inventory", "item", itemId] as const,
} as const;
