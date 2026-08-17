import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchInventoryProducts } from "../../data/inventory-api";
import { inventoryQueryKeys } from "../../data/inventory-query-keys";
import type { InventoryProduct } from "../../domain/inventory";

/** Product-search state consumed by the add-inventory form. */
export type InventoryProductSearchState = {
  readonly searchInput: string;
  readonly requestQuery: string;
  readonly selectedProduct: InventoryProduct | null;
  readonly results: ReadonlyArray<InventoryProduct>;
  readonly isPending: boolean;
  readonly failed: boolean;
  readonly succeeded: boolean;
  readonly updateSearch: (value: string) => void;
  readonly selectProduct: (product: InventoryProduct) => void;
  readonly clearSelection: () => void;
};

/** Load debounced products and own selection state for the add flow. */
export function useInventoryProductSearch(): InventoryProductSearchState {
  const searchTimerRef = useRef<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [requestQuery, setRequestQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const productQuery = useQuery({
    queryKey: inventoryQueryKeys.productSearch(requestQuery),
    queryFn: ({ signal }) => searchInventoryProducts(requestQuery, signal),
    enabled: requestQuery.length >= 2,
    retry: false,
  });

  useEffect(() => () => {
    if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
  }, []);

  /** Update visible search text and debounce a valid external query. */
  function updateSearch(value: string): void {
    setSearchInput(value);
    if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
    const normalized = value.trim();
    if (normalized.length < 2) {
      setRequestQuery("");
      return;
    }
    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = null;
      setRequestQuery(normalized);
    }, 250);
  }

  /** Select one product and close the active result list. */
  function selectProduct(product: InventoryProduct): void {
    setSelectedProduct(product);
    setSearchInput("");
    setRequestQuery("");
  }

  /** Clear the selected product so another can be chosen. */
  function clearSelection(): void {
    setSelectedProduct(null);
  }

  return {
    searchInput,
    requestQuery,
    selectedProduct,
    results: productQuery.data?.tag === "Success" ? productQuery.data.value : [],
    isPending: productQuery.isPending,
    failed: productQuery.data?.tag === "Failure",
    succeeded: productQuery.data?.tag === "Success",
    updateSearch,
    selectProduct,
    clearSelection,
  };
}
