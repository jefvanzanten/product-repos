import type { RecipePage, RecipeSort } from "../../domain/recipe";

/** Shared recipe-list presentation properties. */
export type RecipeListViewProps = {
  readonly page: RecipePage;
  readonly title: string;
  readonly query: string;
  readonly sort: RecipeSort;
  readonly emptyOwnerList?: boolean;
  readonly archived?: boolean;
  readonly showArchivedFilter?: boolean;
};

/** Data loaded by the public recipe-list route. */
export type PublicRecipeListLoaderData = {
  readonly page: RecipePage;
  readonly query: string;
  readonly sort: RecipeSort;
};

/** Data loaded by a maker recipe-list route. */
export type UserRecipeListLoaderData = PublicRecipeListLoaderData & {
  readonly userId: string;
  readonly archived: boolean;
};
