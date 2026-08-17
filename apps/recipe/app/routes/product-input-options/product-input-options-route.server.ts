import { data, type LoaderFunctionArgs } from "react-router";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { getRecipeInputOptions, RecipeApiError } from "../../features/recipes/data/recipes-api.server";

/** Proxy authenticated ingredient input choices for one product. */
export async function loadProductInputOptionsRoute({ request, params }: LoaderFunctionArgs) {
  await requireUser(request);
  if (!params.productId) throw new Response("Niet gevonden", { status: 404 });
  try {
    const options = await getRecipeInputOptions(params.productId, createBackendRequestContext(request));
    return data(options, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    if (error instanceof RecipeApiError) {
      return data({ code: error.code, message: error.message }, { status: error.status });
    }
    throw error;
  }
}
