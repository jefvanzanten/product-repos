/** Visibility levels supported by a recipe. */
export type RecipeVisibility = "PRIVATE" | "PUBLIC";

/** Sort orders supported by recipe lists. */
export type RecipeSort = "newest" | "oldest" | "name";

/** Product-relative quantity modes supported by recipe ingredients. */
export type RecipeInputMode = "FULL_PRODUCT" | "PRODUCT_PORTION" | "CONTENT_UNIT";

/** Unit information needed by recipe editing and presentation. */
export type RecipeUnitType = {
  readonly id: number;
  readonly name: string;
  readonly symbol: string;
  readonly dimension: "MASS" | "VOLUME" | "COUNT";
  readonly conversionToBase: string;
};

/** Owner capabilities for one recipe. */
export type RecipeOwnerActions = {
  readonly canEdit: boolean;
  readonly canArchive: boolean;
  readonly canRestore: boolean;
};

/** Recipe information used by list views. */
export type RecipeSummary = {
  readonly id: string;
  readonly userId: string;
  readonly makerDisplayName: string | null;
  readonly name: string;
  readonly visibility: RecipeVisibility;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Ingredient stored in a recipe version. */
export type RecipeIngredient = {
  readonly productId: string;
  readonly displayName: string;
  readonly quantity: string;
  readonly inputMode: RecipeInputMode;
  readonly inputUnitType: RecipeUnitType | null;
  readonly productArchived: boolean;
};

/** Complete recipe detail used by the frontend. */
export type RecipeDetail = RecipeSummary & {
  readonly servings: string;
  readonly instructions: string | null;
  readonly versionId: string;
  readonly versionCreatedAt: string;
  readonly ingredients: ReadonlyArray<RecipeIngredient>;
  readonly ownerActions: RecipeOwnerActions;
};

/** Cursor page of recipe summaries. */
export type RecipePage = {
  readonly items: ReadonlyArray<RecipeSummary>;
  readonly cursor: string | null;
  readonly hasMore: boolean;
};

/** Ingredient mutation value sent when creating or updating a recipe. */
export type RecipeIngredientInput = {
  readonly productId: string;
  readonly quantity: string;
  readonly inputMode: RecipeInputMode;
  readonly inputUnitTypeId?: number | null;
};

/** Command for creating a recipe. */
export type CreateRecipe = {
  readonly name: string;
  readonly visibility?: RecipeVisibility;
  readonly servings: string;
  readonly instructions?: string | null;
  readonly ingredients: ReadonlyArray<RecipeIngredientInput>;
};

/** Command for replacing an existing recipe. */
export type UpdateRecipe = {
  readonly expectedUpdatedAt: string;
  readonly name: string;
  readonly visibility: RecipeVisibility;
  readonly servings: string;
  readonly instructions?: string | null;
  readonly ingredients: ReadonlyArray<RecipeIngredientInput>;
};

/** Result of archiving one recipe. */
export type RecipeArchiveResult = {
  readonly id: string;
  readonly archivedAt: string;
};

/** Product selectable as a recipe ingredient. */
export type RecipeProductSearchResult = {
  readonly productId: string;
  readonly displayName: string;
  readonly compositionName: string;
  readonly brandName: string | null;
  readonly packageSummary: string | null;
  readonly imageUrl: string | null;
};

/** Product package information used to derive package equivalents. */
export type RecipePackage = {
  readonly singularName: string;
  readonly pluralName: string;
  readonly contentAmount: string;
  readonly contentUnitType: RecipeUnitType;
  readonly portionsPerProduct: number | null;
};

/** Quantity mode offered for one recipe product. */
export type RecipeInputOption = {
  readonly inputMode: RecipeInputMode;
  readonly unitType: RecipeUnitType | null;
  readonly label: string;
};

/** Available ingredient input choices for one product. */
export type RecipeIngredientInputOptions = {
  readonly productId: string;
  readonly package: RecipePackage;
  readonly modes: ReadonlyArray<RecipeInputOption>;
};

/** Build the replacement command required to toggle recipe visibility. */
export function createVisibilityUpdate(recipe: RecipeDetail): UpdateRecipe {
  return {
    expectedUpdatedAt: recipe.updatedAt,
    name: recipe.name,
    visibility: recipe.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC",
    servings: recipe.servings,
    instructions: recipe.instructions,
    ingredients: recipe.ingredients.map((ingredient) => ({
      productId: ingredient.productId,
      quantity: ingredient.quantity,
      inputMode: ingredient.inputMode,
      inputUnitTypeId: ingredient.inputUnitType?.id ?? null,
    })),
  };
}
