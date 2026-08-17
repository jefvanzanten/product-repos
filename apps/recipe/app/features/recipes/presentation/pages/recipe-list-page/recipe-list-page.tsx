import { RecipeListView } from "../../components/recipe-list/recipe-list-view";
import type { RecipeListViewProps } from "../../types/recipe-list.types";

/** Render a complete public or maker recipe-list page. */
export function RecipeListPage(props: RecipeListViewProps): React.ReactNode {
  return <RecipeListView {...props} />;
}
