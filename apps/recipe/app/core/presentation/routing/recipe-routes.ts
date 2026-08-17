import { toPublicAppPath } from "@product-repos/shared/public-app-path";

/** Public basename retained by the Recipe deployment. */
export const RECIPE_BASE_PATH = "/recepten";

/** Route segments shared by the route tree and path builders. */
export const recipeRoutePatterns = {
  login: "login",
  newRecipe: "nieuw",
  productSearch: "producten-zoeken",
  productInputOptions: "producten/:productId/invoereenheden",
  userRecipes: "gebruiker/:userId",
  recipeEdit: "gebruiker/:userId/:recipeId/bewerken",
  recipeDetail: "gebruiker/:userId/:recipeId",
} as const;

/** Build the public recipe-list route. */
export function recipeListPath(): string {
  return "/";
}

/** Build one maker's recipe-list route. */
export function userRecipesPath(userId: string, archived = false): string {
  const path = `/gebruiker/${encodeURIComponent(userId)}`;
  return archived ? `${path}?archived=true` : path;
}

/** Build one canonical recipe-detail route. */
export function recipeDetailPath(userId: string, recipeId: string): string {
  return `/gebruiker/${encodeURIComponent(userId)}/${encodeURIComponent(recipeId)}`;
}

/** Build one owner recipe-edit route. */
export function recipeEditPath(userId: string, recipeId: string): string {
  return `${recipeDetailPath(userId, recipeId)}/bewerken`;
}

/** Build the new-recipe route. */
export function newRecipePath(): string {
  return "/nieuw";
}

/** Build the product-search resource route. */
export function productSearchPath(query: string): string {
  return `/producten-zoeken?${new URLSearchParams({ query })}`;
}

/** Build the product input-options resource route. */
export function productInputOptionsPath(productId: string): string {
  return `/producten/${encodeURIComponent(productId)}/invoereenheden`;
}

/** Build the login route with an optional internal return destination. */
export function loginPath(returnTo?: string): string {
  if (returnTo === undefined || returnTo === "/") return "/login";
  return `/login?${new URLSearchParams({ returnTo })}`;
}

/** Prefix an internal route with the Recipe public basename. */
export function toRecipePublicPath(internalPath: string): string {
  return toPublicAppPath(RECIPE_BASE_PATH, internalPath);
}
