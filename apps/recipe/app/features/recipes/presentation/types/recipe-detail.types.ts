import type { RecipeDetail } from "../../domain/recipe";

/** Data loaded by the recipe-detail route. */
export type RecipeDetailLoaderData = {
  readonly recipe: RecipeDetail;
};

/** Result returned by recipe owner actions. */
export type RecipeDetailActionResult = {
  readonly error?: string;
};
