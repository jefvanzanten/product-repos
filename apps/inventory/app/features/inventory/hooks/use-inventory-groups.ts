import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { InventoryProductGroup } from "@product-repos/contracts/inventory";
import { getInventoryItems } from "../../../api/inventory-api";
import { inventoryQueryKeys } from "../inventory-query-keys";

/** Inventory query state exposed to the page component. */
export type InventoryGroupsState = {
  readonly groups: ReadonlyArray<InventoryProductGroup>;
  readonly searchInput: string;
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
  readonly updateSearchInput: (value: string) => void;
};

/**
 * Load and combine paginated inventory groups for the debounced search input.
 *
 * @returns Page-oriented query state and search, retry, or pagination actions.
 */
export function useInventoryGroups(): InventoryGroupsState {
  const [searchInput, setSearchInput] = useState("");
  const [requestQuery, setRequestQuery] = useState<string | null>(null);
  const searchTimerRef = useRef<number | null>(null);
  const normalizedSearch = searchInput.trim();

  useEffect(() => {
    return () => {
      if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
    };
  }, []);
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
   * Update the visible search immediately and schedule its API query from the input event.
   *
   * @param value - Current untrusted search-field value.
   * @returns Nothing.
   */
  function updateSearchInput(value: string): void {
    const nextQuery = value.trim();
    setSearchInput(value);

    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    if (nextQuery.length < 2) {
      setRequestQuery((currentQuery) => currentQuery === null ? currentQuery : null);
      return;
    }

    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = null;
      setRequestQuery((currentQuery) => currentQuery === nextQuery ? currentQuery : nextQuery);
    }, 250);
  }

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
    searchInput,
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
    updateSearchInput,
  };
}
