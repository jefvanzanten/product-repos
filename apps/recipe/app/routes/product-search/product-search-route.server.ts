import { data, type LoaderFunctionArgs } from "react-router";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { RecipeApiError, searchRecipeProducts } from "../../features/recipes/data/recipes-api.server";

/** Proxy authenticated product autocomplete without exposing backend internals. */
export async function loadProductSearchRoute({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  const query = new URL(request.url).searchParams.get("query") ?? "";
  try {
    const products = await searchRecipeProducts(query, createBackendRequestContext(request));
    return data(products, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    if (error instanceof RecipeApiError) {
      return data({ code: error.code, message: error.message }, { status: error.status });
    }
    throw error;
  }
}
