import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { recipeDetailPath } from "../../core/presentation/routing/recipe-routes";
import { createRecipe, RecipeApiError } from "../../features/recipes/data/recipes-api.server";
import type { RecipeFormActionResult } from "../../features/recipes/presentation/types/recipe-form.types";
import { parseRecipeFormSubmission } from "../shared/recipe-form-submission.server";

/** Protect the recipe creation page. */
export async function loadRecipeNewRoute({ request }: LoaderFunctionArgs) {
  return { user: await requireUser(request) };
}

/** Validate and create one recipe before opening its canonical detail URL. */
export async function handleRecipeNewAction(
  { request }: ActionFunctionArgs,
): Promise<RecipeFormActionResult | Response> {
  const user = await requireUser(request);
  const submission = await parseRecipeFormSubmission(request);
  if (submission === null) return { error: "Controleer naam, porties en ingrediënten." };

  try {
    const recipe = await createRecipe(submission.input, createBackendRequestContext(request));
    return redirect(recipeDetailPath(user.id, recipe.id));
  } catch (error: unknown) {
    if (error instanceof RecipeApiError) return { error: error.message, fieldErrors: error.fields };
    throw error;
  }
}
