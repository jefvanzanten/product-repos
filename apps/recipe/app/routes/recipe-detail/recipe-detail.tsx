import type { AuthenticatedUser } from "@product-repos/auth-client/session.server";
import {
  useActionData,
  useLoaderData,
  useOutletContext,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { RecipeDetailPage } from "../../features/recipes/presentation/pages/recipe-detail-page/recipe-detail-page";
import type {
  RecipeDetailActionResult,
  RecipeDetailLoaderData,
} from "../../features/recipes/presentation/types/recipe-detail.types";
import { handleRecipeDetailAction, loadRecipeDetailRoute } from "./recipe-detail-route.server";

/** Describe the recipe detail document. */
export const meta: MetaFunction = () => [{ title: "Recept · Recepten" }];

/** Load the recipe-detail route. */
export function loader(args: LoaderFunctionArgs) {
  return loadRecipeDetailRoute(args);
}

/** Handle a recipe owner action. */
export function action(args: ActionFunctionArgs) {
  return handleRecipeDetailAction(args);
}

/** Render recipe detail from route-boundary data. */
export default function RecipeDetailRoute(): React.ReactNode {
  const { recipe } = useLoaderData<RecipeDetailLoaderData>();
  const actionData = useActionData<RecipeDetailActionResult>();
  const { user } = useOutletContext<{ readonly user: AuthenticatedUser | null }>();
  return (
    <RecipeDetailPage
      recipe={recipe}
      owner={user?.id === recipe.userId}
      actionError={actionData?.error}
    />
  );
}
