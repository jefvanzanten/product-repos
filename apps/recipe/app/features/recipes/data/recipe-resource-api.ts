import {
  recipeIngredientInputOptionsSchema,
  recipeProductSearchResultSchema,
} from "@product-repos/contracts/recipes";
import type { RecipeIngredientInputOptions, RecipeProductSearchResult } from "../domain/recipe";
import { mapRecipeIngredientInputOptions, mapRecipeProductSearchResults } from "./recipe-mappers";

/** Search recipe products through the authenticated browser resource route. */
export async function searchRecipeProductsInBrowser(
  path: string,
  signal?: AbortSignal,
): Promise<ReadonlyArray<RecipeProductSearchResult>> {
  const response = await fetch(path, { signal });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Producten zoeken lukt nu niet.");
  return mapRecipeProductSearchResults(recipeProductSearchResultSchema.array().parse(value));
}

/** Load ingredient input choices through the authenticated browser resource route. */
export async function getRecipeInputOptionsInBrowser(path: string): Promise<RecipeIngredientInputOptions> {
  const response = await fetch(path);
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Eenheden ophalen lukt nu niet.");
  return mapRecipeIngredientInputOptions(recipeIngredientInputOptionsSchema.parse(value));
}
