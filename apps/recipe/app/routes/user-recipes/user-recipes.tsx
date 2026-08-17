import type { AuthenticatedUser } from "@product-repos/auth-client/session.server";
import { useLoaderData, useOutletContext, type LoaderFunctionArgs } from "react-router";
import { RecipeListPage } from "../../features/recipes/presentation/pages/recipe-list-page/recipe-list-page";
import type { UserRecipeListLoaderData } from "../../features/recipes/presentation/types/recipe-list.types";
import { loadUserRecipesRoute } from "./user-recipes-route.server";

/** Load one maker's recipe-list route. */
export function loader(args: LoaderFunctionArgs) {
  return loadUserRecipesRoute(args);
}

/** Render a maker list with owner-only controls. */
export default function UserRecipesRoute(): React.ReactNode {
  const values = useLoaderData<UserRecipeListLoaderData>();
  const { user } = useOutletContext<{ readonly user: AuthenticatedUser | null }>();
  const owner = user?.id === values.userId;
  return (
    <RecipeListPage
      page={values.page}
      query={values.query}
      sort={values.sort}
      archived={values.archived}
      title={owner ? "Mijn recepten" : "Recepten van deze maker"}
      emptyOwnerList={owner && !values.archived}
      showArchivedFilter={owner}
    />
  );
}
