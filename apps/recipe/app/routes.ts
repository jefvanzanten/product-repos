import { index, route, type RouteConfig } from "@react-router/dev/routes";
import { recipeRoutePatterns } from "./core/presentation/routing/recipe-routes";

export default [
  index("routes/recipe-list/recipe-list.tsx"),
  route(recipeRoutePatterns.login, "routes/login/login.tsx"),
  route(recipeRoutePatterns.newRecipe, "routes/recipe-new/recipe-new.tsx"),
  route(recipeRoutePatterns.productSearch, "routes/product-search/product-search.ts"),
  route(recipeRoutePatterns.productInputOptions, "routes/product-input-options/product-input-options.ts"),
  route(recipeRoutePatterns.userRecipes, "routes/user-recipes/user-recipes.tsx"),
  route(recipeRoutePatterns.recipeEdit, "routes/recipe-edit/recipe-edit.tsx"),
  route(recipeRoutePatterns.recipeDetail, "routes/recipe-detail/recipe-detail.tsx"),
] satisfies RouteConfig;
