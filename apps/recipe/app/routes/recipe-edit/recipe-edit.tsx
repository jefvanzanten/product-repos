import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { RecipeFormPage } from "../../features/recipes/presentation/pages/recipe-form-page/recipe-form-page";
import type {
  RecipeEditLoaderData,
  RecipeFormActionResult,
} from "../../features/recipes/presentation/types/recipe-form.types";
import { handleRecipeEditAction, loadRecipeEditRoute } from "./recipe-edit-route.server";

/** Load the protected recipe-edit route. */
export function loader(args: LoaderFunctionArgs) {
  return loadRecipeEditRoute(args);
}

/** Handle a recipe replacement submission. */
export function action(args: ActionFunctionArgs) {
  return handleRecipeEditAction(args);
}

/** Render the owner recipe editor. */
export default function RecipeEditRoute(): React.ReactNode {
  const { recipe, initialOptions } = useLoaderData<RecipeEditLoaderData>();
  const actionData = useActionData<RecipeFormActionResult>();
  return (
    <RecipeFormPage
      mode="Edit"
      recipe={recipe}
      initialOptions={initialOptions}
      error={actionData?.error}
      fieldErrors={actionData?.fieldErrors}
    />
  );
}
