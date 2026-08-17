import { useLoaderData, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { RecipeListPage } from "../../features/recipes/presentation/pages/recipe-list-page/recipe-list-page";
import type { PublicRecipeListLoaderData } from "../../features/recipes/presentation/types/recipe-list.types";
import { loadPublicRecipeListRoute } from "./recipe-list-route.server";

/** Describe the public recipes overview. */
export const meta: MetaFunction = () => [
  { title: "Recepten" },
  { name: "description", content: "Ontdek publieke recepten en bereidingswijzen." },
];

/** Load the public recipe-list route. */
export function loader(args: LoaderFunctionArgs) {
  return loadPublicRecipeListRoute(args);
}

/** Render the full public recipe list. */
export default function PublicRecipeListRoute(): React.ReactNode {
  const values = useLoaderData<PublicRecipeListLoaderData>();
  return <RecipeListPage page={values.page} query={values.query} sort={values.sort} title="Alle recepten" />;
}
