import type {
  CreateRecipe,
  RecipeDetail,
  RecipeIngredientInputOptions,
  RecipeInputMode,
  RecipePackage,
} from "../../domain/recipe";

/** Editable ingredient draft with display and quantity choices. */
export type IngredientDraft = {
  readonly productId: string;
  readonly displayName: string;
  readonly productArchived: boolean;
  readonly modes: RecipeIngredientInputOptions["modes"];
  readonly package: RecipePackage | null;
  readonly quantity: string;
  readonly inputMode: RecipeInputMode;
  readonly inputUnitTypeId: number | null;
};

/** Recipe form properties shared by create and edit pages. */
export type RecipeFormProps = {
  readonly recipe?: RecipeDetail;
  readonly initialOptions?: Readonly<Record<string, RecipeIngredientInputOptions>>;
  readonly error?: string;
  readonly fieldErrors?: Readonly<Record<string, string>>;
};

/** Parsed recipe form submission at the route boundary. */
export type RecipeFormSubmission = {
  readonly input: CreateRecipe;
  readonly expectedUpdatedAt: string | null;
};

/** Data loaded by the recipe edit route. */
export type RecipeEditLoaderData = {
  readonly recipe: RecipeDetail;
  readonly initialOptions: Readonly<Record<string, RecipeIngredientInputOptions>>;
};

/** Result returned by create and edit route actions. */
export type RecipeFormActionResult = {
  readonly error?: string;
  readonly fieldErrors?: Readonly<Record<string, string>>;
};
