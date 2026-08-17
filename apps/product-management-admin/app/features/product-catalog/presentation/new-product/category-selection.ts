import type { CategoryTreeOption } from "../../domain/category-tree";
import type { CategoryMutationResult } from "../categories/types/category-tree-picker.types";

/**
 * Apply a category mutation result to the current product category selection.
 *
 * @param selectedCategoryId - Selection before the mutation result.
 * @param result - Latest category mutation result.
 * @returns Selection after applying a create or relevant delete result.
 */
export function applyCategoryResultToSelection(selectedCategoryId: string, result: CategoryMutationResult | undefined): string {
  if (result?.createdCategory !== undefined) return String(result.createdCategory.id);
  if (result?.deletedCategoryId !== undefined && selectedCategoryId === String(result.deletedCategoryId)) return "";
  return selectedCategoryId;
}

/**
 * Build the complete breadcrumb path for a selected category.
 *
 * @param options - Category options containing parent relations.
 * @param selectedCategoryId - Selected category identifier.
 * @returns Categories ordered from the root through the selection.
 */
export function buildSelectedCategoryPath(options: ReadonlyArray<CategoryTreeOption>, selectedCategoryId: string): ReadonlyArray<CategoryTreeOption["category"]> {
  const optionByCategoryId = new Map(options.map((option) => [String(option.category.id), option]));
  const path: Array<CategoryTreeOption["category"]> = [];
  const visitedCategoryIds = new Set<string>();
  let currentOption = optionByCategoryId.get(selectedCategoryId);
  while (currentOption) {
    const currentCategoryId = String(currentOption.category.id);
    if (visitedCategoryIds.has(currentCategoryId)) break;
    visitedCategoryIds.add(currentCategoryId);
    path.unshift(currentOption.category);
    currentOption = currentOption.category.parentId === null
      ? undefined
      : optionByCategoryId.get(String(currentOption.category.parentId));
  }
  return path;
}
