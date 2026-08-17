import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { recipeDetailPath } from "../../core/presentation/routing/recipe-routes";
import {
  getRecipe,
  getRecipeInputOptions,
  RecipeApiError,
  updateRecipe,
} from "../../features/recipes/data/recipes-api.server";
import type {
  RecipeEditLoaderData,
  RecipeFormActionResult,
} from "../../features/recipes/presentation/types/recipe-form.types";
import { parseRecipeFormSubmission } from "../shared/recipe-form-submission.server";
import { throwRecipeLoaderError } from "../shared/recipe-route-errors.server";

/** Load an owner recipe for editing and reject all other visitors neutrally. */
export async function loadRecipeEditRoute({ request, params }: LoaderFunctionArgs): Promise<RecipeEditLoaderData> {
  const user = await requireUser(request);
  if (!params.userId || !params.recipeId || params.userId !== user.id) {
    throw new Response("Niet gevonden", { status: 404 });
  }
  const context = createBackendRequestContext(request);
  const recipe = await getRecipe(params.userId, params.recipeId, context).catch(throwRecipeLoaderError);
  if (!recipe.ownerActions.canEdit) throw new Response("Niet gevonden", { status: 404 });

  const optionEntries = await Promise.all(recipe.ingredients.map(async (ingredient) => {
    if (ingredient.productArchived) return [ingredient.productId, undefined] as const;
    const options = await getRecipeInputOptions(ingredient.productId, context).catch(throwRecipeLoaderError);
    return [ingredient.productId, options] as const;
  }));
  return {
    recipe,
    initialOptions: Object.fromEntries(optionEntries.filter((entry) => entry[1] !== undefined)),
  };
}

/** Replace recipe fields under the concurrency token loaded by the editor. */
export async function handleRecipeEditAction(
  { request, params }: ActionFunctionArgs,
): Promise<RecipeFormActionResult | Response> {
  const user = await requireUser(request);
  if (!params.userId || !params.recipeId || params.userId !== user.id) {
    throw new Response("Niet gevonden", { status: 404 });
  }
  const submission = await parseRecipeFormSubmission(request);
  if (submission === null || submission.expectedUpdatedAt === null) {
    return { error: "Controleer naam, porties en ingrediënten." };
  }

  try {
    await updateRecipe(params.recipeId, {
      ...submission.input,
      visibility: submission.input.visibility ?? "PRIVATE",
      expectedUpdatedAt: submission.expectedUpdatedAt,
    }, createBackendRequestContext(request));
    return redirect(recipeDetailPath(user.id, params.recipeId));
  } catch (error: unknown) {
    if (error instanceof RecipeApiError) {
      const message = error.code === "DISH_UPDATE_CONFLICT"
        ? "Dit recept is elders gewijzigd. Vernieuw de pagina en probeer opnieuw."
        : error.message;
      return { error: message, fieldErrors: error.fields };
    }
    throw error;
  }
}
