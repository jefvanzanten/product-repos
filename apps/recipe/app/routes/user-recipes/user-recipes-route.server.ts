import { data, type LoaderFunctionArgs } from "react-router";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";
import { optionalUser } from "../../core/presentation/auth/auth.server";
import { parseRecipeListUrlState } from "../../features/recipes/presentation/routing/recipe-list-url-state";
import { listUserRecipes } from "../../features/recipes/data/recipes-api.server";
import type { UserRecipeListLoaderData } from "../../features/recipes/presentation/types/recipe-list.types";
import { throwRecipeLoaderError } from "../shared/recipe-route-errors.server";

/** Load one user's visible recipes and owner-only archived state. */
export async function loadUserRecipesRoute({ request, params }: LoaderFunctionArgs) {
  if (!params.userId) throw new Response("Niet gevonden", { status: 404 });
  const url = new URL(request.url);
  const [page, viewer] = await Promise.all([
    listUserRecipes(params.userId, url.search, createBackendRequestContext(request)).catch(throwRecipeLoaderError),
    optionalUser(request),
  ]);
  const state = parseRecipeListUrlState(url);
  return data<UserRecipeListLoaderData>({
    page,
    userId: params.userId,
    query: state.query,
    sort: state.sort,
    archived: state.archived,
  }, { headers: {
    "Cache-Control": viewer === null ? "public, max-age=60, stale-while-revalidate=300" : "private, no-store",
    Vary: "Cookie",
  } });
}
