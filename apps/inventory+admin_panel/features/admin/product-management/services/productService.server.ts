import type { ProductSearchResponse } from "@product-repos/contracts/product-search";

const apiBaseUrl = process.env.API_URL ?? "http://localhost:3000";

async function getProductResults(
  query: string,
): Promise<ProductSearchResponse> {
  const searchParams = new URLSearchParams({ q: query });

  const response = await fetch(
    `${apiBaseUrl.replace(/\/$/, "")}/api/product-search?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Product search failed with status ${response.status}`);
  }

  return response.json() as Promise<ProductSearchResponse>;
}

export { getProductResults };
