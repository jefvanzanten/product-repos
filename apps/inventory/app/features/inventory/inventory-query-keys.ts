/** Central TanStack Query keys for Inventory read responses. */
export const inventoryQueryKeys = {
  /**
   * Build the key for search-scoped grouped inventory pages.
   *
   * @param query - Active inventory search or null for the unfiltered list.
   * @returns The stable TanStack Query key.
   */
  items: (query: string | null) => ["inventory", "items", query] as const,
} as const;
