import type {
  RecipeArchiveResult as RecipeArchiveResultDto,
  RecipeDetail as RecipeDetailDto,
  RecipeIngredientInputOptions as RecipeIngredientInputOptionsDto,
  RecipePage as RecipePageDto,
  RecipeProductSearchResult as RecipeProductSearchResultDto,
} from "@product-repos/contracts/recipes";
import type {
  RecipeArchiveResult,
  RecipeDetail,
  RecipeIngredientInputOptions,
  RecipePage,
  RecipeProductSearchResult,
} from "../domain/recipe";

/** Map a validated recipe page DTO into the frontend domain model. */
export function mapRecipePage(dto: RecipePageDto): RecipePage {
  return dto;
}

/** Map a validated recipe detail DTO into the frontend domain model. */
export function mapRecipeDetail(dto: RecipeDetailDto): RecipeDetail {
  return dto;
}

/** Map a validated archive result DTO into the frontend domain model. */
export function mapRecipeArchiveResult(dto: RecipeArchiveResultDto): RecipeArchiveResult {
  return dto;
}

/** Map validated product search DTOs into frontend domain models. */
export function mapRecipeProductSearchResults(
  dtos: ReadonlyArray<RecipeProductSearchResultDto>,
): ReadonlyArray<RecipeProductSearchResult> {
  return dtos;
}

/** Map validated ingredient option DTOs into the frontend domain model. */
export function mapRecipeIngredientInputOptions(
  dto: RecipeIngredientInputOptionsDto,
): RecipeIngredientInputOptions {
  return dto;
}
