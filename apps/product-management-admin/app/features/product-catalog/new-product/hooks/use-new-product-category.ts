import { useMemo, useState } from "react";
import { useFetcher } from "react-router";
import type { CategoryDto } from "@product-repos/contracts";
import { useAdminPath, useAdminSource } from "../../../../admin-source-context";
import { buildCategoryTreeOptions, type CategoryTreeOption } from "../../categories/utils/category-tree";
import type { FormErrors, NewProductActionResult } from "../../types/new-product.types";
import { applyCategoryResultToSelection, buildSelectedCategoryPath } from "../category-selection";

type CategorySelectionState = {
  readonly defaultValue: string;
  readonly fetcherData: NewProductActionResult | undefined;
  readonly selectedCategoryId: string;
};

type UseNewProductCategoryResult = {
  readonly breadcrumbPath: ReadonlyArray<CategoryDto>;
  readonly busy: boolean;
  readonly defaultCategoryId: string;
  readonly mutationErrors: FormErrors | undefined;
  readonly mutationResult: NewProductActionResult | undefined;
  readonly options: ReadonlyArray<CategoryTreeOption>;
  readonly selectedCategoryId: string;
  readonly createCategory: (name: string, parentId: string | null) => void;
  readonly deleteCategory: (categoryId: number) => void;
  readonly selectCategory: (categoryId: string) => void;
};

/**
 * Coordinate category selection and mutations for the new-product form.
 *
 * @param input - Available categories and the current form default.
 * @returns Category state and commands consumed by the page and picker.
 */
export function useNewProductCategory({ categories, defaultCategoryId }: { readonly categories: ReadonlyArray<CategoryDto>; readonly defaultCategoryId: string }): UseNewProductCategoryResult {
  const fetcher = useFetcher<NewProductActionResult>();
  const actionPath = useAdminPath("/product-catalogus/nieuw");
  const source = useAdminSource();
  const options = useMemo(() => buildCategoryTreeOptions(categories), [categories]);
  const [selection, setSelection] = useState<CategorySelectionState>(() => ({
    defaultValue: defaultCategoryId,
    fetcherData: fetcher.data,
    selectedCategoryId: defaultCategoryId,
  }));
  const selectionMatchesDefaults = selection.defaultValue === defaultCategoryId;
  const selectionBeforeFetcherResult = selectionMatchesDefaults ? selection.selectedCategoryId : defaultCategoryId;
  const selectedCategoryId = selectionMatchesDefaults && selection.fetcherData !== fetcher.data
    ? applyCategoryResultToSelection(selectionBeforeFetcherResult, fetcher.data)
    : selectionBeforeFetcherResult;
  const breadcrumbPath = useMemo(
    () => buildSelectedCategoryPath(options, selectedCategoryId),
    [options, selectedCategoryId],
  );

  /** Store a category selection against the current defaults and mutation result. */
  function selectCategory(categoryId: string): void {
    setSelection({
      defaultValue: defaultCategoryId,
      fetcherData: fetcher.data,
      selectedCategoryId: categoryId,
    });
  }

  /** Preserve the effective selection before submitting a category mutation. */
  function preserveSelection(): void {
    selectCategory(selectedCategoryId);
  }

  /** Submit creation of an inline category. */
  function createCategory(name: string, parentId: string | null): void {
    preserveSelection();
    const formData = new FormData();
    formData.set("_action", "createCategory");
    formData.set("categoryName", name);
    formData.set("categoryParentId", parentId ?? "");
    if (source !== null) formData.set("source", source);
    void fetcher.submit(formData, { action: actionPath, method: "post" });
  }

  /** Submit deletion of one category. */
  function deleteCategory(categoryId: number): void {
    preserveSelection();
    const formData = new FormData();
    formData.set("_action", "deleteCategory");
    formData.set("categoryId", String(categoryId));
    if (source !== null) formData.set("source", source);
    void fetcher.submit(formData, { action: actionPath, method: "post" });
  }

  return {
    breadcrumbPath,
    busy: fetcher.state !== "idle",
    createCategory,
    defaultCategoryId,
    deleteCategory,
    mutationErrors: fetcher.data?.errors,
    mutationResult: fetcher.data,
    options,
    selectCategory,
    selectedCategoryId,
  };
}
