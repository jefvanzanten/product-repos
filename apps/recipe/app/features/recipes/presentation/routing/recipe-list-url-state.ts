import type { RecipeSort } from "../../domain/recipe";

/** Parsed URL state shared by public and maker recipe lists. */
export type RecipeListUrlState = {
  readonly query: string;
  readonly sort: RecipeSort;
  readonly archived: boolean;
};

/**
 * Parse supported Recipe list filters from a request URL.
 *
 * @param url - Incoming recipe-list URL.
 * @returns Normalized list state.
 */
export function parseRecipeListUrlState(url: URL): RecipeListUrlState {
  const sort = url.searchParams.get("sort");
  return {
    query: url.searchParams.get("query") ?? "",
    sort: sort === "oldest" || sort === "name" ? sort : "newest",
    archived: url.searchParams.get("archived") === "true",
  };
}
