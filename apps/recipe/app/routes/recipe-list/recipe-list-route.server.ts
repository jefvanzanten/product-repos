import { data, type LoaderFunctionArgs } from "react-router";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";
import { optionalUser } from "../../core/presentation/auth/auth.server";
import { parseRecipeListUrlState } from "../../features/recipes/presentation/routing/recipe-list-url-state";
import { listRecipes } from "../../features/recipes/data/recipes-api.server";
import type { PublicRecipeListLoaderData } from "../../features/recipes/presentation/types/recipe-list.types";

/** Load public recipes using URL-owned search and sorting state. */
export async function loadPublicRecipeListRoute({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const [page, user] = await Promise.all([
    listRecipes(url.search, createBackendRequestContext(request)),
    optionalUser(request),
  ]);
  const state = parseRecipeListUrlState(url);
  return data<PublicRecipeListLoaderData>({
    page,
    query: state.query,
    sort: state.sort,
  }, { headers: {
    "Cache-Control": user === null ? "public, max-age=60, stale-while-revalidate=300" : "private, no-store",
    Vary: "Cookie",
  } });
}
