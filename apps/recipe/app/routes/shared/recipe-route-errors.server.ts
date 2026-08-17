import { RecipeApiError } from "../../features/recipes/data/recipes-api.server";

/**
 * Translate a Recipe API loader failure into a neutral route response.
 *
 * @param error - Unknown data-layer failure.
 * @returns Never; the failure is always rethrown.
 */
export function throwRecipeLoaderError(error: unknown): never {
  if (error instanceof RecipeApiError) throw new Response(error.message, { status: error.status });
  throw error;
}
