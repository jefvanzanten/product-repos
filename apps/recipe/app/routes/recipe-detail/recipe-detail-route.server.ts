import { data, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";
import { optionalUser, requireUser } from "../../core/presentation/auth/auth.server";
import { recipeDetailPath, userRecipesPath } from "../../core/presentation/routing/recipe-routes";
import {
  archiveRecipe,
  getRecipe,
  RecipeApiError,
  restoreRecipe,
  updateRecipe,
} from "../../features/recipes/data/recipes-api.server";
import { createVisibilityUpdate } from "../../features/recipes/domain/recipe";
import type {
  RecipeDetailActionResult,
  RecipeDetailLoaderData,
} from "../../features/recipes/presentation/types/recipe-detail.types";
import { throwRecipeLoaderError } from "../shared/recipe-route-errors.server";

/** Load one accessible recipe or preserve the neutral 404 boundary. */
export async function loadRecipeDetailRoute({ request, params }: LoaderFunctionArgs) {
  if (!params.userId || !params.recipeId) throw new Response("Niet gevonden", { status: 404 });
  const context = createBackendRequestContext(request);
  const [recipe, viewer] = await Promise.all([
    getRecipe(params.userId, params.recipeId, context).catch(throwRecipeLoaderError),
    optionalUser(request),
  ]);
  return data<RecipeDetailLoaderData>({ recipe }, { headers: {
    "Cache-Control": viewer === null ? "public, max-age=60, stale-while-revalidate=300" : "private, no-store",
    Vary: "Cookie",
  } });
}

/** Handle owner visibility, archive, and restore controls. */
export async function handleRecipeDetailAction(
  { request, params }: ActionFunctionArgs,
): Promise<RecipeDetailActionResult | Response> {
  const user = await requireUser(request);
  if (!params.recipeId || !params.userId || user.id !== params.userId) {
    throw new Response("Niet gevonden", { status: 404 });
  }
  const formData = await request.formData();
  const intent = formData.get("intent");
  const context = createBackendRequestContext(request);

  try {
    if (intent === "archive") {
      await archiveRecipe(params.recipeId, context);
      return redirect(userRecipesPath(user.id, true));
    }
    if (intent === "restore") {
      await restoreRecipe(params.recipeId, context);
      return redirect(recipeDetailPath(user.id, params.recipeId));
    }
    if (intent === "visibility") {
      const recipe = await getRecipe(params.userId, params.recipeId, context);
      await updateRecipe(params.recipeId, createVisibilityUpdate(recipe), context);
      return redirect(recipeDetailPath(user.id, params.recipeId));
    }
  } catch (error: unknown) {
    if (error instanceof RecipeApiError) return { error: error.message };
    throw error;
  }
  return { error: "Onbekende actie." };
}
