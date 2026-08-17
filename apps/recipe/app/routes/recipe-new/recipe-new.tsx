import { useActionData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { RecipeFormPage } from "../../features/recipes/presentation/pages/recipe-form-page/recipe-form-page";
import type { RecipeFormActionResult } from "../../features/recipes/presentation/types/recipe-form.types";
import { handleRecipeNewAction, loadRecipeNewRoute } from "./recipe-new-route.server";

/** Load the protected new-recipe route. */
export function loader(args: LoaderFunctionArgs) {
  return loadRecipeNewRoute(args);
}

/** Handle a recipe creation submission. */
export function action(args: ActionFunctionArgs) {
  return handleRecipeNewAction(args);
}

/** Render the private-by-default recipe creation page. */
export default function RecipeNewRoute(): React.ReactNode {
  const actionData = useActionData<RecipeFormActionResult>();
  return <RecipeFormPage mode="Create" error={actionData?.error} fieldErrors={actionData?.fieldErrors} />;
}
