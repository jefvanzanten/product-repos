import type { CatalogUrlState } from "./models/catalog-navigation.model";

const defaultCatalogLimit = 50;

/** Build the admin catalog href represented by a parsed catalog URL state. */
export function catalogHref(state: CatalogUrlState): string {
  return withCatalogState("/admin/product-catalogus", state);
}

/** Append catalog URL state to an admin href so detail pages can preserve catalog context. */
export function withCatalogState(path: string, state: CatalogUrlState): string {
  const stateSearch = catalogStateSearch(state);
  if (stateSearch.length === 0) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${stateSearch}`;
}

/** Serialize the query parameters that define the current catalog state. */
export function catalogStateSearch(state: CatalogUrlState): string {
  const params = new URLSearchParams();
  const query = state.q.trim();
  if (query.length > 0) {
    params.set("q", query);
  } else {
    if (state.brandId !== undefined) params.set("brandId", state.brandId);
    if (state.categoryId !== undefined) params.set("categoryId", String(state.categoryId));
  }
  if (state.limit !== defaultCatalogLimit) params.set("limit", String(state.limit));
  return params.toString();
}
