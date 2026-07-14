import type { ProductSearchResponse } from "@product-repos/contracts/product-search";

interface ProductManagementLoaderData {
  query: string;
  result?: ProductSearchResponse;
}

export type { ProductManagementLoaderData };
