/** Product-search request mode derived from presentation input. */
export type ProductSearchMode =
  | { readonly tag: "Recent" }
  | { readonly tag: "TooShort" }
  | { readonly tag: "Search"; readonly query: string };

/** Select recent, idle, or searched behavior from raw search input. */
export function getProductSearchMode(input: string): ProductSearchMode {
  const query = input.trim();
  if (query.length === 0) return { tag: "Recent" };
  if (query.length < 2) return { tag: "TooShort" };
  return { tag: "Search", query };
}
