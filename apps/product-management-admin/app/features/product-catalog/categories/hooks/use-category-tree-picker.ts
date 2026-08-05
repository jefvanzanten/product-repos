import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { CategoryMutationResult } from "../types/category-tree-picker.types";
import type { CategoryTreeOption } from "../utils/category-tree";
import {
  applyCategoryResultToUiState,
  buildChildCountByParentId,
  buildVisibleCategoryOptions,
  collectInitiallyExpandedCategoryIds,
  expandCategoryPath,
  findVisibleSubtreeEndIndex,
  type CategoryPickerUiState,
  type VisibleCategoryTreeOption,
} from "../utils/category-tree-picker";

type UseCategoryTreePickerInput = {
  readonly defaultValue?: string;
  readonly mutationResult?: CategoryMutationResult;
  readonly onCreateCategory: (name: string, parentId: string | null) => void;
  readonly onDeleteCategory: (categoryId: number) => void;
  readonly options: ReadonlyArray<CategoryTreeOption>;
  readonly selectedCategoryId: string;
};

type UseCategoryTreePickerResult = {
  readonly categoryToRevealRef: RefObject<HTMLDivElement | null>;
  readonly childCountByParentId: ReadonlyMap<number, number>;
  readonly expandedCategoryIds: ReadonlySet<string>;
  readonly inlineName: string;
  readonly inlineParentId: string | null | undefined;
  readonly insertionVisibleIndex: number;
  readonly parentOption: CategoryTreeOption | undefined;
  readonly selectedCategoryIsVisible: boolean;
  readonly visibleOptions: ReadonlyArray<VisibleCategoryTreeOption>;
  readonly cancelInlineInput: () => void;
  readonly changeInlineName: (name: string) => void;
  readonly deleteCategory: (categoryId: number) => void;
  readonly openInlineInput: (parentId: string | null) => void;
  readonly submitInlineCategory: () => void;
  readonly toggleExpanded: (categoryId: number) => void;
};

/**
 * Manage expansion, inline creation, and derived rows for a category tree picker.
 *
 * @param input - Picker defaults, mutation state, commands, and category options.
 * @returns Picker UI state and event handlers.
 */
export function useCategoryTreePicker({ defaultValue, mutationResult, onCreateCategory, onDeleteCategory, options, selectedCategoryId }: UseCategoryTreePickerInput): UseCategoryTreePickerResult {
  const [storedUiState, setStoredUiState] = useState<CategoryPickerUiState>(() => ({
    expandedCategoryIds: collectInitiallyExpandedCategoryIds(options, defaultValue),
    mutationResult,
    inlineName: "",
    inlineParentId: undefined,
  }));
  const uiState = useMemo(
    () => applyCategoryResultToUiState(storedUiState, mutationResult, options),
    [mutationResult, options, storedUiState],
  );
  const categoryIdToReveal = defaultValue ?? "";
  const categoryToRevealRef = useRef<HTMLDivElement>(null);
  const revealedCategoryIdRef = useRef<string | null>(null);
  const childCountByParentId = useMemo(() => buildChildCountByParentId(options), [options]);
  const visibleOptions = useMemo(() => buildVisibleCategoryOptions(options, uiState.expandedCategoryIds), [options, uiState.expandedCategoryIds]);
  const selectedCategoryIsVisible = visibleOptions.some(({ option }) => String(option.category.id) === selectedCategoryId);
  const parentIndex = uiState.inlineParentId === undefined || uiState.inlineParentId === null
    ? -1
    : options.findIndex((option) => String(option.category.id) === uiState.inlineParentId);
  const parentOption = parentIndex >= 0 ? options[parentIndex] : undefined;
  const parentVisibleIndex = parentOption ? visibleOptions.findIndex(({ option }) => option.category.id === parentOption.category.id) : -1;
  const insertionVisibleIndex = parentOption && parentVisibleIndex >= 0
    ? findVisibleSubtreeEndIndex(visibleOptions, parentVisibleIndex)
    : -1;

  useEffect(() => {
    if (!categoryIdToReveal || !selectedCategoryIsVisible || revealedCategoryIdRef.current === categoryIdToReveal) return;
    const categoryRow = categoryToRevealRef.current;
    if (!categoryRow) return;
    categoryRow.scrollIntoView({ block: "center", inline: "nearest" });
    revealedCategoryIdRef.current = categoryIdToReveal;
  }, [categoryIdToReveal, selectedCategoryIsVisible, visibleOptions]);

  /** Store a picker UI transition against the current mutation result. */
  function updateUiState(update: (current: CategoryPickerUiState) => Omit<CategoryPickerUiState, "mutationResult">): void {
    setStoredUiState({ ...update(uiState), mutationResult });
  }

  /** Toggle one category branch. */
  function toggleExpanded(categoryId: number): void {
    const categoryKey = String(categoryId);
    updateUiState((current) => {
      const expandedCategoryIds = new Set(current.expandedCategoryIds);
      if (expandedCategoryIds.has(categoryKey)) expandedCategoryIds.delete(categoryKey);
      else expandedCategoryIds.add(categoryKey);
      return { expandedCategoryIds, inlineName: current.inlineName, inlineParentId: current.inlineParentId };
    });
  }

  /** Open and reset the inline category input. */
  function openInlineInput(parentId: string | null): void {
    updateUiState((current) => ({
      expandedCategoryIds: parentId === null ? current.expandedCategoryIds : expandCategoryPath(current.expandedCategoryIds, options, parentId),
      inlineName: "",
      inlineParentId: parentId,
    }));
  }

  /** Change the inline category name. */
  function changeInlineName(name: string): void {
    updateUiState((current) => ({ expandedCategoryIds: current.expandedCategoryIds, inlineName: name, inlineParentId: current.inlineParentId }));
  }

  /** Close the inline category input. */
  function cancelInlineInput(): void {
    updateUiState((current) => ({ expandedCategoryIds: current.expandedCategoryIds, inlineName: current.inlineName, inlineParentId: undefined }));
  }

  /** Submit the current inline category. */
  function submitInlineCategory(): void {
    setStoredUiState({ ...uiState, mutationResult });
    onCreateCategory(uiState.inlineName, uiState.inlineParentId ?? null);
  }

  /** Submit deletion while retaining the current picker state. */
  function deleteCategory(categoryId: number): void {
    setStoredUiState({ ...uiState, mutationResult });
    onDeleteCategory(categoryId);
  }

  return {
    cancelInlineInput,
    categoryToRevealRef,
    changeInlineName,
    childCountByParentId,
    deleteCategory,
    expandedCategoryIds: uiState.expandedCategoryIds,
    inlineName: uiState.inlineName,
    inlineParentId: uiState.inlineParentId,
    insertionVisibleIndex,
    openInlineInput,
    parentOption,
    selectedCategoryIsVisible,
    submitInlineCategory,
    toggleExpanded,
    visibleOptions,
  };
}
