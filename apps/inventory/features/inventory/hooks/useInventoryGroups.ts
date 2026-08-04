import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { InventoryProductGroup } from "@product-repos/contracts/inventory";
import { getInventoryItems } from "../../../app/api/inventory-api/inventory-api";
import { inventoryQueryKeys } from "../../../app/api/inventory-api/inventory-query-keys";

/** Inventory query state exposed to the page component. */
export type InventoryGroupsState = {
  readonly groups: ReadonlyArray<InventoryProductGroup>;
  readonly requestQuery: string | null;
  readonly responseFailed: boolean;
  readonly searchNeedsMoreInput: boolean;
  readonly searchIsSettling: boolean;
  readonly isFetching: boolean;
  readonly isPending: boolean;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly retry: () => void;
  readonly loadNextPage: () => void;
};

/**
 * Load and combine paginated inventory groups for the debounced search input.
 *
 * @param searchInput - Current untrusted value from the inventory search field.
 * @returns Page-oriented query state and retry or pagination actions.
 */
export function useInventoryGroups(searchInput: string): InventoryGroupsState {
  const normalizedSearch = searchInput.trim();
  const requestQuery = useDebouncedInventoryQuery(normalizedSearch);
  const inventoryQuery = useInfiniteQuery({
    queryKey: inventoryQueryKeys.items(requestQuery),
    initialPageParam: null as string | null,
    retry: false,
    queryFn: ({ pageParam, signal }) => getInventoryItems({ query: requestQuery, cursor: pageParam, signal }),
    getNextPageParam: (lastPage) => lastPage._tag === "Success"
      ? lastPage.value.nextCursor ?? undefined
      : undefined,
  });

  const pages = inventoryQuery.data?.pages ?? [];
  const groups = useMemo(
    () => pages.flatMap((page) => page._tag === "Success" ? page.value.groups : []),
    [pages],
  );

  /**
   * Retry the current inventory query.
   *
   * @returns Nothing.
   */
  function retry(): void {
    void inventoryQuery.refetch();
  }

  /**
   * Load the next inventory page when one is available.
   *
   * @returns Nothing.
   */
  function loadNextPage(): void {
    void inventoryQuery.fetchNextPage();
  }

  return {
    groups,
    requestQuery,
    responseFailed: inventoryQuery.isError || pages.some((page) => page._tag === "Failure"),
    searchNeedsMoreInput: normalizedSearch.length === 1,
    searchIsSettling: normalizedSearch.length >= 2 && requestQuery !== normalizedSearch,
    isFetching: inventoryQuery.isFetching,
    isPending: inventoryQuery.isPending,
    hasNextPage: inventoryQuery.hasNextPage,
    isFetchingNextPage: inventoryQuery.isFetchingNextPage,
    retry,
    loadNextPage,
  };
}

/**
 * Convert normalized search input into a debounced API query.
 *
 * @param normalizedSearch - Trimmed search input.
 * @returns A null query below two characters or the debounced search text.
 */
function useDebouncedInventoryQuery(normalizedSearch: string): string | null {
  const [requestQuery, setRequestQuery] = useState<string | null>(null);

  useEffect(() => {
    if (normalizedSearch.length < 2) {
      setRequestQuery(null);
      return;
    }
    const timer = window.setTimeout(() => setRequestQuery(normalizedSearch), 250);
    return () => window.clearTimeout(timer);
  }, [normalizedSearch]);

  return requestQuery;
}
