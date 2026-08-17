import type { CategoryTreeOption } from "../../../domain/category-tree";
import type { CategoryMutationResult } from "../types/category-tree-picker.types";

/** A category tree option and its index in the complete option list. */
export type VisibleCategoryTreeOption = {
  readonly option: CategoryTreeOption;
  readonly originalIndex: number;
};

/** UI state retained by the interactive category tree picker. */
export type CategoryPickerUiState = {
  readonly expandedCategoryIds: ReadonlySet<string>;
  readonly mutationResult: CategoryMutationResult | undefined;
  readonly inlineName: string;
  readonly inlineParentId: string | null | undefined;
};

/**
 * Apply a category mutation result to picker-only UI state.
 *
 * @param current - Picker state associated with the previous result.
 * @param result - Latest category mutation result.
 * @param options - Current category options.
 * @returns Picker state projected for the latest result.
 */
export function applyCategoryResultToUiState(current: CategoryPickerUiState, result: CategoryMutationResult | undefined, options: ReadonlyArray<CategoryTreeOption>): CategoryPickerUiState {
  if (current.mutationResult === result) return current;
  const createdCategory = result?.createdCategory;
  return {
    expandedCategoryIds: createdCategory === undefined
      ? current.expandedCategoryIds
      : expandCategoryParentPath(current.expandedCategoryIds, options, createdCategory.parentId),
    mutationResult: result,
    inlineName: createdCategory === undefined ? current.inlineName : "",
    inlineParentId: createdCategory === undefined ? current.inlineParentId : undefined,
  };
}

/**
 * Count direct children by parent category identifier.
 *
 * @param options - Ordered category options.
 * @returns Child counts keyed by parent identifier.
 */
export function buildChildCountByParentId(options: ReadonlyArray<CategoryTreeOption>): ReadonlyMap<number, number> {
  const childCountByParentId = new Map<number, number>();
  for (const option of options) {
    const parentId = option.category.parentId;
    if (parentId === null) continue;
    childCountByParentId.set(parentId, (childCountByParentId.get(parentId) ?? 0) + 1);
  }
  return childCountByParentId;
}

/**
 * Select tree options whose complete ancestor path is expanded.
 *
 * @param options - Ordered category options.
 * @param expandedCategoryIds - Expanded branch identifiers.
 * @returns Visible category options in tree order.
 */
export function buildVisibleCategoryOptions(options: ReadonlyArray<CategoryTreeOption>, expandedCategoryIds: ReadonlySet<string>): ReadonlyArray<VisibleCategoryTreeOption> {
  const visibleOptions: VisibleCategoryTreeOption[] = [];
  const branchVisibleByDepth: boolean[] = [];
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (!option) continue;
    const parentIsVisible = option.depth === 0 || branchVisibleByDepth[option.depth - 1] === true;
    if (parentIsVisible) visibleOptions.push({ option, originalIndex: index });
    branchVisibleByDepth[option.depth] = parentIsVisible && expandedCategoryIds.has(String(option.category.id));
    branchVisibleByDepth.length = option.depth + 1;
  }
  return visibleOptions;
}

/**
 * Find the final visible descendant of a parent option.
 *
 * @param visibleOptions - Visible options in tree order.
 * @param parentVisibleIndex - Index of the parent in the visible options.
 * @returns Index of the final visible descendant.
 */
export function findVisibleSubtreeEndIndex(visibleOptions: ReadonlyArray<VisibleCategoryTreeOption>, parentVisibleIndex: number): number {
  const parent = visibleOptions[parentVisibleIndex]?.option;
  if (!parent) return parentVisibleIndex;
  let endIndex = parentVisibleIndex;
  for (let index = parentVisibleIndex + 1; index < visibleOptions.length; index += 1) {
    const option = visibleOptions[index]?.option;
    if (!option || option.depth <= parent.depth) break;
    endIndex = index;
  }
  return endIndex;
}

/**
 * Determine the initially expanded ancestor branches.
 *
 * @param options - Ordered category options.
 * @param categoryId - Initially selected category identifier.
 * @returns Identifiers of the selected category's ancestors.
 */
export function collectInitiallyExpandedCategoryIds(options: ReadonlyArray<CategoryTreeOption>, categoryId: string | undefined): ReadonlySet<string> {
  return collectAncestorCategoryIds(options, categoryId);
}

/**
 * Collect all ancestor identifiers for a category.
 *
 * @param options - Ordered category options.
 * @param categoryId - Category whose ancestors are requested.
 * @returns Ancestor identifiers from the category to the root.
 */
export function collectAncestorCategoryIds(options: ReadonlyArray<CategoryTreeOption>, categoryId: string | undefined): ReadonlySet<string> {
  const ancestors = new Set<string>();
  if (!categoryId) return ancestors;
  const optionByCategoryId = buildOptionByCategoryId(options);
  let parentId = optionByCategoryId.get(categoryId)?.category.parentId ?? null;
  const visitedCategoryIds = new Set<string>();
  while (parentId !== null) {
    const parentKey = String(parentId);
    if (visitedCategoryIds.has(parentKey)) break;
    visitedCategoryIds.add(parentKey);
    ancestors.add(parentKey);
    parentId = optionByCategoryId.get(parentKey)?.category.parentId ?? null;
  }
  return ancestors;
}

/**
 * Expand a category and all its ancestors.
 *
 * @param current - Currently expanded identifiers.
 * @param options - Ordered category options.
 * @param categoryId - Category path to expand.
 * @returns Expanded identifiers including the requested path.
 */
export function expandCategoryPath(current: ReadonlySet<string>, options: ReadonlyArray<CategoryTreeOption>, categoryId: string): ReadonlySet<string> {
  const expandedIds = new Set<string>(collectAncestorCategoryIds(options, categoryId));
  expandedIds.add(categoryId);
  return mergeCategoryIds(current, expandedIds);
}

/**
 * Shorten every category path segment to its first word.
 *
 * @param path - Full category breadcrumb path.
 * @returns A compact category path.
 */
export function shortCategoryPath(path: string): string {
  return path.split(" > ").map((part) => part.split(" ")[0] ?? part).join(" > ");
}

/** Expand the parent path of a newly created category. */
function expandCategoryParentPath(current: ReadonlySet<string>, options: ReadonlyArray<CategoryTreeOption>, parentId: number | null): ReadonlySet<string> {
  if (parentId === null) return current;
  return expandCategoryPath(current, options, String(parentId));
}

/** Merge category identifiers while retaining the original set when unchanged. */
function mergeCategoryIds(current: ReadonlySet<string>, additions: ReadonlySet<string>): ReadonlySet<string> {
  let changed = false;
  const next = new Set(current);
  for (const addition of additions) {
    if (next.has(addition)) continue;
    next.add(addition);
    changed = true;
  }
  return changed ? next : current;
}

/** Build a category option lookup by string identifier. */
function buildOptionByCategoryId(options: ReadonlyArray<CategoryTreeOption>): ReadonlyMap<string, CategoryTreeOption> {
  const optionByCategoryId = new Map<string, CategoryTreeOption>();
  for (const option of options) optionByCategoryId.set(String(option.category.id), option);
  return optionByCategoryId;
}
