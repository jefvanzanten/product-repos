/** Central TanStack Query keys for Inventory read responses. */
export const inventoryQueryKeys = {
  /**
   * Build the key for search-scoped grouped inventory pages.
   *
   * @param query - Active inventory search or null for the unfiltered list.
   * @returns The stable TanStack Query key.
   */
  items: (query: string | null) => ["inventory", "items", query] as const,
  /** Stable key for the active shared location tree. */
  locations: () => ["inventory", "locations"] as const,
  /**
   * Build the key for one package-selection search.
   *
   * @param query - Debounced product/package search.
   * @returns The stable package search key.
   */
  packageSearch: (query: string) => ["inventory", "package-search", query] as const,
} as const;
