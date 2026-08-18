import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getPhysicalInventoryItems } from "../../data/inventory-api";
import { inventoryQueryKeys } from "../../data/inventory-query-keys";
import type {
  InventoryFilter,
  PhysicalInventoryProductGroup,
} from "../../domain/inventory";

/** Physical inventory query state exposed to the page. */
export type InventoryGroupsState = {
  readonly groups: ReadonlyArray<PhysicalInventoryProductGroup>;
  readonly filter: InventoryFilter;
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
  readonly updateFilter: (filter: InventoryFilter) => void;
};

/** Load paginated physical inventory groups for search and filter state. */
export function useInventoryGroups(): InventoryGroupsState {
  const [searchInput, setSearchInput] = useState("");
  const [requestQuery, setRequestQuery] = useState<string | null>(null);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const searchTimerRef = useRef<number | null>(null);
  const normalizedSearch = searchInput.trim();

  useEffect(
    () => () => {
      if (searchTimerRef.current !== null)
        window.clearTimeout(searchTimerRef.current);
    },
    [],
  );

  const inventoryQuery = useInfiniteQuery({
    queryKey: inventoryQueryKeys.items(requestQuery, filter),
    // SAFETY: TanStack Query requires the initial cursor's wider nullable type for later string cursors.
    initialPageParam: null as string | null,
    retry: false,
    queryFn: ({ pageParam, signal }) =>
      getPhysicalInventoryItems({
        query: requestQuery,
        filter,
        cursor: pageParam,
        signal,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.tag === "Success"
        ? (lastPage.value.nextCursor ?? undefined)
        : undefined,
  });
  const pages = inventoryQuery.data?.pages ?? [];
  const groups = pages.flatMap((page) =>
    page.tag === "Success" ? page.value.groups : [],
  );

  /** Update search text and debounce valid remote searches. */
  function updateSearchInput(value: string): void {
    const nextQuery = value.trim();
    setSearchInput(value);
    if (searchTimerRef.current !== null)
      window.clearTimeout(searchTimerRef.current);
    if (nextQuery.length < 2) {
      setRequestQuery(null);
      return;
    }
    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = null;
      setRequestQuery(nextQuery);
    }, 250);
  }

  /** Retry the active query. */
  function retry(): void {
    void inventoryQuery.refetch();
  }
  /** Load the next page. */
  function loadNextPage(): void {
    void inventoryQuery.fetchNextPage();
  }

  return {
    groups,
    filter,
    searchInput,
    requestQuery,
    responseFailed:
      inventoryQuery.isError || pages.some((page) => page.tag === "Failure"),
    searchNeedsMoreInput: normalizedSearch.length === 1,
    searchIsSettling:
      normalizedSearch.length >= 2 && requestQuery !== normalizedSearch,
    isFetching: inventoryQuery.isFetching,
    isPending: inventoryQuery.isPending,
    hasNextPage: inventoryQuery.hasNextPage,
    isFetchingNextPage: inventoryQuery.isFetchingNextPage,
    retry,
    loadNextPage,
    updateSearchInput,
    updateFilter: setFilter,
  };
}
