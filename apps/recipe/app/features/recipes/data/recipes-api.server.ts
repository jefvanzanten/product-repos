import {
  recipeArchiveResultSchema,
  recipeDetailSchema,
  recipeIngredientInputOptionsSchema,
  recipePageSchema,
  recipeProductSearchResultSchema,
} from "@product-repos/contracts/recipes";
import type { BackendRequestContext } from "../../../core/data/backend-api.server";
import { requestRecipeJson } from "../../../core/data/recipe-backend-api.server";
import type {
  CreateRecipe,
  RecipeArchiveResult,
  RecipeDetail,
  RecipeIngredientInputOptions,
  RecipePage,
  RecipeProductSearchResult,
  UpdateRecipe,
} from "../domain/recipe";
import {
  mapRecipeArchiveResult,
  mapRecipeDetail,
  mapRecipeIngredientInputOptions,
  mapRecipePage,
  mapRecipeProductSearchResults,
} from "./recipe-mappers";

export { RecipeApiError } from "../../../core/data/recipe-backend-api.server";

/** Load the public recipe overview. */
export async function listRecipes(search: string, context: BackendRequestContext): Promise<RecipePage> {
  const dto = await requestRecipeJson(`/recipes${search}`, "GET", undefined, recipePageSchema, context);
  return mapRecipePage(dto);
}

/** Load one maker's recipe overview. */
export async function listUserRecipes(
  userId: string,
  search: string,
  context: BackendRequestContext,
): Promise<RecipePage> {
  const path = `/recipes/users/${encodeURIComponent(userId)}${search}`;
  const dto = await requestRecipeJson(path, "GET", undefined, recipePageSchema, context);
  return mapRecipePage(dto);
}

/** Load one accessible recipe detail. */
export async function getRecipe(
  userId: string,
  recipeId: string,
  context: BackendRequestContext,
): Promise<RecipeDetail> {
  const path = `/recipes/users/${encodeURIComponent(userId)}/${encodeURIComponent(recipeId)}`;
  const dto = await requestRecipeJson(path, "GET", undefined, recipeDetailSchema, context);
  return mapRecipeDetail(dto);
}

/** Create one owner recipe. */
export async function createRecipe(input: CreateRecipe, context: BackendRequestContext): Promise<RecipeDetail> {
  const dto = await requestRecipeJson("/recipes", "POST", input, recipeDetailSchema, context);
  return mapRecipeDetail(dto);
}

/** Replace one owner recipe. */
export async function updateRecipe(
  recipeId: string,
  input: UpdateRecipe,
  context: BackendRequestContext,
): Promise<RecipeDetail> {
  const dto = await requestRecipeJson(`/recipes/${encodeURIComponent(recipeId)}`, "PUT", input, recipeDetailSchema, context);
  return mapRecipeDetail(dto);
}

/** Archive one owner recipe. */
export async function archiveRecipe(recipeId: string, context: BackendRequestContext): Promise<RecipeArchiveResult> {
  const dto = await requestRecipeJson(
    `/recipes/${encodeURIComponent(recipeId)}/archive`,
    "POST",
    undefined,
    recipeArchiveResultSchema,
    context,
  );
  return mapRecipeArchiveResult(dto);
}

/** Restore one archived owner recipe. */
export async function restoreRecipe(recipeId: string, context: BackendRequestContext): Promise<RecipeDetail> {
  const dto = await requestRecipeJson(
    `/recipes/${encodeURIComponent(recipeId)}/restore`,
    "POST",
    undefined,
    recipeDetailSchema,
    context,
  );
  return mapRecipeDetail(dto);
}

/** Search active concrete products. */
export async function searchRecipeProducts(
  query: string,
  context: BackendRequestContext,
): Promise<ReadonlyArray<RecipeProductSearchResult>> {
  const path = `/recipes/products/search?query=${encodeURIComponent(query)}`;
  const dtos = await requestRecipeJson(path, "GET", undefined, recipeProductSearchResultSchema.array(), context);
  return mapRecipeProductSearchResults(dtos);
}

/** Load available quantity modes for one product. */
export async function getRecipeInputOptions(
  productId: string,
  context: BackendRequestContext,
): Promise<RecipeIngredientInputOptions> {
  const path = `/recipes/products/${encodeURIComponent(productId)}/input-units`;
  const dto = await requestRecipeJson(path, "GET", undefined, recipeIngredientInputOptionsSchema, context);
  return mapRecipeIngredientInputOptions(dto);
}
